# Architecture Documentation

## Overview

The Claude Agent MCP Server implements an **intelligent information retrieval system** with session management, conversation tracking, and multimodal input support. It provides three core tools: `query` for conversational AI, `search` for information retrieval, and `fetch` for content access.

**Last Updated**: 2025-10-26

## Core Architecture

### Query Processing Pattern

```
User Input
  ↓
┌─────────────────── Session Management ──────────────────┐
│                                                          │
│  Session Lookup/Creation                                 │
│  ├─ Retrieve existing session by ID                      │
│  ├─ Create new session if needed                         │
│  └─ Load conversation history                            │
│                                                          │
│  ┌──────────────────────────────────────┐               │
│  │  Query Execution                     │               │
│  │  ───────────────                     │               │
│  │                                      │               │
│  │  1. Build Messages                   │               │
│  │     └─ History + New Prompt          │               │
│  │                                      │               │
│  │  2. Claude API Call                  │               │
│  │     └─ System Prompt + Messages      │               │
│  │                                      │               │
│  │  3. Response Processing              │               │
│  │     └─ Extract content               │               │
│  │                                      │               │
│  │  4. History Update                   │               │
│  │     ├─ Add user message              │               │
│  │     ├─ Add assistant message         │               │
│  │     └─ Trim to max history           │               │
│  │                                      │               │
│  │  5. Format Response                  │               │
│  │     ├─ Content                       │               │
│  │     └─ Session ID                    │               │
│  │                                      │               │
│  └──────────────────────────────────────┘               │
│                                                          │
└──────────────────────────────────────────────────────────┘
  ↓
Structured Result
├─ Answer content
└─ Session ID (if conversations enabled)
```

## Component Architecture

### Layer Separation

```
┌────────────────────────────────────────────────────────┐
│                  Entry Point Layer                     │
│                    (index.ts)                          │
│  - Environment setup (.env loading)                    │
│  - Configuration loading                               │
│  - Server instantiation and startup                    │
└────────────────────┬───────────────────────────────────┘
                     │
┌────────────────────▼───────────────────────────────────┐
│                 Configuration Layer                    │
│                (config/index.ts)                       │
│  - Environment variable parsing                        │
│  - Validation and defaults                             │
│  - Type-safe config object creation                    │
└────────────────────┬───────────────────────────────────┘
                     │
┌────────────────────▼───────────────────────────────────┐
│                  Server Layer                          │
│          (server/ClaudeAgentMCPServer.ts)              │
│  - MCP protocol implementation                         │
│  - Tool registration (tools/list)                      │
│  - Request routing (tools/call)                        │
│  - Component initialization                            │
│  - Error handling                                      │
└────────────────────┬───────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
┌────────▼─────────┐  ┌─────────▼────────┐
│  Handler Layer   │  │  Manager Layer   │
│  (handlers/)     │  │  (managers/)     │
│                  │  │                  │
│  QueryHandler    │  │  Conversation    │
│  - Input valid.  │  │  Manager         │
│  - Orchestration │  │  - Session mgmt  │
│  - Response fmt  │  │  - History store │
│                  │  │  - Auto cleanup  │
└────────┬─────────┘  └─────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
         ┌───────────▼───────────┐
         │   Service Layer       │
         │   (services/)         │
         │                       │
         │   ClaudeAIService     │
         │   - API wrapper       │
         │   - Message format    │
         │   - Error handling    │
         └───────────┬───────────┘
                     │
         ┌───────────▼───────────┐
         │  External Services    │
         │                       │
         │  Anthropic API        │
         │  - Claude models      │
         │  - Streaming support  │
         └───────────────────────┘
```

### Cross-Cutting Concerns

