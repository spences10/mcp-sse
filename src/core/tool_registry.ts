import { Tool, ToolRegistry } from '@/types/types.ts';

export class MCPToolRegistry implements ToolRegistry {
  tools: Map<string, Tool>;

  constructor() {
    this.tools = new Map();
  }

  register(tool: Tool): void {
    this.tools.set(tool.id, tool);
  }

  unregister(toolId: string): void {
    this.tools.delete(toolId);
  }

  getTool(toolId: string): Tool | undefined {
    return this.tools.get(toolId);
  }

  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }
}