import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerCalculateSumTool } from "./calculate-sum";

/**
 * Registers all MCP tools on the given server instance.
 * @param server - The MCP server instance
 */
export function registerAllTools(server: McpServer): void {
	registerCalculateSumTool(server);
	// Add more tool registrations here as needed
}
