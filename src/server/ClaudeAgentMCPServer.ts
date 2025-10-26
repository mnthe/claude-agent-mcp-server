/**
 * ClaudeAgentMCPServer - Main MCP server implementation
 * Orchestrates all components and handles MCP protocol
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { ClaudeAgentConfig, CachedDocument } from '../types/index.js';
import { QuerySchema, SearchSchema, FetchSchema } from '../schemas/index.js';
import { ConversationManager } from '../managers/ConversationManager.js';
import { ClaudeAIService } from '../services/ClaudeAIService.js';
import { Logger } from '../utils/Logger.js';
import { QueryHandler } from '../handlers/QueryHandler.js';
import { SearchHandler } from '../handlers/SearchHandler.js';
import { FetchHandler } from '../handlers/FetchHandler.js';

export class ClaudeAgentMCPServer {
  private server: Server;
  private config: ClaudeAgentConfig;

  // Core components
  private conversationManager: ConversationManager | null;
  private claudeAI: ClaudeAIService;
  private logger: Logger;

  // Handlers
  private queryHandler: QueryHandler;
  private searchHandler: SearchHandler;
  private fetchHandler: FetchHandler;

  // Cache
  private searchCache: Map<string, CachedDocument>;

  constructor(config: ClaudeAgentConfig) {
    this.config = config;
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

    // Initialize cache
    this.searchCache = new Map();

    // Initialize logger
    this.logger = new Logger(
      config.logDir,
      config.disableLogging,
      config.logToStderr
    );

    // Initialize conversation manager if enabled
    this.conversationManager = config.enableConversations
      ? new ConversationManager(
          config.sessionTimeout,
          config.maxHistory,
          this.logger
        )
      : null;

    // Initialize services
    this.claudeAI = new ClaudeAIService(config, this.logger);

    // Initialize handlers
    this.queryHandler = new QueryHandler(
      this.claudeAI,
      this.conversationManager,
      this.logger
    );
    this.searchHandler = new SearchHandler(
      this.claudeAI,
      this.searchCache,
      this.logger
    );
    this.fetchHandler = new FetchHandler(
      this.searchCache,
      this.logger
    );

    this.setupHandlers();
  }

  /**
   * Setup MCP protocol handlers
   */
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = [
        {
          name: "query",
          description:
            "Query Claude AI with a prompt. " +
            "This tool operates as an intelligent agent with multi-turn execution capabilities. " +
            "The agent can automatically use available tools from connected MCP servers " +
            "to gather information and provide comprehensive answers. " +
            "Supports multi-turn conversations when sessionId is provided. " +
            "Supports multimodal inputs (images, PDF documents) via the optional 'parts' parameter.",
          inputSchema: {
            type: "object",
            properties: {
              prompt: {
                type: "string",
                description: "The prompt to send to Claude",
              },
              sessionId: {
                type: "string",
                description: "Optional conversation session ID for multi-turn conversations",
              },
              parts: {
                type: "array",
                description: "Optional multimodal content parts (images, PDF documents)",
                items: {
                  type: "object",
                  properties: {
                    text: {
                      type: "string",
                      description: "Text content"
                    },
                    inlineData: {
                      type: "object",
                      description: "Inline base64 encoded file data",
                      properties: {
                        mimeType: {
                          type: "string",
                          description: "MIME type of the file (e.g., 'image/jpeg', 'image/png', 'application/pdf')"
                        },
                        data: {
                          type: "string",
                          description: "Base64 encoded file data"
                        }
                      },
                      required: ["mimeType", "data"]
                    },
                    fileData: {
                      type: "object",
                      description: "File URI for local files, public URLs, or cloud storage",
                      properties: {
                        mimeType: {
                          type: "string",
                          description: "MIME type of the file"
                        },
                        fileUri: {
                          type: "string",
                          description: "URI of the file (file:// for local files, https:// for public URLs)"
                        }
                      },
                      required: ["mimeType", "fileUri"]
                    }
                  }
                }
              }
            },
            required: ["prompt"],
          },
        },
        {
          name: "search",
          description:
            "Search for information using Claude. Returns a list of relevant search results. " +
            "Follows OpenAI MCP specification for search tools.",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The search query",
              },
            },
            required: ["query"],
          },
        },
        {
          name: "fetch",
          description:
            "Fetch the full contents of a search result document by its ID. " +
            "Follows OpenAI MCP specification for fetch tools.",
          inputSchema: {
            type: "object",
            properties: {
              id: {
                type: "string",
                description: "The unique identifier for the document to fetch",
              },
            },
            required: ["id"],
          },
        },
      ];

      return { tools };
    });

    // Handle tool calls with switch-case statement
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const toolName = request.params.name;
      const args = request.params.arguments || {};

      try {
        let result: string;

        switch (toolName) {
          case "query": {
            const input = QuerySchema.parse(args);
            result = await this.queryHandler.handle(input);
            break;
          }

          case "search": {
            const input = SearchSchema.parse(args);
            result = await this.searchHandler.handle(input);
            break;
          }

          case "fetch": {
            const input = FetchSchema.parse(args);
            result = await this.fetchHandler.handle(input);
            break;
          }

          default:
            throw new Error(`Unknown tool: ${toolName}`);
        }

        return {
          content: [
            {
              type: "text" as const,
              text: result
            }
          ]
        };
      } catch (error) {
        this.logger.error('Error executing tool', {
          toolName,
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
   * Start the MCP server
   */
  async run(): Promise<void> {
    this.logger.info('Initializing Claude AI MCP Server');

    // Start server
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    this.logger.info("Claude AI MCP Server running on stdio");
  }
}
