/**
 * SearchHandler - Handles the search tool
 * Returns structured search results following OpenAI MCP spec
 */

import { SearchInput } from '../schemas/index.js';
import { SearchResult, CachedDocument } from '../types/index.js';
import { ClaudeAIService } from '../services/ClaudeAIService.js';
import { Logger } from '../utils/Logger.js';

export class SearchHandler {
  private claudeAI: ClaudeAIService;
  private searchCache: Map<string, CachedDocument>;
  private logger: Logger;

  constructor(
    claudeAI: ClaudeAIService,
    searchCache: Map<string, CachedDocument>,
    logger: Logger
  ) {
    this.claudeAI = claudeAI;
    this.searchCache = searchCache;
    this.logger = logger;
  }

  /**
   * Handle a search tool request
   */
  async handle(input: SearchInput): Promise<string> {
    try {
      this.logger.info('Handling search request', { query: input.query });

      const searchPrompt = `Search and provide information about: ${input.query}.
Return your response as a structured list of relevant topics or documents with brief descriptions.`;

      const response = await this.claudeAI.query(searchPrompt);
      const responseText = response.content;

      // Parse response and create structured results
      const results: SearchResult[] = this.parseSearchResults(responseText, input.query);

      // Cache documents for fetch
      results.forEach((result) => {
        const cachedDoc: CachedDocument = {
          id: result.id,
          title: result.title,
          text: responseText, // Store full response as document text
          url: result.url,
          metadata: {
            query: input.query,
            timestamp: new Date().toISOString(),
          }
        };
        this.searchCache.set(result.id, cachedDoc);
      });

      this.logger.info('Search completed', { resultCount: results.length });
      return JSON.stringify({ results });
    } catch (error) {
      this.logger.error('Error in search handler', { error });
      const errorMessage = error instanceof Error ? error.message : String(error);
      return JSON.stringify({
        results: [],
        error: `Error searching with Claude: ${errorMessage}`
      });
    }
  }

  /**
   * Parse Claude API response into structured search results
   */
  private parseSearchResults(responseText: string, query: string): SearchResult[] {
    // Generate synthetic search results from the response
    const lines = responseText.split('\n').filter(line => line.trim());
    const results: SearchResult[] = [];

    // Create up to 3 results from the response
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const line = lines[i];
      if (line.length > 10) {
        results.push({
          id: `doc-${Date.now()}-${i}`,
          title: line.substring(0, 100).trim(),
          url: `https://claude-search/${query.replace(/\s+/g, '-')}/${i}`,
        });
      }
    }

    // Ensure at least one result
    if (results.length === 0) {
      results.push({
        id: `doc-${Date.now()}-0`,
        title: query,
        url: `https://claude-search/${query.replace(/\s+/g, '-')}`,
      });
    }

    return results;
  }
}
