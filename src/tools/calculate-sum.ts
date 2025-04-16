import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * Registers the "calculate_sum" tool on the given MCP server.
 * Adds two numbers and returns the sum as text content.
 * @param server - The MCP server instance
 */
export function registerCalculateSumTool(server: McpServer): void {
	server.tool(
		"calculate_sum",
		{
			a: z.number().describe("First number"),
			b: z.number().describe("Second number"),
		},
		async ({ a, b }) => ({
			content: [
				{
					type: "text",
					text: String(a + b),
				},
			],
		})
	);
}
