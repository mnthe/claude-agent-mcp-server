/**
 * Configuration types for Claude Agent MCP Server
 */

export interface ClaudeAgentConfig {
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
