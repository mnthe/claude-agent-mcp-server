/**
 * Claude Agent MCP Server
 * Main server class that orchestrates all components
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { ClaudeAgentConfig } from '../types/index.js';
import { ClaudeAIService } from '../services/ClaudeAIService.js';
import { ConversationManager } from '../managers/ConversationManager.js';
import { QueryHandler } from '../handlers/QueryHandler.js';
import { Logger } from '../utils/Logger.js';
import {
  QuerySchema,
  QueryInput,
} from '../schemas/index.js';

export class ClaudeAgentMCPServer {
  private server: Server;
  private claudeAI: ClaudeAIService;
  private conversationManager: ConversationManager | null;
  private queryHandler: QueryHandler;
  private logger: Logger;
  private config: ClaudeAgentConfig;

  constructor(config: ClaudeAgentConfig) {
    this.config = config;
    
    // Initialize logger
    this.logger = new Logger(
      config.logDir,
      config.disableLogging,
      config.logToStderr
    );

    this.logger.info('Initializing Claude Agent MCP Server', {
      model: config.model,
      conversationsEnabled: config.enableConversations,
    });

    // Initialize services
    this.claudeAI = new ClaudeAIService(config, this.logger);

    // Initialize conversation manager if enabled
    this.conversationManager = config.enableConversations
      ? new ConversationManager(
          config.sessionTimeout,
          config.maxHistory,
          this.logger
        )
      : null;

    // Initialize handlers
    this.queryHandler = new QueryHandler(
      this.claudeAI,
      this.conversationManager,
      this.logger
    );

    // Initialize MCP server
    this.server = new Server(
      {
        name: "claude-agent-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  /**
   * Setup MCP request handlers
   */
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      this.logger.info('Received tools/list request');
      
      return {
        tools: [
          {
            name: "query",
            description: "Send a query to Claude AI assistant. Supports multi-turn conversations with session management.",
            inputSchema: {
              type: "object",
              properties: {
                prompt: {
                  type: "string",
                  description: "The text prompt to send to Claude"
                },
                sessionId: {
                  type: "string",
                  description: "Optional conversation session ID for multi-turn conversations"
                }
              },
              required: ["prompt"]
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      this.logger.info('Received tools/call request', { 
        toolName: request.params.name 
      });

      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "query": {
            const input = QuerySchema.parse(args) as QueryInput;
            const result = await this.queryHandler.handle(input);
            
            return {
              content: [
                {
                  type: "text" as const,
                  text: result
                }
              ]
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        this.logger.error('Error executing tool', { 
          toolName: name,
          error: error instanceof Error ? error.message : String(error)
        });
        
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          isError: true
        };
      }
    });
  }

  /**
   * Start the server
   */
  async run(): Promise<void> {
    this.logger.info('Starting Claude Agent MCP Server');
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    this.logger.info('Server started and listening on stdio');
  }
}
