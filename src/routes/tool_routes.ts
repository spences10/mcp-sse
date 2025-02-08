import { ToolProcessManager } from "@/core/tool_process_manager.ts";
import { MCPToolRegistry } from "@/core/tool_registry.ts";
import { Tool } from "@/types/types.ts";

export class ToolRouteHandler {
	private toolRegistry: MCPToolRegistry;
	private toolProcessManager: ToolProcessManager;
	private connections: Set<ReadableStreamDefaultController<string>> = new Set();

	constructor(
		toolRegistry: MCPToolRegistry,
		toolProcessManager: ToolProcessManager
	) {
		this.toolRegistry = toolRegistry;
		this.toolProcessManager = toolProcessManager;
	}

	async handleToolRegistration(req: Request): Promise<Response> {
		if (req.method !== "POST") {
			return new Response("Method not allowed", { status: 405 });
		}

		// Check API key
		const apiKey = req.headers.get("X-API-Key");
		const configApiKey = Deno.env.get("MCP_SSE_API_KEY");

		if (!apiKey || apiKey !== configApiKey) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			});
		}

		try {
			const toolData = await req.json();

			// Create a tool with default npx installation if command not provided
			const tool: Tool = {
				id: toolData.id,
				name: toolData.name || toolData.id,
				version: toolData.version || "1.0.0",
				description: toolData.description,
				// Default to npx if no command provided
				command: toolData.command || "npx",
				// Default to installing the tool if no args provided
				args: toolData.args || ["-y", toolData.id],
				// Process environment variables
				env: this.processEnvironmentVariables(toolData.env || {}),
			};

			// Validate tool data
			if (!tool.id) {
				return new Response(JSON.stringify({ error: "Tool ID is required" }), {
					status: 400,
					headers: { "Content-Type": "application/json" },
				});
			}

			// Register and start the tool
			this.toolRegistry.register(tool);
			await this.toolProcessManager.startToolProcess(tool);

			return new Response(
				JSON.stringify({
					message: "Tool registered and started successfully",
					tool: {
						id: tool.id,
						name: tool.name,
						version: tool.version,
						description: tool.description,
					},
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } }
			);
		} catch (error) {
			return new Response(JSON.stringify({ error: "Invalid tool data" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}
	}

	private processEnvironmentVariables(
		env: Record<string, string>
	): Record<string, string> {
		const processedEnv: Record<string, string> = {};

		for (const [key, value] of Object.entries(env)) {
			// If the value starts with $, try to get it from process environment
			if (value.startsWith("$")) {
				const envKey = value.slice(1); // Remove the $ prefix
				const envValue = Deno.env.get(envKey);
				if (envValue) {
					processedEnv[key] = envValue;
				} else {
					console.warn(`Environment variable ${envKey} not found for tool`);
				}
			} else {
				processedEnv[key] = value;
			}
		}

		return processedEnv;
	}

	handleToolList(req: Request): Response {
		const tools = this.toolRegistry.getAllTools();
		return new Response(JSON.stringify({ tools }), {
			headers: { "Content-Type": "application/json" },
		});
	}

	async handleSSE(req: Request, toolId?: string): Promise<Response> {
		console.log("\nHandling SSE connection request");
		console.log("URL:", req.url);

		const headers: Record<string, string> = {};
		req.headers.forEach((value, key) => {
			headers[key] = value;
		});
		console.log("Headers:", headers);

		// Check API key from query parameters or headers
		const url = new URL(req.url);
		const api_key =
			url.searchParams.get("api_key") || req.headers.get("X-API-Key");
		const config_api_key = Deno.env.get("MCP_SSE_API_KEY");

		console.log("Auth check:", {
			provided_key: api_key,
			config_key: config_api_key,
			matches: api_key === config_api_key,
		});

		if (!api_key || api_key !== config_api_key) {
			console.log("Authentication failed");
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			});
		}

		console.log("Authentication successful");

		// Extract tool-specific API keys from headers
		const tool_api_keys: Record<string, string> = {};
		req.headers.forEach((value, key) => {
			if (key.toLowerCase().startsWith("x-tool-")) {
				const api_key_name = key.slice(7).toUpperCase();
				tool_api_keys[api_key_name] = value;
			}
		});

		console.log("Tool API keys:", tool_api_keys);

		// If toolId is provided, verify the tool exists
		let specific_tool: Tool | undefined;
		if (toolId) {
			specific_tool = this.toolRegistry.getTool(toolId);
			console.log("Looking for tool:", toolId, "Found:", !!specific_tool);
			if (!specific_tool) {
				return new Response(JSON.stringify({ error: "Tool not found" }), {
					status: 404,
					headers: { "Content-Type": "application/json" },
				});
			}
		}

		const stream = new ReadableStream({
			start: async (controller) => {
				this.connections.add(controller);
				console.log("SSE connection started");

				try {
					// Send initial protocol message
					const init_message = {
						type: "init",
						payload: {
							protocol: {
								version: "1.0",
								name: "mcp",
							},
							tools: this.toolRegistry.getAllTools().map((tool) => ({
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
					controller.enqueue(`data: ${JSON.stringify(init_message)}\n\n`);
					console.log("Sent init message");

					// Send ready message
					const ready_message = {
						type: "ready",
						status: "connected",
					};
					controller.enqueue(`data: ${JSON.stringify(ready_message)}\n\n`);
					console.log("Sent ready message");

					// If specific tool, start its process
					if (specific_tool) {
						try {
							const process = await this.toolProcessManager.startToolProcess(
								specific_tool,
								{ apiKeys: tool_api_keys }
							);
							console.log(`Started process for tool: ${specific_tool.id}`);

							// Send tool ready message
							const tool_ready = {
								type: "tool_ready",
								payload: {
									tool: specific_tool.id,
								},
							};
							controller.enqueue(`data: ${JSON.stringify(tool_ready)}\n\n`);
						} catch (error) {
							console.error(`Failed to start tool process: ${error}`);
							const error_message = {
								type: "error",
								payload: {
									error: "Failed to start tool process",
								},
							};
							controller.enqueue(`data: ${JSON.stringify(error_message)}\n\n`);
						}
					}
				} catch (error) {
					console.error("Error in SSE stream:", error);
					controller.error(error);
				}
			},
			cancel: (controller) => {
				console.log("SSE connection cancelled");
				this.connections.delete(controller);
			},
			pull: (controller) => {
				// This is called when the client is ready to receive more data
				console.log("Client ready for more data");
			},
		});

		return new Response(stream, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
				"Access-Control-Allow-Headers":
					"Content-Type, X-API-Key, X-Tool-*, Accept, Origin",
				"Access-Control-Allow-Credentials": "true",
			},
		});
	}

	// Method to broadcast messages to all connected clients
	broadcast(message: unknown): void {
		const data = `data: ${JSON.stringify(message)}\n\n`;
		for (const controller of this.connections) {
			try {
				controller.enqueue(data);
			} catch (error) {
				console.error("Error broadcasting message:", error);
				this.connections.delete(controller);
			}
		}
	}

	// Update handleToolMessages to broadcast to SSE clients
	async handleToolMessages(toolId: string, message: unknown): Promise<void> {
		const tool = this.toolRegistry.getTool(toolId);
		if (!tool) {
			throw new Error(`Tool ${toolId} not found`);
		}

		// Start a new process for the tool if needed
		const process = await this.toolProcessManager.startToolProcess(tool);

		// Send the message to the tool process
		await this.toolProcessManager.sendInput(
			process.id,
			JSON.stringify(message)
		);

		// Broadcast the message to all SSE clients
		this.broadcast({ type: "tool_message", toolId, message });
	}
}
