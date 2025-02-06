# MCP SSE Server

A Server-Sent Events (SSE) implementation for MCP tools, replacing the current stdio transport system. This server allows you to run MCP tools (like Claude Desktop tools) over SSE instead of stdio.

## Quick Deploy with Coolify

1. **Prerequisites**

   - A Coolify instance
   - Your Git repository connected to Coolify

2. **Deployment Steps**

   1. In Coolify dashboard:
      - Create new service
      - Choose "Application" type
      - Select "Dockerfile" deployment
      - Connect your Git repository
      - Set port to 3030
      - Add environment variable: `MCP_SSE_API_KEY=your-secret-key`

3. **Tool Configuration**
   Edit `config/mcp_settings.json` to add your tools:

   ```json
   {
   	"mcpServers": {
   		"mcp-tavily-search": {
   			"command": "npx",
   			"args": ["mcp-tavily-search"],
   			"env": {
   				"TAVILY_API_KEY": "your-tavily-key"
   			}
   		}
   	}
   }
   ```

4. **Client Configuration**
   Configure your clients (Claude Desktop, Cursor) to use:

   - SSE URL: Your Coolify service URL
   - API Key: The `MCP_SSE_API_KEY` you set

5. **Testing Your Deployment**

   ```bash
   # Test server health
   curl https://your-coolify-url/health

   # Test tool registration (replace secret-key with your MCP_SSE_API_KEY)
   curl -X POST https://your-coolify-url/tools \
     -H "Content-Type: application/json" \
     -H "X-API-Key: secret-key" \
     -d '{
       "id": "test-tool",
       "name": "Test Tool",
       "version": "1.0.0",
       "description": "A test tool"
     }'
   ```

## Development

1. Install Deno
2. Run locally:
   ```bash
   deno task dev
   ```
3. Run tests:
   ```bash
   deno task test
   ```

## Project Structure

```
/src
  /core          - Core system components
  /routes        - API routes and endpoints
  /types         - TypeScript type definitions
  /utils         - Utility functions
  main.ts        - Application entry point
/tests          - Test files
/config         - Tool configurations
```

## Features

- Single persistent server connection for multiple MCP tools
- Connection pool management
- Tool registry and routing
- Error recovery and reconnection handling
- Authentication and authorization
- Performance optimized for long-running connections