```
┌─────────────────────────────────────────────────────┐
│                  Logging (utils/)                   │
│  - File-based logging                               │
│  - Stderr output option                             │
│  - Structured log messages                          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              Validation (schemas/)                  │
│  - Zod schema definitions                           │
│  - Runtime type checking                            │
│  - Input validation                                 │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│               Type System (types/)                  │
│  - TypeScript interfaces                            │
│  - Compile-time type checking                       │
│  - IDE autocomplete support                         │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│             Error Handling (errors/)                │
│  - Custom error classes                             │
│  - Structured error information                     │
│  - Graceful error recovery                          │
└─────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### Session Lifecycle

```
┌─────────────────────────────────────────────────────┐
│                   Session States                    │
└─────────────────────────────────────────────────────┘

    [New Query]
         │
         ├─ Has sessionId?
         │
    Yes  │  No
    ┌────┴────┐
    │         │
    ▼         ▼
[Lookup]  [Create]
    │         │
    │         ├─ Generate ID (crypto.randomBytes)
    │         ├─ Initialize empty messages array
    │         └─ Set lastActivity = now
    │         │
    └────┬────┘
         │
         ▼
    [Active Session]
         │
         ├─ Update lastActivity
         ├─ Add user message
         ├─ Add assistant message
         ├─ Trim to maxHistory
         │
         ▼
    [Wait for next query]
         │
         ├─ Timeout?
         │
    No   │  Yes (age > sessionTimeout)
    ┌────┴────┐
    │         │
    ▼         ▼
  [Keep]  [Cleanup]
              │
              └─ Remove from memory
```

### Message Flow

```
[User] → [MCP Client] → [MCP Server] → [Query Handler]
                                              │
                                              ├→ [Validate Input]
                                              │     │
                                              │     └─ Zod Schema
                                              │
                                              ├→ [Get/Create Session]
                                              │     │
                                              │     └─ ConversationManager
                                              │
                                              ├→ [Retrieve History]
                                              │     │
                                              │     └─ Message[]
                                              │
                                              ├→ [Call Claude]
                                              │     │
                                              │     ├─ Build messages array
                                              │     ├─ Add system prompt
                                              │     ├─ API call
                                              │     └─ Extract response
                                              │
                                              ├→ [Update History]
                                              │     │
                                              │     ├─ Add user message
                                              │     ├─ Add assistant message
                                              │     └─ Trim if needed
                                              │
                                              └→ [Format Response]
                                                    │
                                                    ├─ Content
                                                    └─ Session ID
                                                    │
                                                    ▼
[User] ← [MCP Client] ← [MCP Server] ← [Formatted Result]
```

## Component Details

### 1. Entry Point (`src/index.ts`)

**Responsibilities**:
- Load .env file for local development
- Load configuration via `loadConfig()`
- Instantiate `ClaudeAgentMCPServer`
- Start server with error handling

**Lifecycle**:
```typescript
1. Import dotenv/config (loads .env)
2. loadConfig() → ClaudeAgentConfig
3. new ClaudeAgentMCPServer(config)
4. server.run()
   ├─ Connect stdio transport
   └─ Listen for requests
5. Catch fatal errors → log + exit(1)
```

### 2. Configuration (`src/config/`)

**Responsibilities**:
- Parse environment variables
- Validate required settings
- Provide defaults for optional settings
- Exit gracefully on configuration errors

**Configuration Hierarchy**:
```
Required (for anthropic provider):
  ANTHROPIC_API_KEY

Optional - Provider:
  CLAUDE_PROVIDER (default: anthropic)
  For vertex: ANTHROPIC_VERTEX_PROJECT_ID, CLOUD_ML_REGION
  For bedrock: AWS_REGION

Optional - Model:
  CLAUDE_MODEL (default: claude-sonnet-4-5-20250929)
  CLAUDE_TEMPERATURE (default: 1.0)
  CLAUDE_MAX_TOKENS (default: 16384)

Optional - Conversations:
  CLAUDE_ENABLE_CONVERSATIONS (default: false)
  CLAUDE_SESSION_TIMEOUT (default: 3600)
  CLAUDE_MAX_HISTORY (default: 10)

Optional - Logging:
  CLAUDE_DISABLE_LOGGING (default: false)
  CLAUDE_LOG_DIR (default: ./logs)
  CLAUDE_LOG_TO_STDERR (default: false)

