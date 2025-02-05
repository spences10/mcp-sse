#!/bin/bash

# Exit on error
set -e

echo "Starting MCP SSE Server Setup..."

# Check for required packages
echo "Checking and installing required packages..."
sudo apt-get update
PACKAGES_TO_INSTALL=""

if ! command -v jq &> /dev/null; then
    PACKAGES_TO_INSTALL="$PACKAGES_TO_INSTALL jq"
fi

if ! command -v unzip &> /dev/null; then
    PACKAGES_TO_INSTALL="$PACKAGES_TO_INSTALL unzip"
fi

if [ ! -z "$PACKAGES_TO_INSTALL" ]; then
    echo "Installing:$PACKAGES_TO_INSTALL"
    sudo apt-get install -y $PACKAGES_TO_INSTALL
fi

# Generate API key
echo "Generating API key..."
MCP_SSE_API_KEY=$(openssl rand -hex 32)

# Create directory structure
echo "Creating directory structure..."
sudo mkdir -p /opt/mcp-sse/{bin,config,logs}

# Add API key to environment
echo "Setting up environment variables..."
cat > /etc/profile.d/mcp-sse.sh << EOL
export MCP_SSE_API_KEY="$MCP_SSE_API_KEY"
EOL
chmod 644 /etc/profile.d/mcp-sse.sh
source /etc/profile.d/mcp-sse.sh

# Install Deno 2
echo "Installing Deno 2..."
export DENO_INSTALL="/opt/deno"
export PATH="$DENO_INSTALL/bin:$PATH"

# Install Deno silently
curl -fsSL https://deno.land/x/install/install.sh | DENO_INSTALL=/opt/deno DENO_VERSION=v2.0.0 sh -s

# Add Deno to system-wide profile
cat > /etc/profile.d/deno.sh << 'EOL'
export DENO_INSTALL="/opt/deno"
export PATH="$DENO_INSTALL/bin:$PATH"
EOL

chmod 755 /etc/profile.d/deno.sh
source /etc/profile.d/deno.sh

# Install Volta system-wide
echo "Installing Volta..."
export VOLTA_HOME="/opt/volta"
export PATH="$VOLTA_HOME/bin:$PATH"

# Install Volta silently
curl -fsSL https://get.volta.sh | bash -s -- --skip-setup

# Verify Volta installation
if [ ! -f "$VOLTA_HOME/bin/volta" ]; then
    echo "Volta installation failed. Please check the logs above."
    exit 1
fi

# Install Node.js LTS and PM2 silently
echo "Installing Node.js LTS and PM2..."
volta install node@lts > /dev/null 2>&1
volta install pm2 > /dev/null 2>&1

# Get the actual binary paths
NODE_BIN_PATH=$(volta which node | sed 's/\/node$//')
PM2_BIN_PATH=$(volta which pm2 | sed 's/\/pm2$//')

# Add Volta to system-wide profile with complete paths
cat > /etc/profile.d/volta.sh << EOL
export VOLTA_HOME="/opt/volta"
export PATH="$PM2_BIN_PATH:$NODE_BIN_PATH:$VOLTA_HOME/bin:$PATH"
EOL

chmod 755 /etc/profile.d/volta.sh
source /etc/profile.d/volta.sh

# Add paths to current session
export PATH="$PM2_BIN_PATH:$NODE_BIN_PATH:$VOLTA_HOME/bin:$PATH"

# Ensure the paths are available in PM2 startup
pm2_startup_path=\$(pm2 startup | grep "sudo" | sed 's/.*sudo //')
if [ ! -z "\$pm2_startup_path" ]; then
    echo "Configuring PM2 startup with correct PATH..."
    eval "sudo \$pm2_startup_path"
fi

# Clone and set up repository
echo "Setting up repository..."
REPO_PATH="/opt/mcp-sse/bin"

# If running as root, create a dedicated user
if [ "$(id -u)" = "0" ]; then
    echo "Creating mcp-sse user..."
    useradd -r -s /bin/bash mcp-sse || true
    usermod -d /opt/mcp-sse mcp-sse
fi

# Ensure directory exists and set ownership
sudo mkdir -p "$REPO_PATH"
if [ "$(id -u)" = "0" ]; then
    sudo chown -R mcp-sse:mcp-sse /opt/mcp-sse
    # Switch to mcp-sse user for git operations
    sudo -u mcp-sse git clone https://github.com/spences10/mcp-sse.git "$REPO_PATH/." || {
        echo "Failed to clone repository. Please check your internet connection and repository access."
        exit 1
    }
else
    if ! git clone https://github.com/spences10/mcp-sse.git "$REPO_PATH/."; then
        echo "Failed to clone repository. Please check your internet connection and repository access."
        exit 1
    fi
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

# Ensure all required paths are available
export PATH="$PM2_BIN_PATH:$NODE_BIN_PATH:$VOLTA_HOME/bin:/opt/deno/bin:$PATH"

# Create PM2 ecosystem file
echo "Creating PM2 ecosystem configuration..."
cat > /opt/mcp-sse/bin/ecosystem.config.js << EOL
module.exports = {
  apps: [{
    name: 'mcp-sse',
    script: 'deno run --allow-net --allow-read --allow-env /opt/mcp-sse/bin/src/main.ts',
    cwd: '/opt/mcp-sse/bin',
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
if [ "$(id -u)" = "0" ]; then
    sudo chown -R mcp-sse:mcp-sse /opt/mcp-sse
else
    sudo chown -R $USER:$USER /opt/mcp-sse
fi
chmod 755 /opt/mcp-sse/bin/ecosystem.config.js
chmod 600 /opt/mcp-sse/config/mcp_settings.json  # Restrict access to config file with API keys

# Setup PM2 startup with correct PATH
echo "Configuring PM2 startup..."
# Stop any existing process
if command -v pm2 &> /dev/null; then
    pm2 delete mcp-sse || true
fi

# Start with correct working directory
cd /opt/mcp-sse/bin
pm2 start ecosystem.config.js

# Configure startup and save process list
pm2 startup
pm2 save

# Verify the process is running
echo "Verifying process status..."
sleep 2
pm2 list

# Test the server is accessible
echo "Testing server accessibility..."
curl -s http://localhost:3030/health

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
