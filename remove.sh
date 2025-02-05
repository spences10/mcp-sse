#!/bin/bash

# Exit on error
set -e

echo "Starting MCP SSE Server Removal..."

# Source system-wide profiles
for profile in /etc/profile.d/*.sh; do
    if [ -r "$profile" ]; then
        source "$profile"
    fi
done

# Ensure all required paths are available
export PATH="/opt/volta/tools/image/packages/pm2/bin:/opt/volta/tools/image/node/20.18.2/bin:/opt/volta/bin:/opt/deno/bin:$PATH"

# Wait a moment for PATH to be updated
sleep 2

# Function to check if running as root
check_root() {
    if [ "$(id -u)" != "0" ]; then
        echo "This script must be run as root"
        exit 1
    fi
}

# Stop and remove from PM2
echo "Stopping MCP SSE service..."
if command -v pm2 &> /dev/null; then
    pm2 stop mcp-sse || true
    pm2 delete mcp-sse || true
    pm2 save || true
    
    # Remove PM2 startup script
    if [ -f /etc/systemd/system/pm2-root.service ]; then
        pm2 unstartup systemd || true
        systemctl daemon-reload
    fi
fi

# Remove installation directory
echo "Removing installation directory..."
if [ -d "/opt/mcp-sse" ]; then
    rm -rf /opt/mcp-sse
fi

# Remove mcp-sse user if it exists
echo "Checking for mcp-sse user..."
if id "mcp-sse" &>/dev/null; then
    echo "Removing mcp-sse user..."
    userdel -r mcp-sse || true
fi

# Clean up environment variables from bashrc
echo "Cleaning up environment variables..."
if [ -f "$HOME/.bashrc" ]; then
    # Create a temporary file
    temp_file=$(mktemp)
    
    # Remove MCP SSE related lines
    grep -v "MCP_SSE_API_KEY" "$HOME/.bashrc" > "$temp_file"
    
    # Replace original file
    mv "$temp_file" "$HOME/.bashrc"
    
    echo "Removed environment variables from .bashrc"
fi

# Optional: Remove Volta and Node.js
read -p "Do you want to remove Volta and Node.js? (y/N) " remove_volta
if [ "$remove_volta" = "y" ] || [ "$remove_volta" = "Y" ]; then
    echo "Removing Volta and Node.js..."
    if [ -d "/opt/volta" ]; then
        rm -rf /opt/volta
        rm -f /etc/profile.d/volta.sh
    fi
fi

# Optional: Remove Deno
read -p "Do you want to remove Deno? (y/N) " remove_deno
if [ "$remove_deno" = "y" ] || [ "$remove_deno" = "Y" ]; then
    echo "Removing Deno..."
    if [ -d "/opt/deno" ]; then
        rm -rf /opt/deno
        rm -f /etc/profile.d/deno.sh
    fi
fi

echo ""
echo "MCP SSE server has been successfully removed!"
echo "Please log out and back in for all changes to take effect."
echo "You may also want to remove any API keys you added to your environment."
