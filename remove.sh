#!/bin/bash

# Exit on error
set -e

echo "Starting MCP SSE Server Removal..."

# Source bashrc to get updated PATH with Volta
if [ -f "$HOME/.bashrc" ]; then
    source "$HOME/.bashrc"
fi

# Ensure pm2 is in PATH
export PATH="$HOME/.volta/bin:$PATH"

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
    if [ -d "$HOME/.volta" ]; then
        rm -rf "$HOME/.volta"
        # Remove Volta from bashrc
        temp_file=$(mktemp)
        grep -v "VOLTA_HOME" "$HOME/.bashrc" > "$temp_file"
        mv "$temp_file" "$HOME/.bashrc"
    fi
fi

# Optional: Remove Deno
read -p "Do you want to remove Deno? (y/N) " remove_deno
if [ "$remove_deno" = "y" ] || [ "$remove_deno" = "Y" ]; then
    echo "Removing Deno..."
    if [ -d "$HOME/.deno" ]; then
        rm -rf "$HOME/.deno"
        # Remove Deno from bashrc
        temp_file=$(mktemp)
        grep -v "DENO_INSTALL" "$HOME/.bashrc" > "$temp_file"
        mv "$temp_file" "$HOME/.bashrc"
    fi
fi

echo ""
echo "MCP SSE server has been successfully removed!"
echo "Please log out and back in for all changes to take effect."
echo "You may also want to remove any API keys you added to your environment."
