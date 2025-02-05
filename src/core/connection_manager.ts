import { Connection, ConnectionManager, Message } from '@/types/types.ts';

export class SSEConnectionManager implements ConnectionManager {
  connections: Map<string, Connection>;
  private heartbeatInterval: number;

  constructor(heartbeatInterval = 30000) {
    this.connections = new Map();
    this.heartbeatInterval = heartbeatInterval;
  }

  addConnection(connection: Connection): void {
    this.connections.set(connection.id, connection);
    this.startHeartbeat(connection.id);
  }

  removeConnection(connectionId: string): void {
    this.connections.delete(connectionId);
  }

  broadcast(message: string): void {
    this.connections.forEach((connection) => {
      this.sendToConnection(connection.id, message);
    });
  }

  sendToConnection(connectionId: string, message: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    try {
      connection.target.write(new TextEncoder().encode(`data: ${message}\n\n`));
      connection.lastMessageAt = new Date();
    } catch (error) {
      console.error(`Error sending message to connection ${connectionId}:`, error);
      this.removeConnection(connectionId);
    }
  }

  private startHeartbeat(connectionId: string): void {
    const interval = setInterval(() => {
      const connection = this.connections.get(connectionId);
      if (!connection) {
        clearInterval(interval);
        return;
      }

      const heartbeatMessage: Message = {
        type: 'system',
        payload: 'heartbeat',
        timestamp: Date.now(),
      };

      try {
        this.sendToConnection(connectionId, JSON.stringify(heartbeatMessage));
      } catch (error) {
        console.error(`Heartbeat failed for connection ${connectionId}:`, error);
        this.removeConnection(connectionId);
        clearInterval(interval);
      }
    }, this.heartbeatInterval);
  }
}
