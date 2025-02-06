// Tool related types
export interface Tool {
	id: string;
	name: string;
	version: string;
	description?: string;
	command: string;
	args: string[];
	env: Record<string, string>;
}

export interface ToolRegistry {
	tools: Map<string, Tool>;
	register(tool: Tool): void;
	unregister(toolId: string): void;
	getTool(toolId: string): Tool | undefined;
}

// Connection related types
export interface Connection {
	id: string;
	target: WritableStreamDefaultWriter;
	connectedAt: Date;
	lastMessageAt: Date;
}

export interface ConnectionManager {
	connections: Map<string, Connection>;
	addConnection(connection: Connection): void;
	removeConnection(connectionId: string): void;
	broadcast(message: string): void;
	sendToConnection(connectionId: string, message: string): void;
}

// Message types
export interface Message {
	type: "tool" | "system" | "error";
	toolId?: string;
	payload: unknown;
	timestamp: number;
}

// Error types
export interface ErrorResponse {
	code: string;
	message: string;
	details?: unknown;
}
