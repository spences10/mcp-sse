// Test script to register MCP tools
const tools = [
  {
    id: 'mcp-search-1',
    name: 'MCP Search',
    version: '1.0.0',
    description: 'Search tool for MCP'
  },
  {
    id: 'mcp-docs-1',
    name: 'MCP Documentation',
    version: '1.0.0',
    description: 'Documentation tool for MCP'
  },
  {
    id: 'mcp-memory-1',
    name: 'MCP Memory',
    version: '1.0.0',
    description: 'Memory management tool for MCP'
  }
];

async function registerTools() {
  for (const tool of tools) {
    try {
      const response = await fetch('http://localhost:8000/tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tool),
      });
      
      const result = await response.json();
      console.log(`Registered tool ${tool.name}:`, result);
    } catch (error) {
      console.error(`Failed to register tool ${tool.name}:`, error);
    }
  }
}

registerTools();