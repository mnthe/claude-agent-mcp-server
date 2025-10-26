/**
 * Claude AI Service - wrapper using Claude Agent SDK approach
 * Supports multi-provider configuration: Anthropic, Vertex AI, AWS Bedrock
 * Uses environment variables as per Claude Agent SDK pattern
 */

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
  private anthropic: any;

  constructor(config: ClaudeAgentConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    
    // Initialize Anthropic client based on provider
    // The Claude Agent SDK uses environment variables to configure the provider
    this.initializeClient();
  }

  private async initializeClient() {
    // Dynamic import based on provider configuration
    // This follows the Claude Agent SDK pattern
    if (this.config.provider === 'vertex') {
      this.logger.info('Initializing Vertex AI client', {
        projectId: this.config.vertexProjectId,
        location: this.config.vertexLocation
      });
      const AnthropicVertex = (await import('@anthropic-ai/vertex-sdk')).default;
      this.anthropic = new AnthropicVertex({
        projectId: this.config.vertexProjectId!,
        region: this.config.vertexLocation!,
      });
    } else if (this.config.provider === 'bedrock') {
      this.logger.info('Initializing Bedrock client', {
        region: this.config.bedrockRegion
      });
      const AnthropicBedrock = (await import('@anthropic-ai/bedrock-sdk')).default;
      this.anthropic = new AnthropicBedrock({
        awsRegion: this.config.bedrockRegion!,
      });
    } else {
      this.logger.info('Initializing Anthropic client');
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      this.anthropic = new Anthropic({
        apiKey: this.config.apiKey,
      });
    }
  }

  /**
   * Send a query to Claude with conversation history
   */
  async query(
    prompt: string,
    conversationHistory: Message[] = []
  ): Promise<ClaudeResponse> {
    // Ensure client is initialized
    if (!this.anthropic) {
      await this.initializeClient();
    }

    try {
      this.logger.info('Sending query to Claude', {
        provider: this.config.provider,
        model: this.config.model,
        historyLength: conversationHistory.length,
      });

      // Build messages array from conversation history
      const messages: any[] = [
        ...conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        {
          role: 'user',
          content: prompt,
        },
      ];

      // Prepare system prompt
      const systemPrompt = this.config.systemPrompt || 
        "You are a helpful AI assistant with access to various tools and capabilities.";

      // Call Claude API
      const response: any = await this.anthropic.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: systemPrompt,
        messages,
      });

      // Extract text content from response
      const content = response.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('\n');

      this.logger.info('Received response from Claude', {
        provider: this.config.provider,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      });

      return {
        content,
        usage: {
          input_tokens: response.usage.input_tokens,
          output_tokens: response.usage.output_tokens,
        },
      };
    } catch (error) {
      this.logger.error('Error querying Claude', { error });
      throw error;
    }
  }

  /**
   * Send a streaming query to Claude
   */
  async *queryStream(
    prompt: string,
    conversationHistory: Message[] = []
  ): AsyncGenerator<string, void, unknown> {
    // Ensure client is initialized
    if (!this.anthropic) {
      await this.initializeClient();
    }

    try {
      this.logger.info('Sending streaming query to Claude', {
        provider: this.config.provider,
        model: this.config.model,
        historyLength: conversationHistory.length,
      });

      // Build messages array from conversation history
      const messages: any[] = [
        ...conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        {
          role: 'user',
          content: prompt,
        },
      ];

      // Prepare system prompt
      const systemPrompt = this.config.systemPrompt || 
        "You are a helpful AI assistant with access to various tools and capabilities.";

      // Call Claude API with streaming
      const stream: any = await this.anthropic.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: systemPrompt,
        messages,
        stream: true,
      });

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && 
            chunk.delta.type === 'text_delta') {
          yield chunk.delta.text;
        }
      }

      this.logger.info('Completed streaming response from Claude');
    } catch (error) {
      this.logger.error('Error streaming from Claude', { error });
      throw error;
    }
  }
}
