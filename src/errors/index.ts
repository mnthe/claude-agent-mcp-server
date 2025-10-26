/**
 * Custom error classes for Claude Agent MCP Server
 */

export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

export class ToolExecutionError extends Error {
  constructor(message: string, public toolName: string) {
    super(message);
    this.name = 'ToolExecutionError';
  }
}

export class ModelBehaviorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ModelBehaviorError';
  }
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}
