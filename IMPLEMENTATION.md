# Implementation Guide

This document provides technical details about the claude-agent-mcp-server implementation.

## Architecture Overview

The claude-agent-mcp-server follows a clean, modular architecture for information retrieval and conversation management:

```
┌─────────────────────────────────────────────────────────┐
│                    MCP Client                           │
│              (Claude Desktop, Claude Code)               │
└────────────────────┬────────────────────────────────────┘
                     │ JSON-RPC over stdio
                     ↓
┌─────────────────────────────────────────────────────────┐
│              ClaudeAgentMCPServer                       │
│  - Registers tools with MCP protocol                    │
│  - Routes tool calls to handlers                        │
│  - Manages stdio transport                              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────┐
│                 QueryHandler                            │
│  - Validates input with Zod schemas                     │
│  - Manages conversation flow                            │
│  - Formats responses                                    │
└────────────────────┬────────────────────────────────────┘
                     │
          ┌──────────┴──────────┐
          ↓                     ↓
┌──────────────────┐  ┌────────────────────┐
│  ClaudeAIService │  │ ConversationManager│
│  - Anthropic SDK │  │  - Session mgmt    │
│  - API calls     │  │  - History storage │
│  - Streaming     │  │  - Auto cleanup    │
└──────────────────┘  └────────────────────┘
```

## Core Components

### 1. Configuration System (`src/config/`)

**Purpose**: Load and validate environment variables

**Key Features**:
- Required: `ANTHROPIC_API_KEY`
- Optional: Model settings, conversation settings, logging settings
- JSON parsing for complex configurations
- Validation with process exit on errors

**Example**:
```typescript
export function loadConfig(): ClaudeAgentConfig {
  const apiKey = process.env.ANTHROPIC_API_KEY || "";
  if (!apiKey) {
    console.error("Error: ANTHROPIC_API_KEY required");
    process.exit(1);
  }
  // ... load other settings
}
```

### 2. Type System (`src/types/`)

**Purpose**: TypeScript type definitions for type safety

**Files**:
- `config.ts`: Configuration types
- `conversation.ts`: Message and Session types
- `mcp.ts`: MCP protocol types
- `index.ts`: Exports all types

**Example**:
```typescript
export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface Session {
  id: string;
  messages: Message[];
  lastActivity: number;
}
```

### 3. Schema Validation (`src/schemas/`)

**Purpose**: Runtime validation of tool inputs using Zod

**Schemas**:
- `QuerySchema`: Validates query tool inputs
- `SearchSchema`: Validates search tool inputs
- `FetchSchema`: Validates fetch tool inputs

**Example**:
```typescript
export const QuerySchema = z.object({
  prompt: z.string().describe("The text prompt"),
  sessionId: z.string().optional().describe("Session ID"),
  parts: z.array(z.object({...})).optional().describe("Multimodal content parts"),
});

export const SearchSchema = z.object({
  query: z.string().describe("The search query"),
});

export const FetchSchema = z.object({
  id: z.string().describe("Document ID to fetch"),
});
```

### 4. Conversation Manager (`src/managers/`)

**Purpose**: Manage multi-turn conversation sessions

**Features**:
- **Session Creation**: Generate cryptographically secure session IDs
- **History Management**: Store messages with role and content
- **Size Limiting**: Keep only most recent N messages
- **Auto Cleanup**: Remove expired sessions every minute
- **Activity Tracking**: Update lastActivity timestamp

**Algorithm**:
```typescript
class ConversationManager {
  // Create session
  createSession() -> sessionId
  
  // Get/update session
  getSession(sessionId) -> Session | undefined
  
  // Add message to history
  addMessage(sessionId, message) -> void
  
  // Cleanup expired
  cleanupExpiredSessions() -> void (runs every 60s)
}
```

### 5. Claude AI Service (`src/services/`)

**Purpose**: Wrapper for Anthropic SDK

**Features**:
- **Message Formatting**: Convert conversation history to API format
- **System Prompt**: Inject custom or default system prompt
- **API Calls**: Handle authentication and error handling
- **Streaming**: Support for streaming responses (queryStream)
- **Token Tracking**: Return usage statistics

**Example**:
```typescript
async query(prompt: string, history: Message[]): Promise<ClaudeResponse> {
  const messages = [
    ...history.map(msg => ({ role: msg.role, content: msg.content })),
    { role: 'user', content: prompt }
  ];
  
  const response = await this.client.messages.create({
    model: this.config.model,
    max_tokens: this.config.maxTokens,
    temperature: this.config.temperature,
    system: this.config.systemPrompt || "Default prompt",
    messages,
  });
  
  return { content, usage };
}
```

