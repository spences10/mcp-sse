import { SSEConnectionManager } from "@/core/connection_manager.ts";
import { MCPToolRegistry } from "@/core/tool_registry.ts";
import { ToolRouteHandler } from "@/routes/tool_routes.ts";
import { Connection } from "@/types/types.ts";
import { ConfigLoader } from "@/utils/config_loader.ts";
import { crypto } from "https://deno.land/std/crypto/mod.ts";
import { serve } from "https://deno.land/std/http/server.ts";

const connectionManager = new SSEConnectionManager();
const toolRegistry = new MCPToolRegistry();
const toolRouteHandler = new ToolRouteHandler(toolRegistry);
const configLoader = ConfigLoader.getInstance();

// Load and register tools from config
try {
	await configLoader.loadConfig();
	const tools = configLoader.convertConfigToTools();
	for (const tool of tools) {
		toolRegistry.register(tool);
		console.log(`Registered tool: ${tool.name}`);
	}
} catch (error) {
	console.error("Failed to load tools from config:", error);
}

async function handleSSE(req: Request): Promise<Response> {
	const headers = new Headers({
		"Content-Type": "text/event-stream",
		"Cache-Control": "no-cache",
		Connection: "keep-alive",
		"Access-Control-Allow-Origin": "*",
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
		};

		connectionManager.addConnection(connection);

		// Send initial connection message with available tools
		const initialMessage = {
			type: "system",
			payload: {
				connectionId,
				status: "connected",
				availableTools: toolRegistry.getAllTools(),
			},
			timestamp: Date.now(),
		};

		await writer.write(
			encoder.encode(`data: ${JSON.stringify(initialMessage)}\n\n`)
		);

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

	// Enable CORS
	if (req.method === "OPTIONS") {
		return new Response(null, {
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, X-API-Key",
			},
		});
	}

	// Handle SSE connections
	if (url.pathname === "/sse") {
		return handleSSE(req);
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
