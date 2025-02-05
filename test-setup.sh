#!/bin/bash

# Exit on error
set -e

echo "Starting MCP SSE Server Tests..."

# Function to check if a command was successful
check_status() {
    if [ $? -eq 0 ]; then
        echo "✓ $1"
    else
        echo "✗ $1"
        exit 1
    fi
}

# 1. Check if server is running
echo "Testing server status..."
pm2 list | grep "mcp-sse.*online"
check_status "Server is running"

# 2. Test health endpoint
echo "Testing health endpoint..."
health_response=$(curl -s http://localhost:3030/health)
echo $health_response | grep -q '"status":"ok"'
check_status "Health endpoint is responding"

# Check user and permissions
echo "Checking installation user..."
if [ "$(id -u)" = "0" ]; then
    OWNER_USER="mcp-sse"
    if ! id -u mcp-sse > /dev/null 2>&1; then
        echo "✗ mcp-sse user not found"
        exit 1
    fi
    check_status "Running as root, mcp-sse user exists"
else
    OWNER_USER=$USER
    check_status "Running as regular user: $USER"
fi

# Get current API key from environment
if [ -z "$MCP_SSE_API_KEY" ]; then
    echo "Error: MCP_SSE_API_KEY not found in environment"
    exit 1
fi

# Check directory ownership
echo "Checking directory permissions..."
if [ "$(stat -c '%U' /opt/mcp-sse)" = "$OWNER_USER" ]; then
    check_status "Directory ownership correct"
else
    echo "✗ Directory ownership incorrect"
    exit 1
fi

# 3. Test tool registration
echo "Testing tool registration..."
curl -s -X POST http://localhost:3030/tools \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $MCP_SSE_API_KEY" \
  -d '{
    "id": "test-tool",
    "name": "Test Tool",
    "version": "1.0.0",
    "description": "A test tool",
    "command": "echo",
    "args": ["test"],
    "env": {
      "TEST_KEY": "test-value"
    }
  }' | grep -q "Tool registered successfully"
check_status "Tool registration"

# 4. Test tool listing
echo "Testing tool listing..."
tools_response=$(curl -s http://localhost:3030/tools -H "X-API-Key: $MCP_SSE_API_KEY")
echo $tools_response | grep -q "test-tool"
check_status "Tool listing"

# 5. Test config file
echo "Testing configuration file..."
test -f /opt/mcp-sse/config/mcp_settings.json
check_status "Config file exists"

jq empty /opt/mcp-sse/config/mcp_settings.json
check_status "Config file is valid JSON"

# 6. Test tool configuration update
echo "Testing tool configuration update..."
/opt/mcp-sse/bin/update-tool.sh test-tool TEST_KEY new-value
check_status "Tool configuration update"

# 7. Test SSE connection
echo "Testing SSE connection..."
# Use curl to establish SSE connection and wait for initial message
timeout 5 curl -s -N http://localhost:3030/sse > sse_output.tmp &
sleep 2
grep -q "connectionId" sse_output.tmp
check_status "SSE connection established"
rm sse_output.tmp

# 8. Test unauthorized access
echo "Testing security..."
curl -s -X POST http://localhost:3030/tools \
  -H "Content-Type: application/json" \
  -H "X-API-Key: wrong-key" \
  -d '{"id":"test"}' | grep -q "Unauthorized"
check_status "Unauthorized access properly rejected"

# Test file permissions
echo "Testing file permissions..."
[ "$(stat -c %a /opt/mcp-sse/config/mcp_settings.json)" = "600" ]
check_status "Config file has correct permissions (600)"

[ "$(stat -c %a /opt/mcp-sse/bin/ecosystem.config.js)" = "755" ]
check_status "Ecosystem config has correct permissions (755)"

[ "$(stat -c %a /opt/mcp-sse/bin/update-tool.sh)" = "755" ]
check_status "Update tool script has correct permissions (755)"

# Test PM2 process ownership
echo "Testing process ownership..."
pm2 list | grep "mcp-sse.*$OWNER_USER"
check_status "Process running as correct user"

echo ""
echo "All tests completed successfully!"
echo "The MCP SSE server is properly configured and running."
