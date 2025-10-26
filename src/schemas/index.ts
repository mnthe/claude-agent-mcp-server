/**
 * Zod validation schemas for tool inputs
 */

import { z } from "zod";

// Schema for inline data (base64 encoded files - images and PDFs)
const InlineDataSchema = z.object({
  mimeType: z.string().describe("MIME type of the file (e.g., 'image/jpeg', 'image/png', 'application/pdf')"),
  data: z.string().describe("Base64 encoded file data"),
});

// Schema for file data (URIs for images and PDFs)
const FileDataSchema = z.object({
  mimeType: z.string().describe("MIME type of the file (image/* or application/pdf)"),
  fileUri: z.string().describe("URI of the file (file:// for local files, https:// for public URLs)"),
});

// Schema for a single multimodal part
const MultimodalPartSchema = z.object({
  text: z.string().optional().describe("Text content"),
  inlineData: InlineDataSchema.optional().describe("Inline base64 encoded file data"),
  fileData: FileDataSchema.optional().describe("File URI for local files, public URLs, or cloud storage"),
});

export const QuerySchema = z.object({
  prompt: z.string().describe("The text prompt to send to Claude"),
  sessionId: z.string().optional().describe("Optional conversation session ID for multi-turn conversations"),
  parts: z.array(MultimodalPartSchema).optional().describe("Optional multimodal content parts (images, text, PDF documents)"),
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
