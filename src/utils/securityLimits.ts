/**
 * Security limits for local MCP server
 *
 * These limits prevent accidental resource exhaustion and errors
 * in local deployment scenarios. They are designed to be generous
 * enough for normal use while preventing common mistakes.
 */

export const SecurityLimits = {
  // Input size limits (prevent accidental large inputs that cause API errors)
  MAX_PROMPT_LENGTH: 500_000,  // 500KB - enough for large documents
  MAX_QUERY_LENGTH: 50_000,     // 50KB - allow complex search queries

  // Cache limits (prevent memory exhaustion from search results)
  MAX_CACHE_SIZE: 100,          // Maximum 100 cached search results
  CACHE_TTL_MS: 3_600_000,      // 1 hour - auto-cleanup old entries

  // Multimodal limits (aligned with Claude API limits)
  MAX_MULTIMODAL_PARTS: 20,              // Reasonable number of parts
  MAX_BASE64_SIZE: 20 * 1024 * 1024,     // 20MB - Claude's actual limit
};

/**
 * Generic validation function for text input
 */
function validateTextInput(
  input: string,
  fieldName: string,
  maxLength: number
): void {
  if (!input || input.trim().length === 0) {
    throw new Error(`${fieldName} cannot be empty`);
  }

  if (input.length > maxLength) {
    throw new Error(
      `${fieldName} too long: ${input.length} characters (max: ${maxLength})`
    );
  }
}

/**
 * Validate prompt input
 */
export function validatePrompt(prompt: string): void {
  validateTextInput(prompt, 'Prompt', SecurityLimits.MAX_PROMPT_LENGTH);
}

/**
 * Validate search query
 */
export function validateQuery(query: string): void {
  validateTextInput(query, 'Query', SecurityLimits.MAX_QUERY_LENGTH);
}

/**
 * Validate multimodal parts
 */
export function validateMultimodalParts(parts: any[]): void {
  if (parts.length > SecurityLimits.MAX_MULTIMODAL_PARTS) {
    throw new Error(
      `Too many multimodal parts: ${parts.length} (max: ${SecurityLimits.MAX_MULTIMODAL_PARTS})`
    );
  }

  // Validate base64 data size
  for (const part of parts) {
    if (part.inlineData?.data) {
      const base64Size = part.inlineData.data.length;
      if (base64Size > SecurityLimits.MAX_BASE64_SIZE) {
        throw new Error(
          `Base64 data too large: ${(base64Size / 1024 / 1024).toFixed(2)}MB (max: 20MB)`
        );
      }
    }
  }
}

/**
 * Sanitize data for logging (remove/truncate sensitive information)
 *
 * This prevents API keys, tokens, and large base64 data from
 * appearing in log files.
 */
export function sanitizeForLogging(data: any): any {
  if (typeof data === 'string') {
    let sanitized = data;

    // Mask API keys
    sanitized = sanitized.replace(/sk-ant-api\d+-[\w-]+/gi, 'sk-ant-***');
    sanitized = sanitized.replace(/Bearer\s+[\w-]+/gi, 'Bearer ***');

    // Truncate very long strings (likely base64 or large content)
    if (sanitized.length > 200) {
      sanitized = `${sanitized.substring(0, 100)}...[${sanitized.length} chars total]...${sanitized.substring(sanitized.length - 50)}`;
    }

    return sanitized;
  }

  if (typeof data === 'object' && data !== null) {
    const sanitized: any = Array.isArray(data) ? [] : {};

    for (const key in data) {
      const lowerKey = key.toLowerCase();

      // Completely hide sensitive fields
      if (lowerKey.includes('key') ||
          lowerKey.includes('token') ||
          lowerKey.includes('secret') ||
          lowerKey.includes('password')) {
        sanitized[key] = '***';
      }
      // Truncate large data fields
      else if (lowerKey === 'data' && typeof data[key] === 'string' && data[key].length > 200) {
        sanitized[key] = `[${data[key].length} chars]`;
      }
      // Recursively sanitize nested objects
      else {
        sanitized[key] = sanitizeForLogging(data[key]);
      }
    }

    return sanitized;
  }

  return data;
}

/**
 * Extract error message from an unknown error value
 */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
