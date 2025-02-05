# MCP SSE Server

A Server-Sent Events (SSE) implementation for MCP tools, replacing the current stdio transport system.

## How It Works

1. Server Side:
   - The SSE server runs on your infrastructure (e.g., Hetzner)
   - MCP tools (like mcp-tavily-search) are installed on the same server
   - Tools register themselves with the SSE server
   - Server manages connections and routes tool requests

2. Client Side:
   - AI clients connect to your SSE server endpoint
   - They authenticate using an API key
   - They can then use any registered MCP tools through the SSE connection

## Deployment Guide

### Server Requirements

1. Infrastructure:
   - A server (e.g., Hetzner VPS)
   - Domain name (for SSL)
   - Node.js (for MCP tools)
   - Deno (for SSE server)

2. Security Setup:
   - SSL certificate (required for production)
   - API key authentication
   - Firewall configuration

3. Environment Variables:
   ```bash
   # Add to /etc/environment or similar
   export MCP_SSE_API_KEY="your-secret-key"  # Must match Nginx config
   ```

4. Client Integration:
   ```typescript
   // Example of how AI clients connect
   const sse = new EventSource('https://your-domain.com/sse', {
     headers: {
       'X-API-Key': 'your-secret-key'
     }
   });

   // Handle incoming messages
   sse.onmessage = (event) => {
     const data = JSON.parse(event.data);
     // Process tool responses
   };
   ```

### Installation Steps

1. Server Setup:
   ```bash
   # Install required tools
   curl -fsSL https://deno.land/x/install/install.sh | sh
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Clone and setup SSE server
   git clone [repository-url]
   cd mcp-sse
   ```

2. Configure Nginx:
   ```nginx
   server {
       listen 443 ssl;
       server_name your-domain.com;

       ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

       location / {
           # API key authentication
           if ($http_x_api_key != "your-secret-key") {
               return 403;
           }

           proxy_pass http://localhost:3030;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           
           # SSE specific
           proxy_buffering off;
           proxy_cache off;
           proxy_read_timeout 24h;
       }
   }
   ```

3. Run as Service:
   ```bash
   # Install PM2
   npm install -g pm2

   # Start SSE server
   pm2 start "deno run --allow-net src/main.ts" --name mcp-sse
   pm2 startup
   pm2 save
   ```

## Features

- Single persistent server connection for multiple MCP tools
- Connection pool management
- Tool registry and routing
- Error recovery and reconnection handling
- Authentication and authorization
- Performance optimized for long-running connections

## Usage

### Setting Up MCP Tools

1. Start the SSE server:

   ```bash
   deno run --allow-net src/main.ts
   ```

   Server will start on port 3030.

2. Register an MCP tool:
   ```bash
   # Format
   curl -X POST -H "Content-Type: application/json" -d '{
     "id": "tool-id",
     "name": "Tool Name",
     "version": "1.0.0",
     "description": "Tool description"
   }' http://localhost:3030/tools
   ```

### Example: Setting up mcp-tavily-search

1. Install the tool:

   ```bash
   npm install -g mcp-tavily-search
   ```

2. Set up environment variable:

   ```bash
   # Add to your shell profile (.bashrc, .zshrc, etc.)
   export TAVILY_API_KEY=your-api-key-here
   ```

3. Register with SSE server:

   ```bash
   curl -X POST -H "Content-Type: application/json" -d '{
     "id": "mcp-tavily-search",
     "name": "Tavily Search",
     "version": "1.0.0",
     "description": "AI-powered web search using Tavily API"
   }' http://localhost:3030/tools
   ```

4. Verify registration:

   ```bash
   curl http://localhost:3030/tools
   ```

5. Check server health:
   ```bash
   curl http://localhost:3030/health
   ```

## Development

### Prerequisites

- Deno runtime installed
- Access to MCP tools

### Getting Started

1. Clone the repository
2. Run development server:

   ```bash
   deno task dev
   ```

3. Run tests:
   ```bash
   deno task test
   ```

### Project Structure

```
/src
  /core          - Core system components
  /routes        - API routes and endpoints
  /types         - TypeScript type definitions
  /utils         - Utility functions
  main.ts        - Application entry point
  config.ts      - Configuration management
/tests           - Test files
```

## Architecture

### Core Components

1. Connection Manager

   - Handles SSE connections
   - Manages connection lifecycle
   - Implements heartbeat mechanism

2. Tool Registry

   - Tool registration and management
   - Message routing
   - Version management

3. Authentication
   - Token-based authentication
   - Request validation
   - Security measures

### Performance Considerations

- Connection pooling
- Memory management
- Resource cleanup
- Load balancing

## License

[License details to be added]
