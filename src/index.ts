#!/usr/bin/env node
/**
 * Claude Agent MCP Server - Entry Point
 *
 * A Model Context Protocol (MCP) server that provides intelligent agent capabilities
 * powered by Claude (Anthropic) via the Agent SDK, including automatic reasoning and
 * workflow orchestration.
 *
 * Architecture:
 * - config/: Configuration loading and validation
 * - types/: TypeScript type definitions
 * - schemas/: Zod validation schemas
 * - managers/: Business logic managers (conversations)
 * - services/: External service integrations (Claude AI)
 * - handlers/: Tool request handlers (query)
 * - server/: MCP server orchestration
 * - errors/: Custom error types
 * - utils/: Shared utilities (Logger)
 */

// Load .env file for local development
import 'dotenv/config';

import { loadConfig } from './config/index.js';
import { ClaudeAgentMCPServer } from './server/ClaudeAgentMCPServer.js';

// Load configuration
const config = loadConfig();

// Create and start server
const server = new ClaudeAgentMCPServer(config);
server.run().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
