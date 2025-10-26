/**
 * Write File Handler
 * Writes files with security validation
 */

import { WriteFileInput } from '../schemas/index.js';
import { Logger } from '../utils/Logger.js';
import { validateFilePath, checkFileWritable } from '../utils/fileSecurity.js';
import { SecurityError, ToolExecutionError } from '../errors/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';

// Maximum content size to write (10MB)
const MAX_CONTENT_SIZE = 10 * 1024 * 1024;

export class WriteFileHandler {
  constructor(
    private logger: Logger,
    private enabled: boolean = false
  ) {}

  async handle(input: WriteFileInput): Promise<string> {
    if (!this.enabled) {
      throw new SecurityError('File writing is disabled. Set CLAUDE_ENABLE_FILE_WRITE=true to enable.');
    }

    const { path: filePath, content } = input;

    this.logger.info('Writing file', { 
      filePath,
      contentLength: content.length
    });

    try {
      // Check content size
      if (content.length > MAX_CONTENT_SIZE) {
        throw new ToolExecutionError(
          `Content too large: ${content.length} bytes (max: ${MAX_CONTENT_SIZE} bytes)`,
          'write_file'
        );
      }

      // Validate file path for security
      const validatedPath = validateFilePath(filePath);

      // Ensure directory exists
      const dir = path.dirname(validatedPath);
      await fs.mkdir(dir, { recursive: true });

      // Check if writable
      if (!checkFileWritable(validatedPath)) {
        throw new ToolExecutionError(
          `File is not writable: ${filePath}`,
          'write_file'
        );
      }

      // Write file content
      await fs.writeFile(validatedPath, content, 'utf-8');

      this.logger.info('File written successfully', {
        filePath: validatedPath,
        size: content.length
      });

      return `File written successfully: ${filePath} (${content.length} bytes)`;
    } catch (error) {
      if (error instanceof SecurityError || error instanceof ToolExecutionError) {
        throw error;
      }

      this.logger.error('File write failed', { 
        error: error instanceof Error ? error.message : String(error)
      });

      throw new ToolExecutionError(
        `Failed to write file: ${error instanceof Error ? error.message : String(error)}`,
        'write_file'
      );
    }
  }
}
