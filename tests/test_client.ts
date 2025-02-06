// Test client for SSE connections
console.log('Testing MCP SSE server...');

async function testTool(toolId: string) {
  console.log(`\nTesting ${toolId}...`);
  const sse = new EventSource(`http://localhost:3030/sse/${toolId}`);

  let connectionOpened = false;

  return new Promise<void>((resolve) => {
    sse.onopen = () => {
      connectionOpened = true;
      console.log(`SSE connection opened for ${toolId}`);
    };

    sse.onmessage = (event) => {
      console.log(`\n[${toolId}] Raw SSE message:`, event.data);
      
      try {
        const data = JSON.parse(event.data);
        console.log(`[${toolId}] Parsed message:`, JSON.stringify(data, null, 2));

        if (data.type === 'init') {
          console.log(`[${toolId}] Protocol initialized:`, data.payload.protocol);
          console.log(`[${toolId}] Available tools:`, data.payload.tools);
        } else if (data.type === 'ready') {
          console.log(`[${toolId}] Server ready for tool execution`);
        } else if (data.type === 'tool') {
          console.log(`[${toolId}] Tool execution result:`, data.payload);
        } else if (data.type === 'system' && data.payload === 'heartbeat') {
          console.log(`[${toolId}] Received heartbeat`);
        }
      } catch (err) {
        if (err instanceof Error) {
          console.log(`[${toolId}] Message is not JSON:`, err.message);
        }
      }
    };

    sse.onerror = (err) => {
      console.error(`[${toolId}] SSE connection error`);
      if (!connectionOpened) {
        console.error(`[${toolId}] Connection never established`);
      }
    };

    // Keep connection open for 10 seconds
    setTimeout(() => {
      console.log(`\nClosing ${toolId} connection...`);
      sse.close();
      resolve();
    }, 10000);
  });
}

async function testMcpServer() {
  try {
    // First, check available tools
    console.log('\nChecking available tools...');
    const toolsResponse = await fetch('http://localhost:3030/tools');
    const toolsData = await toolsResponse.json();
    console.log('Available tools:', JSON.stringify(toolsData, null, 2));

    // Check server health
    console.log('\nChecking server health...');
    const healthResponse = await fetch('http://localhost:3030/health');
    const healthData = await healthResponse.json();
    console.log('Server health:', JSON.stringify(healthData, null, 2));

    // Test each tool
    await testTool('test_server');
    await testTool('mcp-sequentialthinking-tools');

  } catch (err) {
    if (err instanceof Error) {
      console.error('Error:', err.message);
    }
  }
}

testMcpServer();
