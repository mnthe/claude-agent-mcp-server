/**
 * Configuration loader for Claude Agent MCP Server
 */

import { ClaudeAgentConfig, MCPServerConfig } from '../types/index.js';

export function loadConfig(): ClaudeAgentConfig {
  // Get API key - required
  const apiKey = process.env.ANTHROPIC_API_KEY || "";

  if (!apiKey) {
    console.error(
      "Error: ANTHROPIC_API_KEY environment variable is required"
    );
    process.exit(1);
  }

  // Model and parameters
  const model = process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022";
  const temperature = parseFloat(process.env.CLAUDE_TEMPERATURE || "1.0");
  const maxTokens = parseInt(process.env.CLAUDE_MAX_TOKENS || "8192", 10);

  // Conversation mode configuration
  const enableConversations = process.env.CLAUDE_ENABLE_CONVERSATIONS === "true";
  const sessionTimeout = parseInt(process.env.CLAUDE_SESSION_TIMEOUT || "3600", 10);
  const maxHistory = parseInt(process.env.CLAUDE_MAX_HISTORY || "10", 10);

  // Logging configuration
  const logDir = process.env.CLAUDE_LOG_DIR;
  const disableLogging = process.env.CLAUDE_DISABLE_LOGGING === "true";
  const logToStderr = process.env.CLAUDE_LOG_TO_STDERR === "true";

  // System prompt override - allows customization of AI assistant behavior
  const systemPrompt = process.env.CLAUDE_SYSTEM_PROMPT;

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
    apiKey,
    model,
    temperature,
    maxTokens,
    enableConversations,
    sessionTimeout,
    maxHistory,
    logDir,
    disableLogging,
    logToStderr,
    systemPrompt,
    mcpServers,
  };
}
