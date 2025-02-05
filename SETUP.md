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

### Updating Tool API Keys

Use the provided helper script to update API keys for MCP tools:

```bash
/opt/mcp-sse/bin/update-tool.sh <tool-name> <env-key> <env-value>
```

Example:
```bash
/opt/mcp-sse/bin/update-tool.sh mcp-tavily-search TAVILY_API_KEY your-api-key-here
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

## Security Notes

- The configuration file contains sensitive API keys - ensure proper file permissions are set
- Only run the update-tool.sh script as the same user that owns the MCP SSE server process
- Monitor the logs for any unauthorized access attempts
