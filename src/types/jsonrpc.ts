/**
 * JSON-RPC 2.0 message types for MCP.
 */

// JSON-RPC types may be handled by the SDK. Remove or document as deprecated if not used elsewhere.

/**
 * A JSON-RPC request object.
 */
export interface JSONRPCRequest {
	readonly jsonrpc: "2.0";
	readonly method: string;
	readonly params?: unknown;
	readonly id: string | number;
}

/**
 * A JSON-RPC notification object (no id).
 */
export interface JSONRPCNotification {
	readonly jsonrpc: "2.0";
	readonly method: string;
	readonly params?: unknown;
}

/**
 * A JSON-RPC response object.
 */
export interface JSONRPCResponse {
	readonly jsonrpc: "2.0";
	readonly id: string | number;
	readonly result?: unknown;
	readonly error?: {
		code: number;
		message: string;
		data?: unknown;
	};
}

/**
 * Union type for any JSON-RPC message.
 */
export type JSONRPCMessage =
	| JSONRPCRequest
	| JSONRPCNotification
	| JSONRPCResponse;