### 6. Query Handler (`src/handlers/`)

**Purpose**: Orchestrate query processing

**Flow**:
1. Parse and validate input
2. Get or create session (if conversations enabled)
3. Retrieve conversation history
4. Call Claude service
5. Update conversation history
6. Format response with metadata

**Example**:
```typescript
async handle(input: QueryInput): Promise<string> {
  // Get/create session
  let sessionId = input.sessionId || this.conversationManager.createSession();
  
  // Get history
  const history = this.conversationManager.getHistory(sessionId);
  
  // Query Claude
  const response = await this.claudeAI.query(input.prompt, history);
  
  // Save conversation
  this.conversationManager.addMessage(sessionId, { role: 'user', content: input.prompt });
  this.conversationManager.addMessage(sessionId, { role: 'assistant', content: response.content });
  
  // Format and return
  return this.formatResponse(response.content, sessionId, response.usage);
}
```

### 7. MCP Server (`src/server/`)

**Purpose**: MCP protocol implementation

**Responsibilities**:
- Initialize all components
- Register tool definitions with MCP
- Handle `tools/list` requests
- Handle `tools/call` requests
- Manage stdio transport
- Error handling and logging

**Tool Registration**:
```typescript
this.server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "query",
        description: "Send a query to Claude AI assistant",
        inputSchema: {
          type: "object",
          properties: {
            prompt: { type: "string", description: "..." },
            sessionId: { type: "string", description: "..." }
          },
          required: ["prompt"]
        }
      }
    ]
  };
});
```

### 8. Logger Utility (`src/utils/`)

**Purpose**: File-based logging with flexible output

**Features**:
- **Multiple Outputs**: File, stderr, or disabled
- **Log Types**: Info, error, reasoning, tool calls, tool results
- **Timestamping**: ISO 8601 timestamps
- **Auto Directory Creation**: Creates log directory if needed
- **Graceful Degradation**: Silently fails if logging fails

**Example**:
```typescript
class Logger {
  info(message: string, data?: any): void {
    const formatted = this.formatMessage('INFO', message, data);
    this.writeLog('general.log', formatted);
  }
  
  error(message: string, data?: any): void {
    const formatted = this.formatMessage('ERROR', message, data);
    this.writeLog('general.log', formatted);
    if (this.logToStderr) process.stderr.write(formatted);
  }
}
```

### 9. Error Types (`src/errors/`)

**Purpose**: Custom error classes for better error handling

**Types**:
- `SecurityError`: Security-related issues
- `ToolExecutionError`: Tool execution failures
- `ModelBehaviorError`: Unexpected model behavior
- `ConfigurationError`: Configuration problems

## Data Flow

### Query Execution Flow

```
1. MCP Client sends tools/call request
   ↓
2. ClaudeAgentMCPServer receives request
   ├─ Validates tool name
   └─ Extracts arguments
   ↓
3. QuerySchema validates input
   ├─ Checks required fields
   └─ Type checking
   ↓
4. QueryHandler.handle()
   ├─ Get/create session
   ├─ Retrieve conversation history
   ├─ Call ClaudeAIService.query()
   │  ├─ Format messages
   │  ├─ Add system prompt
   │  ├─ Call Anthropic API
   │  └─ Extract response
   ├─ Update conversation history
   └─ Format response
   ↓
5. Return formatted response to MCP client
   ├─ Content
   ├─ Session ID
   └─ Token usage
```

### Session Management Flow

```
First Query:
1. No sessionId provided
2. ConversationManager.createSession()
3. Generate random 32-character hex ID
4. Create empty session with current timestamp
5. Store in memory Map
6. Return sessionId in response

Subsequent Query:
1. sessionId provided
2. ConversationManager.getSession(sessionId)
3. If found: retrieve history, update lastActivity
4. If not found: create new session
5. Add new messages to history
6. Trim to maxHistory if needed
7. Return sessionId in response

Background Cleanup (every 60s):
1. Iterate all sessions
2. Calculate age: now - lastActivity
3. If age > sessionTimeout: mark for deletion
4. Delete expired sessions
5. Log cleanup statistics
```

## Key Design Decisions

### 1. In-Memory Session Storage
**Decision**: Store sessions in memory (Map) instead of database

