# Claude Agent MCP Server - Metadata Response Enhancement Plan

**Date**: 2025-10-27
**Goal**: Enhance query tool responses with structured JSON metadata similar to Perplexity MCP server
**Pattern**: Add metadata extraction for MCP server usage and tool calls

## Current State

### Current Response Format (Text-based)
```
Answer content here...

---
Session ID: abc123
Tokens - Input: 150, Output: 200
```

**Issues:**
- Hard to parse for AI agents
- Metadata mixed with content
- No structured access to MCP tool usage
- Missing: which MCP servers were used, tool call details, thinking traces

## Target State

### New Response Format (Structured JSON)

```json
{
  "content": "Answer content here...",
  "metadata": {
    "mcpServers": [
      {
        "name": "filesystem",
        "toolsUsed": ["read_file", "write_file"],
        "callsCount": 3,
        "successCount": 3,
        "errorCount": 0
      },
      {
        "name": "github",
        "toolsUsed": ["search_repositories"],
        "callsCount": 1,
        "successCount": 1,
        "errorCount": 0
      }
    ],
    "tools": [
      {
        "serverName": "filesystem",
        "toolName": "read_file",
        "status": "success",
        "executionTime": 45
      },
      {
        "serverName": "github",
        "toolName": "search_repositories",
        "status": "success",
        "executionTime": 234
      }
    ],
    "thinking": {
      "hasThinking": true,
      "thinkingCount": 2,
      "thinkingLength": 1234
    }
  },
  "session": {
    "sessionId": "abc123",
    "messageCount": 4
  },
  "usage": {
    "inputTokens": 150,
    "outputTokens": 200
  }
}
```

**Benefits:**
- Track which MCP servers are being utilized
- Understand tool usage patterns
- Debug MCP integration issues
- Monitor thinking/reasoning usage
- Better observability for Agent SDK behavior

## Implementation Plan

### Task 1: Add Metadata Types

**Files:**
- Modify: `src/types/index.ts`

Add new interfaces:
```typescript
export interface ToolCallMetadata {
  serverName: string | null;  // null for non-MCP tools
  toolName: string;
  status: 'success' | 'error';
  executionTime: number;
  error?: string;
}

export interface MCPServerUsage {
  name: string;
  toolsUsed: string[];
  callsCount: number;
  successCount: number;
  errorCount: number;
}

export interface ThinkingMetadata {
  hasThinking: boolean;
  thinkingCount: number;
  thinkingLength: number;
}

export interface FormattedQueryResponse {
  content: string;
  metadata: {
    mcpServers: MCPServerUsage[];
    tools: ToolCallMetadata[];
    thinking: ThinkingMetadata;
  };
  session?: {
    sessionId: string;
    messageCount: number;
  };
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}
```

**Commit:** `git commit -m "feat: add metadata response types"`

---

### Task 2: Extract Tool Calls from Agent SDK

**Files:**
- Modify: `src/services/ClaudeAIService.ts`

The Claude Agent SDK query() returns an AsyncGenerator<SDKMessage>. We need to track tool usage:

```typescript
export class ClaudeAIService {
  async query(
    prompt: string,
    conversationHistory: Message[] = [],
    maxTurns?: number
  ): Promise<ClaudeResponse> {
    // ... existing setup ...

    const queryStream = query({
      prompt: fullPrompt,
      options,
    });

    let content = '';
    let usage: any = undefined;
    const toolCalls: ToolCallMetadata[] = [];
    const thinkingBlocks: string[] = [];

    for await (const message of queryStream) {
      // Track assistant messages
      if (message.type === 'assistant') {
        const apiMessage = message.message;

        // Collect text content
        if (apiMessage.content && Array.isArray(apiMessage.content)) {
          for (const block of apiMessage.content) {
            if (block.type === 'text' && 'text' in block) {
              content += block.text;
            }
          }
        }

        // Track tool use from content blocks
        if (apiMessage.content) {
          for (const block of apiMessage.content) {
            if (block.type === 'tool_use') {
              // Tool use detected (will be followed by tool_result)
              const toolName = block.name;
              const [serverName, actualToolName] = this.parseToolName(toolName);

              // We'll track timing when we see the result
              toolCalls.push({
                serverName,
                toolName: actualToolName || toolName,
                status: 'pending' as any, // Will update with result
                executionTime: 0
              });
            }
          }
        }

        // Capture usage
        if (apiMessage.usage) {
          usage = {
            input_tokens: apiMessage.usage.input_tokens || 0,
            output_tokens: apiMessage.usage.output_tokens || 0,
          };
        }
      }

      // Track thinking blocks
      if (message.type === 'thinking') {
        thinkingBlocks.push(message.thinking || '');
      }
    }

    return {
      content,
      usage,
      toolCalls,
      thinking: {
        hasThinking: thinkingBlocks.length > 0,
        thinkingCount: thinkingBlocks.length,
        thinkingLength: thinkingBlocks.reduce((sum, t) => sum + t.length, 0)
      }
    };
  }

  private parseToolName(fullName: string): [string | null, string | null] {
    // Extract server name from MCP tool names
    // Format: "servername__toolname" or just "toolname"
    const parts = fullName.split('__');
    if (parts.length >= 2) {
      return [parts[0], parts.slice(1).join('__')];
    }
    return [null, fullName];
  }
}
```

