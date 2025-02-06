import { SSEConnectionManager } from "@/core/connection_manager.ts";
import { ToolProcessManager } from "@/core/tool_process_manager.ts";
import { MCPToolRegistry } from "@/core/tool_registry.ts";
import { ToolRouteHandler } from "@/routes/tool_routes.ts";
import { Connection, Tool } from "@/types/types.ts";
import { ConfigLoader } from "@/utils/config_loader.ts";
import { crypto } from "@Web/crypto/mod.ts";
import { serve } from "@Web/http/server.ts";

const connectionManager = new SSEConnectionManager();
const toolRegistry = new MCPToolRegistry();
const toolProcessManager = new ToolProcessManager();
const toolRouteHandler = new ToolRouteHandler(toolRegistry, toolProcessManager);
const configLoader = ConfigLoader.getInstance();

// Load and register tools from config
try {
	await configLoader.loadConfig();
	const tools = configLoader.convertConfigToTools();
	for (const tool of tools) {
		toolRegistry.register(tool);
		// Start the tool process
		await toolProcessManager.startToolProcess(tool);
		console.log(`Started tool: ${tool.name}`);
	}
} catch (error) {
	console.error("Failed to load tools from config:", error);
}

// Cleanup on exit
Deno.addSignalListener("SIGINT", async () => {
	console.log("\nShutting down...");
	await toolProcessManager.stopAllProcesses();
	Deno.exit(0);
});

async function handleSSE(req: Request, tool: Tool): Promise<Response> {
	console.log("SSE connection attempt received");

	// Check authentication
	const apiKey = req.headers.get("X-API-Key");
	const configApiKey = Deno.env.get("MCP_SSE_API_KEY");
	console.log("Auth check:", !!apiKey, !!configApiKey);

	if (!apiKey || apiKey !== configApiKey) {
		console.log("Auth failed");
		return new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

	console.log("Auth successful, setting up SSE connection");

	// Extract tool-specific API keys from headers
	const toolApiKeys: Record<string, string> = {};
	// Get all headers and filter for tool API keys
	req.headers.forEach((value, key) => {
		if (typeof key === "string" && key.toLowerCase().startsWith("x-tool-")) {
			const apiKeyName = key.slice(7).toUpperCase(); // Remove 'x-tool-' and uppercase
			toolApiKeys[apiKeyName] = value;
		}
	});

	const headers = new Headers({
		"Content-Type": "text/event-stream",
		"Cache-Control": "no-cache",
		Connection: "keep-alive",
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
		"Access-Control-Allow-Headers":
			"Content-Type, X-API-Key, X-Tool-*, Accept, Origin",
		"Access-Control-Allow-Credentials": "true",
		"Access-Control-Expose-Headers": "*",
	});

	try {
		const { readable, writable } = new TransformStream();
		const writer = writable.getWriter();
		const encoder = new TextEncoder();

		const connectionId = crypto.randomUUID();

		const connection: Connection = {
			id: connectionId,
			target: writer,
			connectedAt: new Date(),
			lastMessageAt: new Date(),
			toolApiKeys,
		};

		connectionManager.addConnection(connection);

		// Send initial connection message with available tools
		const initialMessage = {
			type: "init",
			payload: {
				protocol: {
					version: "1.0",
					name: "mcp",
				},
				tools: toolRegistry.getAllTools().map((tool) => ({
					name: tool.id,
					description: tool.description || `MCP tool: ${tool.id}`,
					schema: {
						type: "function",
						parameters: {
							type: "object",
							properties: {},
							required: [],
						},
					},
				})),
			},
		};

		await writer.write(
			encoder.encode(`data: ${JSON.stringify(initialMessage)}\n\n`)
		);

		// Send ready message
		const readyMessage = {
			type: "ready",
		};

		await writer.write(
			encoder.encode(`data: ${JSON.stringify(readyMessage)}\n\n`)
		);

		// Handle incoming messages
		if (req.body) {
			const reader = req.body.getReader();
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					const message = new TextDecoder().decode(value);
					console.log("Received message:", message);

					// Process the message and send response through the tool process manager
					try {
						const parsedMessage = JSON.parse(message);
						const process = await toolProcessManager.startToolProcess(tool, {
							apiKeys: toolApiKeys,
						});
						await toolProcessManager.sendInput(process.id, message);
					} catch (error) {
						console.error("Error processing message:", error);
						const errorResponse = {
							type: "error",
							event: "error",
							payload: {
								error: "Failed to process message",
							},
							timestamp: Date.now(),
						};
						await writer.write(
							encoder.encode(`data: ${JSON.stringify(errorResponse)}\n\n`)
						);
					}
				}
			} finally {
				reader.releaseLock();
			}
		}

		return new Response(readable, { headers });
	} catch (error) {
		console.error("Error establishing SSE connection:", error);
		return new Response(
			JSON.stringify({ error: "Failed to establish connection" }),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			}
		);
	}
}

const handler = async (req: Request): Promise<Response> => {
	const url = new URL(req.url);
	console.log(`Incoming request to: ${url.pathname}`);
	console.log(`Method: ${req.method}`);
	console.log("Request headers:");
	req.headers.forEach((value, key) => console.log(`  ${key}: ${value}`));

	// Enable CORS
	if (req.method === "OPTIONS") {
		console.log("Handling OPTIONS request");
		return new Response(null, {
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
				"Access-Control-Allow-Headers":
					"Content-Type, X-API-Key, X-Tool-*, Accept, Origin",
				"Access-Control-Allow-Credentials": "true",
			},
		});
	}

	// Handle SSE connections
	if (url.pathname.startsWith("/sse/")) {
		const toolId = url.pathname.split("/")[2]; // Get the tool ID from the URL
		const tool = toolRegistry.getTool(toolId);

		if (!tool) {
			return new Response(JSON.stringify({ error: "Tool not found" }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			});
		}

		return handleSSE(req, tool);
	} else if (url.pathname === "/sse") {
		// List available tools
		return new Response(JSON.stringify({ tools: toolRegistry.getAllTools() }), {
			headers: { "Content-Type": "application/json" },
		});
	}

	// Tool registration endpoint
	if (url.pathname === "/tools" && req.method === "POST") {
		return await toolRouteHandler.handleToolRegistration(req);
	}

	// List registered tools
	if (url.pathname === "/tools" && req.method === "GET") {
		return toolRouteHandler.handleToolList(req);
	}

	// Health check endpoint
	if (url.pathname === "/health") {
		return new Response(
			JSON.stringify({
				status: "ok",
				connections: connectionManager.connections.size,
				registeredTools: toolRegistry.getAllTools().length,
			}),
			{
				headers: { "Content-Type": "application/json" },
			}
		);
	}

	// Handle 404
	return new Response("Not Found", { status: 404 });
};

const port = 3030;
console.log(`SSE server starting on port ${port}...`);

await serve(handler, { port });
