import { Tool } from '@/types/types.ts';
import { MCPToolRegistry } from '@/core/tool_registry.ts';

export class ToolRouteHandler {
  private toolRegistry: MCPToolRegistry;

  constructor(toolRegistry: MCPToolRegistry) {
    this.toolRegistry = toolRegistry;
  }

  async handleToolRegistration(req: Request): Promise<Response> {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Check API key
    const apiKey = req.headers.get('X-API-Key');
    const configApiKey = Deno.env.get('MCP_SSE_API_KEY');
    
    if (!apiKey || apiKey !== configApiKey) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    try {
      const tool: Tool = await req.json();
      
      // Validate tool data
      if (!tool.id || !tool.name || !tool.version) {
        return new Response(
          JSON.stringify({ error: 'Missing required tool properties' }), 
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      this.toolRegistry.register(tool);
      
      return new Response(
        JSON.stringify({ message: 'Tool registered successfully', tool }), 
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid tool data' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  handleToolList(req: Request): Response {
    // Check API key
    const apiKey = req.headers.get('X-API-Key');
    const configApiKey = Deno.env.get('MCP_SSE_API_KEY');
    
    if (!apiKey || apiKey !== configApiKey) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const tools = this.toolRegistry.getAllTools();
    return new Response(
      JSON.stringify({ tools }), 
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  handleToolMessages(toolId: string, message: unknown): void {
    // Handle tool-specific messages
    console.log(`Message for tool ${toolId}:`, message);
  }
}