**Note:** This is approximate - Claude Agent SDK may not expose tool_use blocks directly. Need to verify SDK API.

**Commit:** `git commit -m "feat: extract tool calls and thinking from Agent SDK stream"`

---

### Task 3: Create ResponseFormatter

**Files:**
- Create: `src/utils/ResponseFormatter.ts`

Format collected metadata:
```typescript
import { FormattedQueryResponse, ToolCallMetadata, MCPServerUsage, ThinkingMetadata } from '../types/index.js';

export class ResponseFormatter {
  format(
    content: string,
    toolCalls: ToolCallMetadata[],
    thinking: ThinkingMetadata,
    sessionId?: string,
    messageCount?: number,
    usage?: { input_tokens: number; output_tokens: number }
  ): FormattedQueryResponse {
    return {
      content,
      metadata: {
        mcpServers: this.aggregateMCPServerUsage(toolCalls),
        tools: toolCalls,
        thinking
      },
      ...(sessionId && {
        session: {
          sessionId,
          messageCount: messageCount || 0
        }
      }),
      ...(usage && {
        usage: {
          inputTokens: usage.input_tokens,
          outputTokens: usage.output_tokens
        }
      })
    };
  }

  private aggregateMCPServerUsage(toolCalls: ToolCallMetadata[]): MCPServerUsage[] {
    const mcpTools = toolCalls.filter(t => t.serverName !== null);
    const serverMap = new Map<string, {
      tools: Set<string>;
      total: number;
      success: number;
      error: number;
    }>();

    for (const tool of mcpTools) {
      if (!tool.serverName) continue;

      if (!serverMap.has(tool.serverName)) {
        serverMap.set(tool.serverName, {
          tools: new Set(),
          total: 0,
          success: 0,
          error: 0
        });
      }

      const stats = serverMap.get(tool.serverName)!;
      stats.tools.add(tool.toolName);
      stats.total++;
      if (tool.status === 'success') stats.success++;
      if (tool.status === 'error') stats.error++;
    }

    return Array.from(serverMap.entries()).map(([name, stats]) => ({
      name,
      toolsUsed: Array.from(stats.tools),
      callsCount: stats.total,
      successCount: stats.success,
      errorCount: stats.error
    }));
  }
}
```

**Commit:** `git commit -m "feat: add ResponseFormatter for metadata extraction"`

---

### Task 4: Update QueryHandler

**Files:**
- Modify: `src/handlers/QueryHandler.ts`

Use ResponseFormatter:
```typescript
import { ResponseFormatter } from '../utils/ResponseFormatter.js';

export class QueryHandler {
  private responseFormatter: ResponseFormatter;

  constructor(
    private claudeAI: ClaudeAIService,
    private conversationManager: ConversationManager | null,
    private logger: Logger
  ) {
    this.responseFormatter = new ResponseFormatter();
  }

  async handle(input: QueryInput): Promise<string> {
    // ... existing validation and session logic ...

    try {
      // Query Claude
      const response = await this.claudeAI.query(prompt, conversationHistory);

      // Save conversation if enabled
      if (this.conversationManager && effectiveSessionId) {
        this.conversationManager.addMessage(effectiveSessionId, {
          role: 'user',
          content: prompt,
        });
        this.conversationManager.addMessage(effectiveSessionId, {
          role: 'assistant',
          content: response.content,
        });
      }

      // Format response with metadata
      const messageCount = this.conversationManager?.getHistory(effectiveSessionId || '').length || 0;
      const formatted = this.responseFormatter.format(
        response.content,
        response.toolCalls || [],
        response.thinking || { hasThinking: false, thinkingCount: 0, thinkingLength: 0 },
        effectiveSessionId,
        messageCount,
        response.usage
      );

      this.logger.info('Query completed successfully');
      return JSON.stringify(formatted, null, 2);
    } catch (error) {
      // ... error handling ...
    }
  }
}
```

**Commit:** `git commit -m "feat: return structured JSON with metadata in QueryHandler"`

---

## Alternative: Backward Compatible Approach

Add `responseFormat` parameter to maintain compatibility:

**Query Schema:**
```typescript
export const QuerySchema = z.object({
  prompt: z.string(),
  sessionId: z.string().optional(),
  parts: z.array(...).optional(),
  responseFormat: z.enum(['text', 'json']).optional().default('text')
});
```

**QueryHandler:**
```typescript
async handle(input: QueryInput): Promise<string> {
  // ... execute query ...

  if (input.responseFormat === 'json') {
    const formatted = this.responseFormatter.format(...);
    return JSON.stringify(formatted, null, 2);
  } else {
    // Keep current text format
    return this.formatResponseText(response, sessionId, usage);
  }
}
```

**Benefits:**
- No breaking changes
- Gradual migration path
- Users can choose format

**Recommendation:** Use backward compatible approach

---

## Summary

**Changes Required:**
1. New types for tool calls, MCP usage, thinking
2. Extract tool usage from Agent SDK stream
3. Create ResponseFormatter utility
4. Update QueryHandler to return JSON

**Backward Compatibility:**
- Option 1: Breaking change (simpler)
- Option 2: Add responseFormat parameter (safer)

**Estimated Effort:** 4-6 tasks, 1-2 days

**Note:** Need to verify Claude Agent SDK API for tool_use block access
