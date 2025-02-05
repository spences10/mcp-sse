# MCP SSE Server

A Server-Sent Events (SSE) implementation for MCP tools, replacing the current stdio transport system.

## Features

- Single persistent server connection for multiple MCP tools
- Connection pool management
- Tool registry and routing
- Error recovery and reconnection handling
- Authentication and authorization
- Performance optimized for long-running connections

## Development

### Prerequisites

- Deno runtime installed
- Access to MCP tools

### Getting Started

1. Clone the repository
2. Run development server:
   ```bash
   deno task dev
   ```

3. Run tests:
   ```bash
   deno task test
   ```

### Project Structure

```
/src
  /core          - Core system components
  /routes        - API routes and endpoints
  /types         - TypeScript type definitions
  /utils         - Utility functions
  main.ts        - Application entry point
  config.ts      - Configuration management
/tests           - Test files
```

## Architecture

### Core Components

1. Connection Manager
   - Handles SSE connections
   - Manages connection lifecycle
   - Implements heartbeat mechanism

2. Tool Registry
   - Tool registration and management
   - Message routing
   - Version management

3. Authentication
   - Token-based authentication
   - Request validation
   - Security measures

### Performance Considerations

- Connection pooling
- Memory management
- Resource cleanup
- Load balancing

## License

[License details to be added]