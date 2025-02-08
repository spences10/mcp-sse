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

1. **Prerequisites**

   - Install [Deno](https://deno.land/#installation)
   - Install [Node.js](https://nodejs.org/) (required for running MCP tools)

2. **Local Setup**

   ```bash
   # Clone the repository
   git clone <your-repo-url>
   cd mcp-sse

   # Set environment variable for local development
   export MCP_SSE_API_KEY="your-local-dev-key"
   ```

3. **Configure Tools**
   Edit `config/mcp_settings.json` to add your tools:

   ```json
   {
   	"mcpServers": {
   		"your-tool-name": {
   			"command": "npx",
   			"args": ["your-tool-package"],
   			"env": {}
   		}
   	}
   }
   ```

4. **Run the Server**

   ```bash
   # Start the development server
   deno task dev
   ```

5. **Testing**

   ```bash
   # Test server health
   curl http://localhost:3030/health

   # Test SSE connection (replace with your tool name)
   curl -N http://localhost:3030/sse/your-tool-name \
     -H "X-API-Key: your-local-dev-key"

   # Run the test suite
   deno task test
   ```

6. **Client Configuration for Local Development**
   Update your Claude Desktop or Cursor configuration to use localhost:
   ```json
   {
   	"mcp": {
   		"transport": "sse",
   		"url": "http://localhost:3030/sse",
   		"api_key": "your-local-dev-key",
   		"tools": {
   			"your-tool-name": {
   				"url": "http://localhost:3030/sse/your-tool-name",
   				"headers": {
   					"X-API-Key": "your-local-dev-key"
   				}
   			}
   		}
   	}
   }
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

## SSE Implementation Details

The server implements Server-Sent Events (SSE) for real-time communication with clients. Key features include:

- Persistent connections with automatic reconnection
- Real-time message broadcasting to all connected clients
- Event-based message handling
- Connection pool management
- Error handling and recovery

### Testing SSE Functionality

1. Start the server:

```bash
deno task dev
```

2. Run the test client:

```bash
deno run --allow-net tests/test_sse_client.ts
```

The test client will:

- Connect to the SSE server
- Listen for incoming messages
- Display connection status and received messages
- Handle connection errors

You can also test manually using curl:

```bash
curl -N http://localhost:8000/sse \
  -H "X-API-Key: your-local-dev-key"
```
