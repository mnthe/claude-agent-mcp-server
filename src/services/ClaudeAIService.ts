/**
 * Claude AI Service - wrapper using Claude Agent SDK
 * The Claude Agent SDK handles multi-provider support internally via environment variables
 * Supports: Anthropic (default), Vertex AI, AWS Bedrock
 */

import { query, type Options } from '@anthropic-ai/claude-agent-sdk';
import { ClaudeAgentConfig, Message } from '../types/index.js';
import { Logger } from '../utils/Logger.js';

export interface ClaudeResponse {
  content: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class ClaudeAIService {
  private config: ClaudeAgentConfig;
  private logger: Logger;

  constructor(config: ClaudeAgentConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    
    this.logger.info('Initialized Claude Agent SDK Service', {
      provider: config.provider,
      model: config.model
    });
  }

  /**
   * Build conversation context from history
   */
  private buildFullPrompt(prompt: string, conversationHistory: Message[]): string {
    if (conversationHistory.length === 0) {
      return prompt;
    }

    const contextParts: string[] = ["Previous conversation:"];
    for (const msg of conversationHistory) {
      contextParts.push(`${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`);
    }
    contextParts.push(`\nCurrent query: ${prompt}`);
    return contextParts.join('\n');
  }

  /**
   * Configure MCP servers for Claude Agent SDK
   */
  private configureMcpServers(): Record<string, any> | undefined {
    const mcpServers: Record<string, any> = {};
    
    if (this.config.mcpServers && this.config.mcpServers.length > 0) {
      for (const server of this.config.mcpServers) {
        if (server.transport === 'stdio') {
          mcpServers[server.name] = {
            command: server.command,
            args: server.args || [],
            env: server.env || {},
          };
        } else if (server.transport === 'http') {
          mcpServers[server.name] = {
            type: 'http',
            url: server.url,
            headers: server.headers || {},
          };
        }
      }
    }

    return Object.keys(mcpServers).length > 0 ? mcpServers : undefined;
  }

  /**
   * Get system prompt
   */
  private getSystemPrompt(): string {
    return this.config.systemPrompt || 
      "You are a helpful AI assistant with access to various tools and capabilities.";
  }

  /**
   * Create options for Claude Agent SDK query
   */
  private createQueryOptions(maxTurns: number): Options {
    return {
      model: this.config.model,
      systemPrompt: this.getSystemPrompt(),
      maxTurns: maxTurns,
      mcpServers: this.configureMcpServers(),
    };
  }

  /**
   * Send a query to Claude with conversation history
   * The Claude Agent SDK handles provider routing internally via environment variables
   * Supports multi-turn agentic loops for tool usage
   */
  async query(
    prompt: string,
    conversationHistory: Message[] = [],
    maxTurns?: number
  ): Promise<ClaudeResponse> {
    try {
      const turns = maxTurns ?? this.config.maxTurns;
      
      this.logger.info('Sending query to Claude via Agent SDK', {
        provider: this.config.provider,
        model: this.config.model,
        historyLength: conversationHistory.length,
        maxTurns: turns,
      });

      // Build conversation context from history
      const fullPrompt = this.buildFullPrompt(prompt, conversationHistory);

      // Configure options for Claude Agent SDK
      const options = this.createQueryOptions(turns);

      // Call Claude Agent SDK query function
      // This returns an AsyncGenerator<SDKMessage>
      const queryStream = query({
        prompt: fullPrompt,
        options,
      });

      // Collect all messages from the stream
      let content = '';
      let usage: any = undefined;

      for await (const message of queryStream) {
        // SDKMessage can be UserMessage, AssistantMessage, ThinkingMessage, etc.
        if (message.type === 'assistant') {
          // Access the underlying APIAssistantMessage
          const apiMessage = message.message;
          
          // Concatenate assistant message content
          if (apiMessage.content && Array.isArray(apiMessage.content)) {
            for (const block of apiMessage.content) {
              if (block.type === 'text' && 'text' in block) {
                content += block.text;
              }
            }
          }
          
          // Capture usage information if available
          if (apiMessage.usage) {
            usage = {
              input_tokens: apiMessage.usage.input_tokens || 0,
              output_tokens: apiMessage.usage.output_tokens || 0,
            };
          }
        }
      }

      this.logger.info('Received response from Claude Agent SDK', {
        provider: this.config.provider,
        contentLength: content.length,
        hasUsage: !!usage,
      });

      return {
        content,
        usage,
      };
    } catch (error) {
      this.logger.error('Error querying Claude Agent SDK', { error });
      throw error;
    }
  }

  /**
   * Send a streaming query to Claude
   * The Claude Agent SDK natively supports streaming
   * Supports multi-turn agentic loops for tool usage
   */
  async *queryStream(
    prompt: string,
    conversationHistory: Message[] = [],
    maxTurns?: number
  ): AsyncGenerator<string, void, unknown> {
    try {
      const turns = maxTurns ?? this.config.maxTurns;
      
      this.logger.info('Sending streaming query to Claude Agent SDK', {
        provider: this.config.provider,
        model: this.config.model,
        historyLength: conversationHistory.length,
        maxTurns: turns,
      });

      // Build conversation context from history
      const fullPrompt = this.buildFullPrompt(prompt, conversationHistory);

      // Configure options for Claude Agent SDK
      const options = this.createQueryOptions(turns);

      // Call Claude Agent SDK query function
      const queryStream = query({
        prompt: fullPrompt,
        options,
      });

      // Stream assistant messages
      for await (const message of queryStream) {
        if (message.type === 'assistant') {
          // Access the underlying APIAssistantMessage
          const apiMessage = message.message;
          
          if (apiMessage.content && Array.isArray(apiMessage.content)) {
            for (const block of apiMessage.content) {
              if (block.type === 'text' && 'text' in block) {
                yield block.text;
              }
            }
          }
        }
      }

      this.logger.info('Completed streaming response from Claude Agent SDK');
    } catch (error) {
      this.logger.error('Error streaming from Claude Agent SDK', { error });
      throw error;
    }
  }
}
