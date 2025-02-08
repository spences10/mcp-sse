// Test client for SSE connections
console.log("Testing MCP SSE server...");

async function testTool(toolId: string) {
	console.log(`\nTesting ${toolId}...`);

	const api_key = Deno.env.get("MCP_SSE_API_KEY") || "your-local-dev-key";

	// Create URL with API key as query parameter since EventSource doesn't support custom headers
	const url = new URL(`http://localhost:3030/sse/${toolId}`);
	url.searchParams.set("api_key", api_key);

	// Add any tool-specific API keys if needed
	const tavily_api_key = Deno.env.get("TAVILY_API_KEY");
	if (tavily_api_key) {
		url.searchParams.set("X-Tool-TAVILY_API_KEY", tavily_api_key);
	}

	console.log("Connecting with URL:", url.toString());
	const sse = new EventSource(url.toString());

	let connectionOpened = false;
	let messageReceived = false;

	return new Promise<void>((resolve) => {
		sse.onopen = () => {
			connectionOpened = true;
			console.log(`SSE connection opened for ${toolId}`);
		};

		sse.onmessage = (event) => {
			messageReceived = true;
			console.log(`\n[${toolId}] Raw SSE message:`, event.data);

			try {
				const data = JSON.parse(event.data);
				console.log(
					`[${toolId}] Parsed message:`,
					JSON.stringify(data, null, 2)
				);

				if (data.type === "init") {
					console.log(
						`[${toolId}] Protocol initialized:`,
						data.payload.protocol
					);
					console.log(`[${toolId}] Available tools:`, data.payload.tools);
				} else if (data.type === "ready") {
					console.log(`[${toolId}] Server ready for tool execution`);

					// Send a test query once we're ready
					if (toolId === "mcp-tavily-search" && tavily_api_key) {
						const testQuery = {
							type: "query",
							payload: {
								query: "What is the weather like today?",
							},
						};
						// Note: EventSource is read-only, we'd need WebSocket for bi-directional
						console.log("Would send test query:", testQuery);
					}
				} else if (data.type === "tool") {
					console.log(`[${toolId}] Tool execution result:`, data.payload);
				} else if (data.type === "system" && data.payload === "heartbeat") {
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
			} else if (!messageReceived) {
				console.error(
					`[${toolId}] Connection established but no messages received`
				);
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
		const api_key = Deno.env.get("MCP_SSE_API_KEY") || "your-local-dev-key";
		const headers = {
			"X-API-Key": api_key,
		};

		// First, check available tools
		console.log("\nChecking available tools...");
		const toolsResponse = await fetch("http://localhost:3030/tools", {
			headers,
		});
		const toolsData = await toolsResponse.json();
		console.log("Available tools:", JSON.stringify(toolsData, null, 2));

		// Check server health
		console.log("\nChecking server health...");
		const healthResponse = await fetch("http://localhost:3030/health", {
			headers,
		});
		const healthData = await healthResponse.json();
		console.log("Server health:", JSON.stringify(healthData, null, 2));

		// Test each tool
		await testTool("mcp-tavily-search");
	} catch (err) {
		if (err instanceof Error) {
			console.error("Error:", err.message);
		}
	}
}

testMcpServer();
