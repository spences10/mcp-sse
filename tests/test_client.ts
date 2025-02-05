// Test client for SSE connections
const sse = new EventSource('http://localhost:3030/sse');

sse.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received SSE message:', data);
};

sse.onerror = (error) => {
  console.error('SSE connection error:', error);
};

// Keep the connection alive
setTimeout(() => {
  sse.close();
  console.log('Connection closed after 30 seconds');
}, 30000);
