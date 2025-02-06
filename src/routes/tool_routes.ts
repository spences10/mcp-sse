import { ToolProcessManager } from "@/core/tool_process_manager.ts";
import { MCPToolRegistry } from "@/core/tool_registry.ts";
import { Tool } from "@/types/types.ts";

export class ToolRouteHandler {
	private toolRegistry: MCPToolRegistry;
	private toolProcessManager: ToolProcessManager;

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
	}
}
