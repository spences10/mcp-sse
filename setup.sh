#!/bin/bash

# Exit on error
set -e

echo "Starting MCP SSE Server Setup..."

# Check for required packages
if ! command -v git &> /dev/null; then
    echo "Installing git..."
    sudo apt-get update
    sudo apt-get install -y git
fi

if ! command -v jq &> /dev/null; then
    echo "Installing jq..."
    sudo apt-get install -y jq
fi

# Generate API key
echo "Generating API key..."
MCP_SSE_API_KEY=$(openssl rand -hex 32)

# Create directory structure
echo "Creating directory structure..."
sudo mkdir -p /opt/mcp-sse/{bin,config,logs}

# Add API key to environment
echo "Setting up environment variables..."
echo "export MCP_SSE_API_KEY=\"$MCP_SSE_API_KEY\"" >> ~/.bashrc

# Install Deno 2
echo "Installing Deno 2..."
curl -fsSL https://deno.land/x/install/install.sh | DENO_VERSION=v2.0.0 sh
echo 'export DENO_INSTALL="$HOME/.deno"' >> ~/.bashrc
echo 'export PATH="$DENO_INSTALL/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Install Volta and Node.js
echo "Installing Volta and Node.js..."
curl -fsSL https://get.volta.sh | bash

# Source Volta
export VOLTA_HOME="$HOME/.volta"
export PATH="$VOLTA_HOME/bin:$PATH"
if [ ! -f "$VOLTA_HOME/bin/volta" ]; then
    echo "Volta installation failed. Please check the logs above."
    exit 1
fi

# Add Volta to shell configuration
echo 'export VOLTA_HOME="$HOME/.volta"' >> ~/.bashrc
echo 'export PATH="$VOLTA_HOME/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Verify Deno installation
if ! command -v deno &> /dev/null; then
    echo "Deno installation failed. Please check the logs above."
    exit 1
fi

deno_version=$(deno --version | head -n 1)
if [[ ! $deno_version == *"2."* ]]; then
    echo "Wrong Deno version installed: $deno_version. Expected version 2.x"
    exit 1
fi

echo "Installing Node.js..."
volta install node@20

# Install PM2 globally
echo "Installing PM2..."
volta install pm2

# Clone mcp-sse repository
echo "Cloning mcp-sse repository..."
cd /opt/mcp-sse/bin
if ! git clone https://github.com/scott/mcp-sse.git .; then
    echo "Failed to clone repository. Please check your internet connection and repository access."
    exit 1
fi

# Create MCP settings template
echo "Creating MCP settings configuration..."
cat > /opt/mcp-sse/config/mcp_settings.json << 'EOL'
{
  "mcpServers": {
    "mcp-jinaai-search": {
      "command": "npx",
      "args": ["-y", "mcp-jinaai-search"],
      "env": {
        "JINAAI_API_KEY": "your-key-here"
      }
    },
    "mcp-tavily-search": {
      "command": "npx",
      "args": ["-y", "mcp-tavily-search"],
      "env": {
        "TAVILY_API_KEY": "your-key-here"
      }
    },
    "mcp-perplexity-search": {
      "command": "npx",
      "args": ["-y", "mcp-perplexity-search"],
      "env": {
        "PERPLEXITY_API_KEY": "your-key-here"
      }
    }
  }
}
EOL

# Create PM2 ecosystem file
echo "Creating PM2 ecosystem configuration..."
cat > /opt/mcp-sse/bin/ecosystem.config.js << EOL
module.exports = {
  apps: [{
    name: 'mcp-sse',
    script: 'deno run --allow-net --allow-read --allow-env src/main.ts',
    env: {
      MCP_CONFIG_PATH: '/opt/mcp-sse/config/mcp_settings.json',
      MCP_SSE_API_KEY: "${MCP_SSE_API_KEY}"
    },
    log_file: '/opt/mcp-sse/logs/mcp-sse.log',
    time: true
  }]
}
EOL

# Set permissions
echo "Setting permissions..."
sudo chown -R $USER:$USER /opt/mcp-sse
chmod 755 /opt/mcp-sse/bin/ecosystem.config.js
chmod 600 /opt/mcp-sse/config/mcp_settings.json  # Restrict access to config file with API keys

# Setup PM2 startup
echo "Configuring PM2 startup..."
pm2 startup
pm2 start /opt/mcp-sse/bin/ecosystem.config.js
pm2 save

# Create helper script for updating tool configurations
cat > /opt/mcp-sse/bin/update-tool.sh << 'EOL'
#!/bin/bash

if [ "$#" -ne 3 ]; then
    echo "Usage: $0 <tool-name> <env-key> <env-value>"
    echo "Example: $0 mcp-tavily-search TAVILY_API_KEY your-api-key-here"
    exit 1
fi

TOOL_NAME=$1
ENV_KEY=$2
ENV_VALUE=$3
CONFIG_FILE="/opt/mcp-sse/config/mcp_settings.json"

# Use jq to update the configuration
jq --arg tn "$TOOL_NAME" --arg key "$ENV_KEY" --arg val "$ENV_VALUE" \
  '.mcpServers[$tn].env[$key] = $val' "$CONFIG_FILE" > "${CONFIG_FILE}.tmp" && \
  mv "${CONFIG_FILE}.tmp" "$CONFIG_FILE"

echo "Updated $ENV_KEY for $TOOL_NAME"
echo "Restarting MCP SSE server..."
pm2 restart mcp-sse
EOL

chmod 755 /opt/mcp-sse/bin/update-tool.sh

echo "Installation complete!"
echo "MCP SSE server is now running and configured to start on boot"
echo ""
echo "Your MCP SSE API key is: $MCP_SSE_API_KEY"
echo "This key is required for tool management operations."
echo ""
echo "To update tool API keys, use the update-tool.sh script:"
echo "Example: /opt/mcp-sse/bin/update-tool.sh mcp-tavily-search TAVILY_API_KEY your-api-key-here"
echo ""
echo "To check server status:"
echo "pm2 status"
echo ""
echo "To view logs:"
echo "pm2 logs mcp-sse"
