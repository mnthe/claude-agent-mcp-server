/**
 * Tests for refactored security utilities
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  validatePrompt,
  validateQuery,
  getErrorMessage,
  SecurityLimits,
} from '../src/utils/securityLimits.js';

describe('validatePrompt', () => {
  test('should accept valid prompt', () => {
    assert.doesNotThrow(() => {
      validatePrompt('This is a valid prompt');
    });
  });

  test('should throw error for empty prompt', () => {
    assert.throws(
      () => validatePrompt(''),
      { message: 'Prompt cannot be empty' }
    );
  });

  test('should throw error for whitespace-only prompt', () => {
    assert.throws(
      () => validatePrompt('   '),
      { message: 'Prompt cannot be empty' }
    );
  });

  test('should throw error for prompt exceeding max length', () => {
    const longPrompt = 'a'.repeat(SecurityLimits.MAX_PROMPT_LENGTH + 1);
    assert.throws(
      () => validatePrompt(longPrompt),
      {
        message: new RegExp(`Prompt too long: ${longPrompt.length} characters \\(max: ${SecurityLimits.MAX_PROMPT_LENGTH}\\)`)
      }
    );
  });

  test('should accept prompt at max length', () => {
    const maxLengthPrompt = 'a'.repeat(SecurityLimits.MAX_PROMPT_LENGTH);
    assert.doesNotThrow(() => {
      validatePrompt(maxLengthPrompt);
    });
  });
});

describe('validateQuery', () => {
  test('should accept valid query', () => {
    assert.doesNotThrow(() => {
      validateQuery('search query');
    });
  });

  test('should throw error for empty query', () => {
    assert.throws(
      () => validateQuery(''),
      { message: 'Query cannot be empty' }
    );
  });

  test('should throw error for whitespace-only query', () => {
    assert.throws(
      () => validateQuery('   '),
      { message: 'Query cannot be empty' }
    );
  });

  test('should throw error for query exceeding max length', () => {
    const longQuery = 'a'.repeat(SecurityLimits.MAX_QUERY_LENGTH + 1);
    assert.throws(
      () => validateQuery(longQuery),
      {
        message: new RegExp(`Query too long: ${longQuery.length} characters \\(max: ${SecurityLimits.MAX_QUERY_LENGTH}\\)`)
      }
    );
  });

  test('should accept query at max length', () => {
    const maxLengthQuery = 'a'.repeat(SecurityLimits.MAX_QUERY_LENGTH);
    assert.doesNotThrow(() => {
      validateQuery(maxLengthQuery);
    });
  });
});

describe('getErrorMessage', () => {
  test('should extract message from Error instance', () => {
    const error = new Error('Test error message');
    assert.strictEqual(getErrorMessage(error), 'Test error message');
  });

  test('should convert string to string', () => {
    assert.strictEqual(getErrorMessage('string error'), 'string error');
  });

  test('should convert number to string', () => {
    assert.strictEqual(getErrorMessage(123), '123');
  });

  test('should convert object to string', () => {
    const obj = { message: 'error' };
    assert.strictEqual(getErrorMessage(obj), '[object Object]');
  });

  test('should handle null', () => {
    assert.strictEqual(getErrorMessage(null), 'null');
  });

  test('should handle undefined', () => {
    assert.strictEqual(getErrorMessage(undefined), 'undefined');
  });

  test('should handle custom error types', () => {
    class CustomError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'CustomError';
      }
    }
    const error = new CustomError('Custom error message');
    assert.strictEqual(getErrorMessage(error), 'Custom error message');
  });
});
