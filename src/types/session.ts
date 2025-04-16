/**
 * Represents a single client session for SSE/MCP.
 */
// Session type not needed unless used outside legacy MCPServer. Remove or document as deprecated.
export interface Session {
  /** Unique session identifier */
  readonly sessionId: string;
  /** The SSE response object for this session */
  readonly response: import("express").Response;
  /** Message queue for this session */
  readonly messageQueue: unknown[];
  /** Timestamp of last activity */
  lastActive: number;
}
// Consider using SDK types instead.