**Rationale**:
- Simpler implementation
- Lower latency
- No external dependencies
- Sessions are ephemeral by nature
- Auto-cleanup handles memory growth

**Trade-off**: Sessions lost on restart (acceptable for chat use case)

### 2. Conversation History Limiting
**Decision**: Keep only last N messages (default: 10)

**Rationale**:
- Prevents unbounded memory growth
- Keeps API calls within token limits
- Maintains relevant context
- Configurable per deployment

### 3. Automatic Session Creation
**Decision**: Create session automatically if not provided

**Rationale**:
- Better user experience
- Enables conversation by default
- User doesn't need to manage session IDs manually
- Can opt-out by disabling conversations

### 4. File-Based Logging
**Decision**: Log to files instead of stdout by default

**Rationale**:
- Doesn't interfere with MCP stdio protocol
- Persistent logs for debugging
- Can be disabled for containerized environments
- stderr option for real-time debugging

### 5. Zod for Validation
**Decision**: Use Zod for runtime validation

**Rationale**:
- Type-safe schema definitions
- Runtime validation
- Automatic TypeScript type inference
- Clear error messages
- Widely used in TypeScript ecosystem

## Testing Strategy

### Unit Testing (Future)
- Test individual components in isolation
- Mock dependencies
- Focus on business logic

### Integration Testing (Current)
- Test tools/list endpoint
- Test basic query flow
- Verify error handling

### Manual Testing
```bash
# Test tools list
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | \
  ANTHROPIC_API_KEY="test" node build/index.js

# Test query (requires valid API key)
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"query","arguments":{"prompt":"Hello"}}}' | \
  ANTHROPIC_API_KEY="sk-..." node build/index.js
```

## Extension Points

### Extending Tool Functionality

The three core tools can be extended by:

1. **Enhance Query**: Modify `QueryHandler` to support additional parameters or custom processing
2. **Improve Search**: Enhance `SearchHandler` with better search algorithm or result ranking
3. **Extend Fetch**: Add support for additional document types in `FetchHandler`

Each tool uses the handler pattern for clean separation of concerns.

## Security Considerations

### Current Security

1. **API Key Security**:
   - Stored in environment variables
   - Never logged or exposed
   - Required at startup

2. **Session Isolation**:
   - Each session has independent state
   - No cross-session data leakage

3. **Input Validation**:
   - Zod schemas validate all inputs
   - Type checking prevents injection

### Future Security Enhancements

1. **Enhanced Query Validation**:
   - Advanced prompt injection detection
   - Sensitive data redaction
   - Content moderation

2. **Search Result Validation**:
   - Result relevance scoring
   - Source trust verification
   - Content quality filtering

3. **Rate Limiting**:
   - Per-session rate limits
   - Request throttling
   - Abuse prevention

## Performance Considerations

### Current Performance

1. **In-Memory Storage**: Fast session access (O(1))
2. **No Serialization**: Direct object storage
3. **Minimal Processing**: Simple text formatting

### Optimization Opportunities

1. **Caching**: Cache identical queries
2. **Connection Pooling**: Reuse HTTP connections
3. **Streaming**: Reduce latency with streaming
4. **Lazy Loading**: Load tools on demand

## Troubleshooting Guide

### Common Issues

1. **Server won't start**:
   - Check ANTHROPIC_API_KEY
   - Verify Node.js version (18+)
   - Check build output

2. **Sessions not persisting**:
   - Verify CLAUDE_ENABLE_CONVERSATIONS="true"
   - Check session timeout
   - Ensure server hasn't restarted

3. **No logs**:
   - Check CLAUDE_DISABLE_LOGGING setting
   - Verify log directory permissions
   - Try CLAUDE_LOG_TO_STDERR="true"

4. **High memory usage**:
   - Reduce CLAUDE_MAX_HISTORY
   - Reduce CLAUDE_SESSION_TIMEOUT
   - Check for session leaks

## Conclusion

The claude-agent-mcp-server provides a clean, focused implementation for Claude AI integration via MCP. It specializes in information retrieval and conversation management with three core tools: query, search, and fetch.

Key strengths:
- ✅ Clean separation of concerns
- ✅ Type-safe implementation
- ✅ Runtime validation
- ✅ Focused tool set
- ✅ Comprehensive logging
- ✅ Session management
- ✅ Multimodal input support
- ✅ Multi-provider support (Anthropic, Bedrock, Vertex AI)

Future enhancements will build on this foundation to add streaming, caching, and advanced reasoning while maintaining code quality and security.
