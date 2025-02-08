const sse_url = "http://localhost:3030/sse";
const api_key = Deno.env.get("MCP_SSE_API_KEY") || "your-local-dev-key";

console.log("Connecting to SSE server...");

// Create URL with API key as query parameter since EventSource doesn't support custom headers
const url_with_key = new URL(sse_url);
url_with_key.searchParams.set("api_key", api_key);

const event_source = new EventSource(url_with_key.toString());

event_source.onopen = () => {
	console.log("Connection established!");
};

event_source.onmessage = (event) => {
	const data = JSON.parse(event.data);
	console.log("Received message:", data);
};

event_source.onerror = (error) => {
	console.error("SSE Error:", error);
	event_source.close();
};

// Keep the script running but handle termination gracefully
await new Promise<void>((resolve) => {
	const handle_termination = () => {
		console.log("\nClosing connection...");
		event_source.close();
		resolve();
	};

	// Handle Ctrl+C
	Deno.addSignalListener("SIGINT", handle_termination);
});