Optional - Customization:
  CLAUDE_SYSTEM_PROMPT (default: standard prompt)
  CLAUDE_MCP_SERVERS (default: none)
```

### 3. MCP Server (`src/server/`)

**Responsibilities**:
- Initialize all components
- Register MCP request handlers
- Manage stdio transport
- Coordinate tool execution

**Handler Registration**:
```typescript
// List tools
server.setRequestHandler(ListToolsRequestSchema, () => {
  return { tools: [queryToolDef] };
});

// Execute tools
server.setRequestHandler(CallToolRequestSchema, (request) => {
  const { name, arguments } = request.params;
  
  switch (name) {
    case "query":
      return queryHandler.handle(arguments);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});
```

### 4. Query Handler (`src/handlers/`)

**Responsibilities**:
- Validate query input with Zod
- Manage session lookup/creation
- Orchestrate Claude API call
- Update conversation history
- Format response with metadata

**Processing Flow**:
```typescript
async handle(input: QueryInput): Promise<string> {
  // 1. Validate input (Zod handles this)
  
  // 2. Session management
  let sessionId = input.sessionId;
  if (conversationsEnabled) {
    if (!sessionId || !sessionExists(sessionId)) {
      sessionId = createSession();
    }
  }
  
  // 3. Get history
  const history = getHistory(sessionId);
  
  // 4. Call Claude
  const response = await claudeAI.query(prompt, history);
  
  // 5. Update history
  if (conversationsEnabled) {
    addMessage(sessionId, { role: 'user', content: prompt });
    addMessage(sessionId, { role: 'assistant', content: response.content });
  }
  
  // 6. Format response
  return formatResponse(response, sessionId);
}
```

### 5. Conversation Manager (`src/managers/`)

**Responsibilities**:
- Create and store sessions
- Manage conversation history
- Limit history size
- Automatic session cleanup

**Session Storage**:
```typescript
class ConversationManager {
  private sessions: Map<string, Session> = new Map();
  
  // Session = {
  //   id: string,
  //   messages: Message[],
  //   lastActivity: number
  // }
}
```

**Cleanup Strategy**:
```typescript
// Every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    const age = (now - session.lastActivity) / 1000;
    if (age > sessionTimeout) {
      sessions.delete(id);
    }
  }
}, 60000);
```

### 6. Claude AI Service (`src/services/`)

**Responsibilities**:
- Wrap Anthropic SDK
- Format messages for API
- Handle streaming responses

**API Call Flow**:
```typescript
async query(prompt, history) {
  // 1. Build messages array
  const messages = [
    ...history.map(msg => ({
      role: msg.role,
      content: msg.content
    })),
    { role: 'user', content: prompt }
  ];
  
  // 2. Call API
  const response = await anthropic.messages.create({
    model: config.model,
    max_tokens: config.maxTokens,
    temperature: config.temperature,
    system: config.systemPrompt || defaultPrompt,
    messages
  });
  
  // 3. Extract content
  const content = response.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n');

  // 4. Return content
  return {
    content
  };
}
```

### 7. Logger (`src/utils/`)

**Responsibilities**:
- Log to files or stderr
- Format log messages
- Handle logging failures gracefully

**Log Format**:
```
[2025-10-26T05:19:07.123Z] [INFO] Message here {"data": "value"}
[2025-10-26T05:19:08.456Z] [ERROR] Error message {"error": "details"}
[2025-10-26T05:19:09.789Z] [TOOL_CALL] Tool: query {"prompt": "..."}
```

## Design Patterns

### 1. Dependency Injection

Components receive dependencies via constructor:

```typescript
class QueryHandler {
  constructor(
    private claudeAI: ClaudeAIService,
    private conversationManager: ConversationManager | null,
    private logger: Logger
  ) {}
}
```

**Benefits**:
- Easy testing (inject mocks)
- Loose coupling
- Clear dependencies

### 2. Single Responsibility

Each component has one clear purpose:

- **Config**: Load configuration
- **Service**: API communication
- **Manager**: Session management
- **Handler**: Business logic
- **Server**: Protocol handling

### 3. Factory Pattern

Configuration creates all components:

```typescript
const config = loadConfig();
const logger = new Logger(config);
const service = new ClaudeAIService(config, logger);
const manager = new ConversationManager(config, logger);
const handler = new QueryHandler(service, manager, logger);
const server = new ClaudeAgentMCPServer(config);
```

### 4. Strategy Pattern

Logging can use different strategies:

- File-based logging
- Stderr logging
- Disabled logging

Selected via configuration.

## Security Architecture

### Current Security Measures

1. **Credential Security**:
   - API keys in environment variables
   - Never logged or exposed in responses
   - Validated at startup

2. **Session Isolation**:
   - Cryptographically secure session IDs
   - Independent session state
   - No cross-session data access

3. **Input Validation**:
   - Zod schema validation
   - Type checking
   - Required field enforcement

4. **Resource Limits**:
   - Session history limits (maxHistory)
   - Session timeout (automatic cleanup)
   - Token limits (maxTokens)

### Future Security Enhancements

1. **Command Execution** (when implemented):
   - Command whitelist
   - Argument sanitization
   - Execution timeout
   - Output size limits

2. **File Operations** (when implemented):
   - Directory whitelist
   - Path traversal prevention
   - File size limits
   - MIME type validation

3. **Network Access** (when implemented):
   - HTTPS-only
   - Private IP blocking
   - SSRF protection
   - Content size limits

## Performance Characteristics

### Time Complexity

- Session lookup: O(1) - HashMap
- Message retrieval: O(1) - Direct array access
- History trimming: O(n) - Array slice
- Session cleanup: O(n) - Iterate all sessions

### Space Complexity

- Per session: O(m) where m = min(messages, maxHistory)
- Total: O(s × m) where s = number of active sessions

### Scalability Considerations

**Current Limits**:
- In-memory storage limits number of sessions
- No horizontal scaling (single process)
- Session cleanup prevents unbounded growth

**Future Improvements**:
- Redis for session storage (distributed)
- Database for persistence
- Load balancing across multiple processes
- Caching layer for frequent queries

## Extension Architecture

### Adding New Tools

1. **Define Schema** (`schemas/index.ts`)
2. **Create Handler** (`handlers/XxxHandler.ts`)
3. **Register in Server** (`server/ClaudeAgentMCPServer.ts`)

### Adding MCP-to-MCP

1. **Define Connection Types** (`types/mcp.ts`)
2. **Implement Connections** (`mcp/`)
3. **Add Tool Discovery** (at startup)
4. **Route Tool Calls** (to external servers)

### Adding Streaming

1. **Update Service** (add `queryStream` method)
2. **Update Handler** (handle streaming responses)
3. **Update Server** (support streaming protocol)

## Testing Strategy

### Unit Tests (Future)

```typescript
describe('ConversationManager', () => {
  it('should create unique session IDs', () => {
    const manager = new ConversationManager(3600, 10, logger);
    const id1 = manager.createSession();
    const id2 = manager.createSession();
    expect(id1).not.toBe(id2);
  });
  
  it('should trim history to max size', () => {
    const manager = new ConversationManager(3600, 5, logger);
    const sessionId = manager.createSession();
    
    // Add 10 messages
    for (let i = 0; i < 10; i++) {
      manager.addMessage(sessionId, {
        role: 'user',
        content: `Message ${i}`
      });
    }
    
    const history = manager.getHistory(sessionId);
    expect(history.length).toBe(5);
  });
});
```

### Integration Tests (Current)

```bash
# Test tool listing
npm run test:list

# Test query execution
npm run test:query
```

## Conclusion

The claude-agent-mcp-server architecture provides:

- ✅ Clean separation of concerns
- ✅ Type-safe implementation
- ✅ Extensible design
- ✅ Production-ready logging
- ✅ Session management
- ✅ Error handling

Future enhancements will build on this solid foundation while maintaining architectural integrity and code quality.
