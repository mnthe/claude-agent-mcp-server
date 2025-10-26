/**
 * Read File Handler
 * Reads files with security validation
 */

import { ReadFileInput } from '../schemas/index.js';
import { Logger } from '../utils/Logger.js';
import { validateFilePath, checkFileExists } from '../utils/fileSecurity.js';
import { SecurityError, ToolExecutionError } from '../errors/index.js';
import * as fs from 'fs/promises';

// Maximum file size to read (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export class ReadFileHandler {
  constructor(private logger: Logger) {}

  async handle(input: ReadFileInput): Promise<string> {
    const { path: filePath } = input;

    this.logger.info('Reading file', { filePath });

    try {
      // Validate file path for security
      const validatedPath = validateFilePath(filePath);

      // Check if file exists
      if (!checkFileExists(validatedPath)) {
        throw new ToolExecutionError(
          `File not found: ${filePath}`,
          'read_file'
        );
      }

      // Check file size
      const stats = await fs.stat(validatedPath);
      if (stats.size > MAX_FILE_SIZE) {
        throw new ToolExecutionError(
          `File too large: ${stats.size} bytes (max: ${MAX_FILE_SIZE} bytes)`,
          'read_file'
        );
      }

      // Read file content
      const content = await fs.readFile(validatedPath, 'utf-8');

      this.logger.info('File read successfully', {
        filePath: validatedPath,
        size: stats.size
      });

      return content;
    } catch (error) {
      if (error instanceof SecurityError || error instanceof ToolExecutionError) {
        throw error;
      }

      this.logger.error('File read failed', { 
        error: error instanceof Error ? error.message : String(error)
      });

      throw new ToolExecutionError(
        `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
        'read_file'
      );
    }
  }
}
