/**
 * Query Handler - main agentic entrypoint
 */

import { QueryInput } from '../schemas/index.js';
import { ClaudeAIService } from '../services/ClaudeAIService.js';
import { ConversationManager } from '../managers/ConversationManager.js';
import { Logger } from '../utils/Logger.js';
import { validatePrompt, validateMultimodalParts, sanitizeForLogging } from '../utils/securityLimits.js';

export class QueryHandler {
  constructor(
    private claudeAI: ClaudeAIService,
    private conversationManager: ConversationManager | null,
    private logger: Logger
  ) {}

  async handle(input: QueryInput): Promise<string> {
    const { prompt, sessionId, parts } = input;

    // Validate input
    validatePrompt(prompt);
    if (parts && parts.length > 0) {
      validateMultimodalParts(parts);
    }

    this.logger.info('Handling query', {
      promptLength: prompt.length,
      sessionId: sessionId || 'none',
      partsCount: parts?.length || 0,
    });

    try {
      // Get conversation history if session ID provided
      let conversationHistory: import('../types/index.js').Message[] = [];
      let effectiveSessionId = sessionId;

      if (this.conversationManager) {
        if (sessionId) {
          conversationHistory = this.conversationManager.getHistory(sessionId);
          if (conversationHistory.length === 0) {
            this.logger.info(`Session ${sessionId} not found, creating new session`);
            effectiveSessionId = this.conversationManager.createSession();
          }
        } else {
          effectiveSessionId = this.conversationManager.createSession();
        }
      }

      // Query Claude
      const response = await this.claudeAI.query(prompt, conversationHistory);

      // Save conversation if enabled
      if (this.conversationManager && effectiveSessionId) {
        this.conversationManager.addMessage(effectiveSessionId, {
          role: 'user',
          content: prompt,
        });
        this.conversationManager.addMessage(effectiveSessionId, {
          role: 'assistant',
          content: response.content,
        });
      }

      // Format response
      const result = this.formatResponse(
        response.content,
        effectiveSessionId
      );

      this.logger.info('Query completed successfully');
      return result;
    } catch (error) {
      this.logger.error('Error handling query', sanitizeForLogging({ error }));
      throw error;
    }
  }

  private formatResponse(
    content: string,
    sessionId: string | undefined
  ): string {
    const parts: string[] = [content];

    if (sessionId) {
      parts.push(`\n\n---\nSession ID: ${sessionId}`);
    }

    return parts.join('');
  }
}
