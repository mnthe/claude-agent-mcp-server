/**
 * Claude AI Service - wrapper for Anthropic SDK
 */

import Anthropic from '@anthropic-ai/sdk';
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
  private client: Anthropic;
  private config: ClaudeAgentConfig;
  private logger: Logger;

  constructor(config: ClaudeAgentConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
  }

  /**
   * Send a query to Claude with conversation history
   */
  async query(
    prompt: string,
    conversationHistory: Message[] = []
  ): Promise<ClaudeResponse> {
    try {
      this.logger.info('Sending query to Claude', {
        model: this.config.model,
        historyLength: conversationHistory.length,
      });

      // Build messages array from conversation history
      const messages: Anthropic.MessageParam[] = [
        ...conversationHistory.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
        {
          role: 'user' as const,
          content: prompt,
        },
      ];

      // Prepare system prompt
      const systemPrompt = this.config.systemPrompt || 
        "You are a helpful AI assistant with access to various tools and capabilities.";

      // Call Claude API
      const response = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: systemPrompt,
        messages,
      });

      // Extract text content from response
      const content = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map(block => block.text)
        .join('\n');

      this.logger.info('Received response from Claude', {
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
    try {
      this.logger.info('Sending streaming query to Claude', {
        model: this.config.model,
        historyLength: conversationHistory.length,
      });

      // Build messages array from conversation history
      const messages: Anthropic.MessageParam[] = [
        ...conversationHistory.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
        {
          role: 'user' as const,
          content: prompt,
        },
      ];

      // Prepare system prompt
      const systemPrompt = this.config.systemPrompt || 
        "You are a helpful AI assistant with access to various tools and capabilities.";

      // Call Claude API with streaming
      const stream = await this.client.messages.create({
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
