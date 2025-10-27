/**
 * Configuration loader for Claude Agent MCP Server
 * Configures environment for Claude Agent SDK multi-provider support
 */

import { ClaudeAgentConfig, MCPServerConfig, ProviderType } from '../types/index.js';

export function loadConfig(): ClaudeAgentConfig {
  // Determine provider (default: anthropic)
  const provider = (process.env.CLAUDE_PROVIDER || 'anthropic') as ProviderType;

  // Model and parameters
  const model = process.env.CLAUDE_MODEL || "claude-sonnet-4-5-20250929";
  const temperature = parseFloat(process.env.CLAUDE_TEMPERATURE || "1.0");
  const maxTokens = parseInt(process.env.CLAUDE_MAX_TOKENS || "16384", 10);

  // Conversation mode configuration
  const enableConversations = process.env.CLAUDE_ENABLE_CONVERSATIONS === "true";
  const sessionTimeout = parseInt(process.env.CLAUDE_SESSION_TIMEOUT || "3600", 10);
  const maxHistory = parseInt(process.env.CLAUDE_MAX_HISTORY || "10", 10);
  const maxTurns = parseInt(process.env.CLAUDE_MAX_TURNS || "10", 10);

  // Logging configuration
  const logDir = process.env.CLAUDE_LOG_DIR;
  const disableLogging = process.env.CLAUDE_DISABLE_LOGGING === "true";
  const logToStderr = process.env.CLAUDE_LOG_TO_STDERR !== "false";  // Default: true (console logging)

  // System prompt override - allows customization of AI assistant behavior
  const systemPrompt = process.env.CLAUDE_SYSTEM_PROMPT;

  // Set Claude Agent SDK flags based on provider
  // Provider-specific credentials are read from standard environment variables:
  // - Anthropic: ANTHROPIC_API_KEY
  // - Vertex AI: ANTHROPIC_VERTEX_PROJECT_ID, CLOUD_ML_REGION (+ GCP Application Default Credentials)
  // - Bedrock: AWS_REGION (+ AWS credentials via default credentials chain)
  switch (provider) {
    case 'vertex':
      process.env.CLAUDE_CODE_USE_VERTEX = '1';
      break;
    case 'bedrock':
      process.env.CLAUDE_CODE_USE_BEDROCK = '1';
      break;
    case 'anthropic':
      // No additional env vars needed - uses ANTHROPIC_API_KEY directly
      break;
  }

  // Parse MCP server configurations
  let mcpServers: MCPServerConfig[] | undefined;
  const mcpServersEnv = process.env.CLAUDE_MCP_SERVERS;
  if (mcpServersEnv) {
    try {
      mcpServers = JSON.parse(mcpServersEnv);
    } catch (error) {
      console.error("Error: Failed to parse CLAUDE_MCP_SERVERS JSON:", error);
      process.exit(1);
    }
  }

  return {
    provider,
    model,
    temperature,
    maxTokens,
    enableConversations,
    sessionTimeout,
    maxHistory,
    maxTurns,
    logDir,
    disableLogging,
    logToStderr,
    systemPrompt,
    mcpServers,
  };
}
