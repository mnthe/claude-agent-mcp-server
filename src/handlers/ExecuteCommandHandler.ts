/**
 * Execute Command Handler
 * Executes shell commands with security guardrails
 */

import { ExecuteCommandInput } from '../schemas/index.js';
import { Logger } from '../utils/Logger.js';
import { SecurityError, ToolExecutionError } from '../errors/index.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Command timeout in milliseconds
const COMMAND_TIMEOUT = 30000; // 30 seconds

// Maximum output size
const MAX_OUTPUT_SIZE = 100000; // 100KB

export class ExecuteCommandHandler {
  constructor(
    private logger: Logger,
    private enabled: boolean = false
  ) {}

  async handle(input: ExecuteCommandInput): Promise<string> {
    if (!this.enabled) {
      throw new SecurityError('Command execution is disabled. Set CLAUDE_ENABLE_COMMAND_EXECUTION=true to enable.');
    }

    const { command, workingDirectory } = input;

    this.logger.info('Executing command', { 
      command: command.substring(0, 100),
      workingDirectory: workingDirectory || process.cwd()
    });

    try {
      const options = {
        cwd: workingDirectory || process.cwd(),
        timeout: COMMAND_TIMEOUT,
        maxBuffer: MAX_OUTPUT_SIZE,
        env: process.env,
      };

      const { stdout, stderr } = await execAsync(command, options);

      const output = stdout || stderr || '(no output)';
      
      this.logger.info('Command executed successfully', {
        outputLength: output.length
      });

      // Truncate if too long
      if (output.length > MAX_OUTPUT_SIZE) {
        return output.substring(0, MAX_OUTPUT_SIZE) + '\n... (output truncated)';
      }

      return output;
    } catch (error: any) {
      this.logger.error('Command execution failed', { 
        error: error.message,
        code: error.code
      });

      if (error.killed) {
        throw new ToolExecutionError(
          'Command execution timed out (30 seconds)',
          'execute_command'
        );
      }

      throw new ToolExecutionError(
        `Command failed: ${error.message}\n${error.stderr || ''}`,
        'execute_command'
      );
    }
  }
}
