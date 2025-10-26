/**
 * Configuration loader for Claude Agent MCP Server
 * Configures environment for Claude Agent SDK multi-provider support
 */

import { ClaudeAgentConfig, MCPServerConfig, ProviderType } from '../types/index.js';

export function loadConfig(): ClaudeAgentConfig {
  // Determine provider (default: anthropic)
  const provider = (process.env.CLAUDE_PROVIDER || 'anthropic') as ProviderType;

  // Get API key - required for all providers
  const apiKey = process.env.ANTHROPIC_API_KEY || "";

  if (!apiKey) {
    console.error(
      "Error: ANTHROPIC_API_KEY environment variable is required"
    );
    process.exit(1);
  }

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
  const logToStderr = process.env.CLAUDE_LOG_TO_STDERR === "true";

  // System prompt override - allows customization of AI assistant behavior
  const systemPrompt = process.env.CLAUDE_SYSTEM_PROMPT;

  // Provider-specific configuration
  const vertexProjectId = process.env.VERTEX_PROJECT_ID;
  const vertexLocation = process.env.VERTEX_LOCATION || "us-central1";
  const bedrockRegion = process.env.BEDROCK_REGION || "us-east-1";

  // Validate provider-specific requirements
  if (provider === 'vertex' && !vertexProjectId) {
    console.error("Error: VERTEX_PROJECT_ID is required when using Vertex AI provider");
    process.exit(1);
  }

  // Set Claude Agent SDK environment variables based on provider
  // These are used by the Agent SDK to configure the backend
  if (provider === 'vertex') {
    process.env.CLAUDE_CODE_USE_VERTEX = '1';
    process.env.GCLOUD_PROJECT = vertexProjectId;
    process.env.GCLOUD_REGION = vertexLocation;
  } else if (provider === 'bedrock') {
    process.env.CLAUDE_CODE_USE_BEDROCK = '1';
    process.env.AWS_REGION = bedrockRegion;
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
    apiKey,
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
    vertexProjectId,
    vertexLocation,
    bedrockRegion,
  };
}
