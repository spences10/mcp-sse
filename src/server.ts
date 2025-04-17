/**
 * MCP SSE Server
 */
import {
	McpServer,
	ResourceTemplate,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import cors from 'cors';
import { config } from 'dotenv';
import express from 'express';
import { registerAllTools } from './tools/index';

// Load environment variables (optional)
config();

const server: McpServer = new McpServer({
	name: 'mcp-sse',
	version: '1.0.0',
});

// Register all tools in a modular fashion
registerAllTools(server);

// Register example resource
server.resource(
	'greeting',
	new ResourceTemplate('greeting://{name}', { list: undefined }),
	async (uri, { name }) => ({
		contents: [
			{
				uri: uri.href,
				text: `Hello, ${name}!`,
			},
		],
	}),
);

const app = express();
app.use(
	cors({
		origin: '*',
		methods: ['GET', 'POST', 'OPTIONS'],
		credentials: false,
	}),
);
// DO NOT use app.use(express.json()) here! The MCP SDK expects the raw request stream for /messages.

let transport: SSEServerTransport;

app.get('/sse', async (req, res) => {
	transport = new SSEServerTransport('/messages', res);
	await server.connect(transport);
});

app.post('/messages', async (req, res) => {
	await transport.handlePostMessage(req, res);
});

app.get('/', (req, res) => {
	res.json({
		name: 'MCP SSE Server',
		version: '1.0.0',
		status: 'running',
		endpoints: {
			'/': 'Server information (this response)',
			'/sse': 'Server-Sent Events endpoint for MCP connection',
			'/messages': 'POST endpoint for MCP messages',
		},
		tools: [{ name: 'echo', description: 'Echoes a string back' }],
	});
});

const PORT: string | number = process.env.PORT || 8080;
app.listen(PORT, () => {
	console.log(`MCP SSE Server running on port ${PORT}`);
});
