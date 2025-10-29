/**
 * FetchHandler - Handles the fetch tool
 * Retrieves full document contents by ID following OpenAI MCP spec
 */

import { FetchInput } from '../schemas/index.js';
import { FetchResult, CachedDocument } from '../types/index.js';
import { Logger } from '../utils/Logger.js';
import { getErrorMessage } from '../utils/securityLimits.js';

export class FetchHandler {
  private searchCache: Map<string, CachedDocument>;
  private logger: Logger;

  constructor(
    searchCache: Map<string, CachedDocument>,
    logger: Logger
  ) {
    this.searchCache = searchCache;
    this.logger = logger;
  }

  /**
   * Handle a fetch tool request
   */
  async handle(input: FetchInput): Promise<string> {
    try {
      this.logger.info('Handling fetch request', { id: input.id });

      const cachedDoc = this.searchCache.get(input.id);

      if (!cachedDoc) {
        this.logger.info('Document not found in cache', { id: input.id });
        return JSON.stringify({
          error: `Document with id '${input.id}' not found. Please perform a search first.`
        });
      }

      // Return document in OpenAI MCP format
      const fetchResult: FetchResult = {
        id: cachedDoc.id,
        title: cachedDoc.title,
        text: cachedDoc.text,
        url: cachedDoc.url,
        metadata: cachedDoc.metadata
      };

      this.logger.info('Fetch completed', { id: input.id });
      return JSON.stringify(fetchResult);
    } catch (error) {
      this.logger.error('Error in fetch handler', { error });
      return JSON.stringify({
        error: `Error fetching document: ${getErrorMessage(error)}`
      });
    }
  }
}
