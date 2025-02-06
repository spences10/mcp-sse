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
      - For "Source" select "Git Repository" (not "Dockerfile")
      - Connect and select your Git repository
      - The Dockerfile in your repo will be automatically detected
      - Set port to 3030
      - Add environment variable: `MCP_SSE_API_KEY=your-secret-key`

3. **Tool Configuration**
   Configure your MCP tools in `config/mcp_settings.json`. These tools will run on your Coolify instance:

   ```json
   {
   	"mcpServers": {
   		"mcp-tavily-search": {
   			"command": "npx",
   			"args": ["mcp-tavily-search"],
   			"env": {}
   		},
   		"another-tool": {
   			"command": "npx",
   			"args": ["another-mcp-tool"],
   			"env": {}
   		}
   	}
   }
   ```

   Each tool configured here will be available on your SSE server. When Claude or Cursor connects to your server, these tools will be ready to use with no startup time.

4. **Client Configuration**
   Configure your AI tools (Claude Desktop, Cursor) to connect to your SSE server:

   For Claude Desktop:

   ```json
   {
   	"mcp": {
   		"transport": "sse",
   		"url": "https://your-coolify-url:3030/sse",
   		"api_key": "your-mcp-sse-api-key",
   		"tools": {
   			"mcp-perplexity-search": {
   				"url": "https://your-coolify-url:3030/sse/mcp-perplexity-search",
   				"headers": {
   					"X-API-Key": "your-mcp-sse-api-key",
   					"X-Tool-PERPLEXITY_API_KEY": "your-perplexity-api-key"
   				}
   			},
   			"mcp-tavily-search": {
   				"url": "https://your-coolify-url:3030/sse/mcp-tavily-search",
   				"headers": {
   					"X-API-Key": "your-mcp-sse-api-key",
   					"X-Tool-TAVILY_API_KEY": "your-tavily-api-key"
   				}
   			}
   		}
   	}
   }
   ```

   For Cursor:

   ```json
   {
   	"mcp": {
   		"transport": "sse",
   		"url": "https://your-coolify-url:3030/sse",
   		"api_key": "your-mcp-sse-api-key",
   		"tools": {
   			"mcp-perplexity-search": {
   				"url": "https://your-coolify-url:3030/sse/mcp-perplexity-search",
   				"headers": {
   					"X-API-Key": "your-mcp-sse-api-key",
   					"X-Tool-PERPLEXITY_API_KEY": "your-perplexity-api-key"
   				}
   			}
   		}
   	}
   }
   ```

   **Important Notes:**

   - The `X-API-Key` header must match the `MCP_SSE_API_KEY` environment variable you set in Coolify
   - Tool-specific API keys are passed via `X-Tool-*` headers (e.g., `X-Tool-PERPLEXITY_API_KEY`)
   - Each tool connection requires its own specific URL (`/sse/{tool-id}`)
   - API keys are passed at runtime and not stored on the server

5. **Testing Your Deployment**

   ```bash
   # Test server health
   curl https://your-coolify-url/health

   # Test tool connection with API keys
   curl -N https://your-coolify-url/sse/mcp-perplexity-search \
     -H "X-API-Key: your-mcp-sse-api-key" \
     -H "X-Tool-PERPLEXITY_API_KEY: your-perplexity-api-key"
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
