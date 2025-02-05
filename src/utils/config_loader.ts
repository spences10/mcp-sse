import { Tool } from '@/types/types.ts';

interface MCPConfig {
  mcpServers: {
    [key: string]: {
      command: string;
      args: string[];
      env: {
        [key: string]: string;
      };
    };
  };
}

export class ConfigLoader {
  private static instance: ConfigLoader;
  private config: MCPConfig | null = null;

  private constructor() {}

  static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  async loadConfig(): Promise<MCPConfig> {
    if (this.config) {
      return this.config;
    }

    const configPath = Deno.env.get('MCP_CONFIG_PATH') || '/opt/mcp-sse/config/mcp_settings.json';
    
    try {
      const configText = await Deno.readTextFile(configPath);
      const parsedConfig = JSON.parse(configText) as MCPConfig;
      
      // Validate config structure
      if (!parsedConfig.mcpServers || typeof parsedConfig.mcpServers !== 'object') {
        throw new Error('Invalid config format: missing or invalid mcpServers object');
      }

      this.config = parsedConfig;
      return parsedConfig;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to load config from ${configPath}:`, errorMessage);
      throw new Error(`Failed to load MCP configuration: ${errorMessage}`);
    }
  }

  convertConfigToTools(): Tool[] {
    if (!this.config) {
      throw new Error('Config not loaded. Call loadConfig() first.');
    }

    return Object.entries(this.config.mcpServers).map(([id, config]) => ({
      id,
      name: id,
      version: '1.0.0',
      description: `MCP tool: ${id}`,
      command: config.command,
      args: config.args,
      env: config.env
    }));
  }
}
