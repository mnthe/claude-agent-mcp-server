/**
 * Configuration types for Claude Agent MCP Server
 */

export type ProviderType = 'anthropic' | 'vertex' | 'bedrock';

export interface ClaudeAgentConfig {
  provider: ProviderType;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  enableConversations: boolean;
  sessionTimeout: number;
  maxHistory: number;
  logDir?: string;
  disableLogging: boolean;
  logToStderr: boolean;
  systemPrompt?: string;
  mcpServers?: MCPServerConfig[];
  // Provider-specific settings
  vertexProjectId?: string;
  vertexLocation?: string;
  bedrockRegion?: string;
  // Tool enablement
  enableCommandExecution: boolean;
  enableFileWrite: boolean;
}

export interface MCPServerConfig {
  name: string;
  transport: 'stdio' | 'http';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
}
