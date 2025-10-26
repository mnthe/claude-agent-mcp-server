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

export const SearchSchema = z.object({
  query: z.string().describe("The search query"),
});

export const FetchSchema = z.object({
  id: z.string().describe("The unique identifier for the document to fetch"),
});

export type QueryInput = z.infer<typeof QuerySchema>;
export type SearchInput = z.infer<typeof SearchSchema>;
export type FetchInput = z.infer<typeof FetchSchema>;
