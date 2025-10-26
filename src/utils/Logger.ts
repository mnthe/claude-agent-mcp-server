/**
 * Logger utility for Claude Agent MCP Server
 */

import * as fs from 'fs';
import * as path from 'path';

export class Logger {
  private logDir: string;
  private disableLogging: boolean;
  private logToStderr: boolean;

  constructor(logDir?: string, disableLogging: boolean = false, logToStderr: boolean = false) {
    this.logDir = logDir || './logs';
    this.disableLogging = disableLogging;
    this.logToStderr = logToStderr;

    if (!disableLogging && !logToStderr) {
      // Ensure log directory exists
      try {
        if (!fs.existsSync(this.logDir)) {
          fs.mkdirSync(this.logDir, { recursive: true });
        }
      } catch (error) {
        console.error(`Failed to create log directory: ${error}`);
        this.disableLogging = true;
      }
    }
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level}] ${message}${dataStr}\n`;
  }

  private writeLog(filename: string, message: string): void {
    if (this.disableLogging) return;

    if (this.logToStderr) {
      process.stderr.write(message);
      return;
    }

    try {
      const filepath = path.join(this.logDir, filename);
      fs.appendFileSync(filepath, message, 'utf8');
    } catch (error) {
      // Silently fail if logging fails to avoid disrupting the main application
    }
  }

  info(message: string, data?: any): void {
    const formatted = this.formatMessage('INFO', message, data);
    this.writeLog('general.log', formatted);
  }

  error(message: string, data?: any): void {
    const formatted = this.formatMessage('ERROR', message, data);
    this.writeLog('general.log', formatted);
    if (this.logToStderr || this.disableLogging) {
      console.error(formatted);
    }
  }

  reasoning(message: string, data?: any): void {
    const formatted = this.formatMessage('REASONING', message, data);
    this.writeLog('reasoning.log', formatted);
  }

  toolCall(toolName: string, args: any): void {
    const formatted = this.formatMessage('TOOL_CALL', `Tool: ${toolName}`, args);
    this.writeLog('general.log', formatted);
  }

  toolResult(toolName: string, result: any): void {
    const formatted = this.formatMessage('TOOL_RESULT', `Tool: ${toolName}`, result);
    this.writeLog('general.log', formatted);
  }
}
