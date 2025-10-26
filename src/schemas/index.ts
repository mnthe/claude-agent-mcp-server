/**
 * Zod validation schemas for tool inputs
 */

import { z } from "zod";

export const QuerySchema = z.object({
  prompt: z.string().describe("The text prompt to send to Claude"),
  sessionId: z.string().optional().describe("Optional conversation session ID for multi-turn conversations"),
});

export const ExecuteCommandSchema = z.object({
  command: z.string().describe("The shell command to execute"),
  workingDirectory: z.string().optional().describe("Working directory for command execution"),
});

export const ReadFileSchema = z.object({
  path: z.string().describe("Path to the file to read"),
});

export const WriteFileSchema = z.object({
  path: z.string().describe("Path to the file to write"),
  content: z.string().describe("Content to write to the file"),
});

export const WebFetchSchema = z.object({
  url: z.string().describe("HTTPS URL to fetch (HTTP not allowed for security)"),
  extract: z.boolean().optional().describe("Extract main content from HTML (default: true)"),
});

export type QueryInput = z.infer<typeof QuerySchema>;
export type ExecuteCommandInput = z.infer<typeof ExecuteCommandSchema>;
export type ReadFileInput = z.infer<typeof ReadFileSchema>;
export type WriteFileInput = z.infer<typeof WriteFileSchema>;
export type WebFetchInput = z.infer<typeof WebFetchSchema>;
