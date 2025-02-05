# MCP SSE Server Setup Guide

This guide explains how to set up the MCP SSE server on a fresh Ubuntu server.

## Prerequisites

- A fresh Ubuntu server (tested on Ubuntu 22.04)
- Root access or sudo privileges
- Git installed (`apt-get install git`)
- jq installed (`apt-get install jq`)

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/mcp-sse.git
   cd mcp-sse
   ```

2. Make the setup script executable:
   ```bash
   chmod +x setup.sh
   ```

3. Run the setup script:
   ```bash
   ./setup.sh
   ```

The script will:
- Install Deno 2 and Node.js (via Volta)
- Create the necessary directory structure in `/opt/mcp-sse`
- Set up PM2 for process management
- Configure the MCP tools settings
- Create helper scripts for management

## Configuration

### Directory Structure

```
/opt/mcp-sse/
├── bin/                 # Deno server and scripts
├── config/             # Configuration files
│   └── mcp_settings.json  # MCP tools configuration
└── logs/               # PM2 logs
```

### Managing Tools

Tools can be managed in two ways:

1. Configuration File (Persistent):
   - Tools defined in `/opt/mcp-sse/config/mcp_settings.json`
   - Automatically loaded on server startup
   - Use the helper script to update API keys:
     ```bash
     /opt/mcp-sse/bin/update-tool.sh <tool-name> <env-key> <env-value>
     ```
   - Example:
     ```bash
     /opt/mcp-sse/bin/update-tool.sh mcp-tavily-search TAVILY_API_KEY your-api-key-here
     ```

2. Dynamic Registration (Runtime):
   - Tools can be registered via HTTP POST to `/tools`
   - Requires authentication using the `X-API-Key` header
   - Example:
     ```bash
     # The API key must match MCP_SSE_API_KEY environment variable
     curl -X POST http://localhost:3030/tools \
       -H "Content-Type: application/json" \
       -H "X-API-Key: your-server-api-key" \
       -d '{
         "id": "my-tool",
         "name": "My Tool",
         "version": "1.0.0",
         "description": "Tool description",
         "command": "npx",
         "args": ["-y", "my-tool"],
         "env": {
           "API_KEY": "your-key-here"
         }
       }'
     ```
   - List registered tools:
     ```bash
     curl http://localhost:3030/tools \
       -H "X-API-Key: your-server-api-key"
     ```

### Managing the Server

- Check server status:
  ```bash
  pm2 status
  ```

- View logs:
  ```bash
  pm2 logs mcp-sse
  ```

- Restart server:
  ```bash
  pm2 restart mcp-sse
  ```

## Validation

After setup, you can validate the installation by:

1. Checking the server status:
   ```bash
   pm2 status
   ```

2. Verifying the logs:
   ```bash
   pm2 logs mcp-sse
   ```

3. Testing the health endpoint:
   ```bash
   curl http://localhost:3030/health
   ```

## Troubleshooting

If you encounter any issues:

1. Check the logs:
   ```bash
   pm2 logs mcp-sse
   ```

2. Verify the configuration:
   ```bash
   cat /opt/mcp-sse/config/mcp_settings.json
   ```

3. Restart the server:
   ```bash
   pm2 restart mcp-sse
   ```

## Environment Variables

The server uses the following environment variables:

- `MCP_CONFIG_PATH`: Path to the MCP settings configuration file (default: `/opt/mcp-sse/config/mcp_settings.json`)
- `MCP_SSE_API_KEY`: API key for authenticating tool registration requests

## Security Notes

- The configuration file contains sensitive API keys - ensure proper file permissions are set
- Only run the update-tool.sh script as the same user that owns the MCP SSE server process
- The `MCP_SSE_API_KEY` environment variable must be set and kept secure
- All tool management endpoints require authentication via the `X-API-Key` header
- Monitor the logs for any unauthorized access attempts
