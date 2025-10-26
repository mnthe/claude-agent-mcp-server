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
import { ExecuteCommandHandler } from '../handlers/ExecuteCommandHandler.js';
import { ReadFileHandler } from '../handlers/ReadFileHandler.js';
import { WriteFileHandler } from '../handlers/WriteFileHandler.js';
import { WebFetchHandler } from '../handlers/WebFetchHandler.js';
import { Logger } from '../utils/Logger.js';
import {
  QuerySchema,
  QueryInput,
  ExecuteCommandSchema,
  ExecuteCommandInput,
  ReadFileSchema,
  ReadFileInput,
  WriteFileSchema,
  WriteFileInput,
  WebFetchSchema,
  WebFetchInput,
} from '../schemas/index.js';

export class ClaudeAgentMCPServer {
  private server: Server;
  private claudeAI: ClaudeAIService;
  private conversationManager: ConversationManager | null;
  private queryHandler: QueryHandler;
  private executeCommandHandler: ExecuteCommandHandler;
  private readFileHandler: ReadFileHandler;
  private writeFileHandler: WriteFileHandler;
  private webFetchHandler: WebFetchHandler;
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
      provider: config.provider,
      model: config.model,
      conversationsEnabled: config.enableConversations,
      commandExecutionEnabled: config.enableCommandExecution,
      fileWriteEnabled: config.enableFileWrite,
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
    
    this.executeCommandHandler = new ExecuteCommandHandler(
      this.logger,
      config.enableCommandExecution
    );
    
    this.readFileHandler = new ReadFileHandler(this.logger);
    
    this.writeFileHandler = new WriteFileHandler(
      this.logger,
      config.enableFileWrite
    );
    
    this.webFetchHandler = new WebFetchHandler(this.logger);

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
      
      const tools: any[] = [
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
        },
        {
          name: "read_file",
          description: "Read content from a file. Files must be in allowed directories (current working directory, Documents, Downloads, Desktop).",
          inputSchema: {
            type: "object",
            properties: {
              path: {
                type: "string",
                description: "Path to the file to read"
              }
            },
            required: ["path"]
          }
        },
        {
          name: "web_fetch",
          description: "Fetch content from a URL. Only HTTPS URLs are allowed. External content is tagged for security.",
          inputSchema: {
            type: "object",
            properties: {
              url: {
                type: "string",
                description: "HTTPS URL to fetch (HTTP not allowed for security)"
              },
              extract: {
                type: "boolean",
                description: "Extract main content from HTML (default: true)"
              }
            },
            required: ["url"]
          }
        }
      ];
      
      // Add conditional tools
      if (this.config.enableFileWrite) {
        tools.push({
          name: "write_file",
          description: "Write content to a file. Files must be in allowed directories. Requires CLAUDE_ENABLE_FILE_WRITE=true.",
          inputSchema: {
            type: "object",
            properties: {
              path: {
                type: "string",
                description: "Path to the file to write"
              },
              content: {
                type: "string",
                description: "Content to write to the file"
              }
            },
            required: ["path", "content"]
          }
        });
      }
      
      if (this.config.enableCommandExecution) {
        tools.push({
          name: "execute_command",
          description: "Execute a shell command. Requires CLAUDE_ENABLE_COMMAND_EXECUTION=true. Use with caution.",
          inputSchema: {
            type: "object",
            properties: {
              command: {
                type: "string",
                description: "The shell command to execute"
              },
              workingDirectory: {
                type: "string",
                description: "Working directory for command execution"
              }
            },
            required: ["command"]
          }
        });
      }
      
      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      this.logger.info('Received tools/call request', { 
        toolName: request.params.name 
      });

      const { name, arguments: args } = request.params;

      try {
        let result: string;
        
        switch (name) {
          case "query": {
            const input = QuerySchema.parse(args) as QueryInput;
            result = await this.queryHandler.handle(input);
            break;
          }
          
          case "execute_command": {
            const input = ExecuteCommandSchema.parse(args) as ExecuteCommandInput;
            result = await this.executeCommandHandler.handle(input);
            break;
          }
          
          case "read_file": {
            const input = ReadFileSchema.parse(args) as ReadFileInput;
            result = await this.readFileHandler.handle(input);
            break;
          }
          
          case "write_file": {
            const input = WriteFileSchema.parse(args) as WriteFileInput;
            result = await this.writeFileHandler.handle(input);
            break;
          }
          
          case "web_fetch": {
            const input = WebFetchSchema.parse(args) as WebFetchInput;
            result = await this.webFetchHandler.handle(input);
            break;
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
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
