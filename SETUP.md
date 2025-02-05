# MCP SSE Server Setup Guide

This guide explains how to set up the MCP SSE server on a fresh Ubuntu server.

## Prerequisites

- A fresh Ubuntu server (Ubuntu 24.04)
- Root access or sudo privileges
- jq installed (will be automatically installed if missing)

## Installation

The installation process differs slightly depending on whether you're running as root or a regular user.

### Installing as Root (Recommended for Production)

When run as root, the setup script will:
- Create a dedicated `mcp-sse` system user
- Install all components under `/opt/mcp-sse`
- Set appropriate ownership and permissions
- Configure the service to run as the `mcp-sse` user

```bash
# Download and run setup script
curl -fsSL https://raw.githubusercontent.com/spences10/mcp-sse/main/setup.sh | sudo bash
```

### Installing as Regular User (Development)

When run as a regular user, the setup script will:
- Install all components under `/opt/mcp-sse`
- Set ownership to your user account
- Configure the service to run as your user

```bash
# Download and run setup script
curl -fsSL https://raw.githubusercontent.com/spences10/mcp-sse/main/setup.sh | bash
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
│   ├── src/            # Server source code
│   ├── ecosystem.config.js  # PM2 configuration
│   └── update-tool.sh  # Tool management script
├── config/             # Configuration files
│   └── mcp_settings.json  # MCP tools configuration
└── logs/               # PM2 logs
```

The installation creates a standardized directory structure with appropriate permissions:
- All files are owned by the `mcp-sse` user (when installed as root)
- Configuration files have restricted permissions (600)
- Executable files have correct permissions (755)

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

## Testing the Installation

A comprehensive test script is provided to validate the installation:

```bash
# Download and run test script
curl -fsSL https://raw.githubusercontent.com/spences10/mcp-sse/main/test-setup.sh | bash
```

The test script validates:
1. Server status and health
2. Tool registration and listing
3. Configuration management
4. SSE connections
5. Security measures
6. File permissions

Each test provides clear feedback with ✓ or ✗ indicators. If any test fails, the script will exit with details about what went wrong.

You can also manually validate specific components:

1. Check server status:
   ```bash
   pm2 status
   ```

2. View logs:
   ```bash
   pm2 logs mcp-sse
   ```

3. Test health endpoint:
   ```bash
   curl http://localhost:3030/health
   ```

4. Test tool registration:
   ```bash
   # Replace YOUR_API_KEY with the key shown during installation
   curl -X POST http://localhost:3030/tools \
     -H "Content-Type: application/json" \
     -H "X-API-Key: YOUR_API_KEY" \
     -d '{
       "id": "test-tool",
       "name": "Test Tool",
       "version": "1.0.0",
       "description": "A test tool"
     }'
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
