/**
 * File Security Validator
 * Validates local file paths for security before use in file operations
 */

import * as path from 'path';
import * as fs from 'fs';
import { SecurityError } from '../errors/index.js';

/**
 * Executable file extensions that should be rejected
 */
const EXECUTABLE_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.com', '.msi', '.app', '.dmg', '.pkg',
  '.deb', '.rpm', '.sh', '.bash', '.zsh', '.fish', '.ps1', '.psm1',
  '.dll', '.so', '.dylib', '.jar', '.apk', '.ipa', '.vbs', '.wsf',
  '.scr', '.pif', '.gadget', '.msp', '.cpl', '.lnk', '.run',
]);

/**
 * Get default safe directories for file access
 */
function getDefaultSafeDirectories(): string[] {
  const dirs: string[] = [
    process.cwd(), // Current working directory
  ];

  // Add user home directory if available
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  if (homeDir) {
    // Add common user directories
    dirs.push(
      path.join(homeDir, 'Documents'),
      path.join(homeDir, 'Downloads'),
      path.join(homeDir, 'Desktop'),
    );
  }

  return dirs;
}

/**
 * Configuration for file security validation
 */
export interface FileSecurityConfig {
  /**
   * Additional safe directories to allow (beyond defaults)
   */
  additionalSafeDirectories?: string[];
  
  /**
   * Whether to allow all directories (dangerous, for testing only)
   */
  allowAllDirectories?: boolean;
}

/**
 * Validate a file extension is not executable
 */
export function validateFileExtension(filePath: string): void {
  const ext = path.extname(filePath).toLowerCase();
  if (EXECUTABLE_EXTENSIONS.has(ext)) {
    throw new SecurityError(
      `Executable file type not allowed: ${ext}. Only non-executable files are permitted.`
    );
  }
}

/**
 * Resolve and validate a file path for security
 * - Prevents path traversal attacks
 * - Converts to absolute path
 * - Validates against directory whitelist
 * - Checks for executable extensions
 */
export function validateFilePath(
  filePath: string,
  config: FileSecurityConfig = {}
): string {
  // Convert to absolute path to prevent path traversal
  const absolutePath = path.resolve(filePath);
  
  // Check for executable extensions
  validateFileExtension(absolutePath);
  
  // If allowAllDirectories is true (testing only), skip directory check
  if (config.allowAllDirectories) {
    return absolutePath;
  }
  
  // Build list of safe directories
  const safeDirectories = [
    ...getDefaultSafeDirectories(),
    ...(config.additionalSafeDirectories || []),
  ].map(dir => path.resolve(dir)); // Normalize all to absolute paths
  
  // Check if the file is within any safe directory
  const isInSafeDirectory = safeDirectories.some(safeDir => {
    // Check if the absolute path starts with the safe directory
    return absolutePath.startsWith(safeDir + path.sep) || absolutePath === safeDir;
  });
  
  if (!isInSafeDirectory) {
    throw new SecurityError(
      `File path is outside allowed directories. File: ${absolutePath}. ` +
      `Allowed directories: ${safeDirectories.join(', ')}`
    );
  }
  
  return absolutePath;
}

/**
 * Check if a file exists and is readable
 */
export function checkFileExists(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a file is writable
 */
export function checkFileWritable(filePath: string): boolean {
  try {
    // Check if file exists and is writable
    if (fs.existsSync(filePath)) {
      fs.accessSync(filePath, fs.constants.W_OK);
      return true;
    }
    
    // Check if directory is writable for new file creation
    const dir = path.dirname(filePath);
    fs.accessSync(dir, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}
