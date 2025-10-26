# Directory Structure

This document describes the organization of the claude-agent-mcp-server codebase.

## Overview

```
claude-agent-mcp-server/
├── src/                    # Source code
│   ├── config/            # Configuration management
│   ├── errors/            # Custom error types
│   ├── handlers/          # MCP tool handlers
│   ├── managers/          # Business logic managers
│   ├── schemas/           # Zod validation schemas
│   ├── server/            # MCP server implementation
│   ├── services/          # External service integrations
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Shared utilities
├── build/                 # Compiled JavaScript (generated)
├── logs/                  # Log files (generated)
├── examples/              # Usage examples and templates
├── docs/                  # Additional documentation
└── [root files]           # Configuration and documentation
```

## Source Code Structure

### `/src/config/`

Configuration loading and validation.

```
config/
└── index.ts              # Configuration loader with environment variable parsing
```

**Purpose:** Centralized configuration management with validation and type safety.

**Key Features:**
- Environment variable parsing
- Default values
- Provider-specific configuration (Anthropic, Vertex AI, Bedrock)
- Auto-configuration of Claude Agent SDK environment variables

**Example:**
```typescript
import { loadConfig } from './config/index.js';

const config = loadConfig();
console.log(config.model);  // 'claude-3-5-sonnet-20241022'
```

### `/src/errors/`

Custom error types for better error handling.

```
errors/
└── index.ts              # Custom error classes
```

**Error Types:**
- `ConfigurationError`: Configuration validation failures
- `SecurityError`: Security policy violations
- `ToolError`: Tool execution failures
- `ValidationError`: Input validation failures

**Example:**
```typescript
import { SecurityError } from './errors/index.js';

if (!url.startsWith('https://')) {
  throw new SecurityError('Only HTTPS URLs are allowed');
}
```

### `/src/handlers/`

MCP tool request handlers.

```
handlers/
├── QueryHandler.ts    # Query tool - Claude AI queries with conversation support
├── SearchHandler.ts   # Search tool - Claude-powered search with caching
└── FetchHandler.ts    # Fetch tool - Retrieve cached search results
```

**Purpose:** Implement business logic for each MCP tool.

**Pattern:**
```typescript
export class QueryHandler {
  async handle(params: QueryParams): Promise<QueryResult> {
    // 1. Validate input
    // 2. Execute business logic
    // 3. Return formatted response
  }
}
```

**Key Responsibilities:**
- Input validation using Zod schemas
- Orchestrate calls to services and managers
- Format responses according to MCP specification
- Error handling and logging

### `/src/managers/`

Business logic managers for complex operations.

```
managers/
└── ConversationManager.ts    # Session and conversation state management
```

**Purpose:** Manage stateful operations and business logic.

**ConversationManager Features:**
- Session creation and lookup
- Conversation history management
- Automatic session expiration and cleanup
- Thread-safe session operations

**Example:**
```typescript
import { ConversationManager } from './managers/ConversationManager.js';

const manager = new ConversationManager(config);

// Get or create session
const conversation = await manager.getOrCreateConversation(sessionId);

// Add message to history
conversation.history.push({
  role: 'user',
  content: 'Hello'
});
```

### `/src/schemas/`

Zod validation schemas for runtime type checking.

```
schemas/
└── index.ts              # Input validation schemas
```

**Purpose:** Validate inputs at runtime to prevent errors and security issues.

**Key Schemas:**
- `QueryParamsSchema`: Validate query tool inputs
- `ExecuteCommandParamsSchema`: Validate command execution inputs
- `ReadFileParamsSchema`: Validate file reading inputs
- `WriteFileParamsSchema`: Validate file writing inputs
- `WebFetchParamsSchema`: Validate web fetch inputs

**Example:**
```typescript
import { QueryParamsSchema } from './schemas/index.js';

const params = QueryParamsSchema.parse(input);
// Throws if validation fails
```

### `/src/server/`

MCP protocol server implementation.

```
server/
└── ClaudeAgentMCPServer.ts   # MCP server with tool registration
```

**Purpose:** Implement the Model Context Protocol server specification.

**Key Features:**
- Tool registration and discovery
- Request routing to handlers
- Dynamic tool enablement based on configuration
- Stdio transport for MCP communication

**Tool Registration:**
```typescript
class ClaudeAgentMCPServer {
  private registerTools() {
    // Always available
    this.registerTool('query', queryHandler);
    this.registerTool('read_file', readFileHandler);
    this.registerTool('web_fetch', webFetchHandler);

    // Opt-in tools
    if (config.enableFileWrite) {
      this.registerTool('write_file', writeFileHandler);
    }
    if (config.enableCommandExecution) {
      this.registerTool('execute_command', executeCommandHandler);
    }
  }
}
```

### `/src/services/`

External service integrations.

```
services/
└── ClaudeAIService.ts        # Claude Agent SDK wrapper
```

**Purpose:** Encapsulate external service communication.

**ClaudeAIService Features:**
- Multi-provider support (Anthropic, Vertex AI, Bedrock)
- Streaming response handling
- Token usage tracking
- Message formatting and history management
- Multi-turn execution via Claude Agent SDK

**Example:**
```typescript
import { ClaudeAIService } from './services/ClaudeAIService.js';

const service = new ClaudeAIService(config);

const response = await service.query(
  'What is the capital of France?',
  conversationHistory,
  maxTurns
);

console.log(response.content);
console.log(response.usage);  // Token counts
```

### `/src/types/`

TypeScript type definitions.

```
types/
├── index.ts              # Re-exports all types
├── config.ts             # Configuration types
├── conversation.ts       # Conversation and message types
└── mcp.ts                # MCP protocol types
```

**Purpose:** Provide type safety and IntelliSense support.

**Key Type Categories:**
- **Config Types**: `ServerConfig`, `ModelConfig`, `ProviderConfig`
- **Message Types**: `Message`, `MessageRole`, `ClaudeResponse`
- **Conversation Types**: `Conversation`, `ConversationMetadata`
- **MCP Types**: `Tool`, `ToolDefinition`, `ToolResult`

### `/src/utils/`

Shared utility functions.

```
utils/
├── Logger.ts             # File-based and stderr logging
├── urlSecurity.ts        # URL validation and SSRF protection
└── fileSecurity.ts       # File path validation and security
```

**Purpose:** Provide reusable functionality across the codebase.

**Logger Features:**
- File-based logging (general.log, reasoning.log)
- Optional stderr output
- Configurable log directory
- Can be disabled for containerized deployments

**Security Utilities:**
- URL validation (HTTPS-only, private IP blocking)
- DNS resolution checks
- Path traversal prevention
- Executable file blocking
- Directory whitelist enforcement

**Example:**
```typescript
import { Logger } from './utils/Logger.js';
import { validateUrl } from './utils/urlSecurity.js';
import { validateFilePath } from './utils/fileSecurity.js';

const logger = new Logger(config);
logger.info('Processing request');

validateUrl('https://example.com');  // OK
validateUrl('http://localhost');     // Throws SecurityError

validateFilePath('/etc/passwd');     // Throws SecurityError
validateFilePath('./data/file.txt'); // OK if in allowed directory
```

## Root Files

### Configuration Files

- **`tsconfig.json`**: TypeScript compiler configuration
- **`package.json`**: Node.js project configuration and dependencies
- **`.gitignore`**: Git ignore patterns
- **`.env.example`**: Example environment variables

### Documentation Files

- **`README.md`**: Main project documentation
- **`ARCHITECTURE.md`**: System architecture documentation
- **`IMPLEMENTATION.md`**: Implementation details
- **`SECURITY.md`**: Security documentation and best practices
- **`BUILD_SUMMARY.md`**: Project metrics and build information
- **`DIRECTORY_STRUCTURE.md`**: This file
- **`BUILD.md`**: Build and release process
- **`CONTRIBUTING.md`**: Contribution guidelines
- **`LICENSE`**: MIT License

### Configuration Examples

- **`claude_desktop_config.json.example`**: Example Claude Desktop configuration

## Generated Directories

### `/build/`

Compiled JavaScript output from TypeScript compilation.

```bash
npm run build  # Generates build/ directory
```

**Contents:**
- Transpiled JavaScript files
- Source maps (if enabled)
- Type declaration files (.d.ts)

**Note:** This directory is gitignored and should not be committed.

### `/logs/`

Log files generated during server operation.

```
logs/
├── general.log           # All server logs
└── reasoning.log         # Claude reasoning traces
```

**Note:** This directory is gitignored and should not be committed. Can be disabled via `CLAUDE_DISABLE_LOGGING=true`.

## Examples Directory

### `/examples/`

Usage examples and templates.

```
examples/
└── custom-prompts.md     # System prompt templates for various use cases
```

**Purpose:** Provide ready-to-use examples for common scenarios.

**Contents:**
- Custom system prompt templates
- Configuration examples for different use cases
- Multi-persona setup examples

## Design Patterns

### Dependency Injection

Services and managers are injected into handlers:

```typescript
class QueryHandler {
  constructor(
    private claudeService: ClaudeAIService,
    private conversationManager: ConversationManager,
    private logger: Logger
  ) {}
}
```

**Benefits:**
- Easier testing (can inject mocks)
- Loose coupling
- Clear dependencies

### Single Responsibility

Each module has a single, well-defined purpose:

- **Handlers**: Handle MCP requests
- **Managers**: Manage business logic
- **Services**: Communicate with external services
- **Utils**: Provide shared functionality

### Error Handling

Consistent error handling pattern:

```typescript
try {
  // Operation
} catch (error) {
  logger.error('Operation failed', error);
  throw new ToolError('User-friendly message');
}
```

### Configuration Management

Centralized configuration with validation:

```typescript
// Load config once at startup
const config = loadConfig();

// Pass config to components
const service = new ClaudeAIService(config);
```

## Code Organization Principles

### 1. Separation of Concerns

Each directory has a specific purpose:
- `/config`: Configuration
- `/handlers`: Request handling
- `/services`: External communication
- `/utils`: Shared functionality

### 2. Layered Architecture

```
MCP Client
    ↓
Server (MCP Protocol)
    ↓
Handlers (Business Logic)
    ↓
Services/Managers (Core Logic)
    ↓
External Services (Claude API)
```

### 3. Type Safety

- All modules use TypeScript strict mode
- Runtime validation with Zod
- Explicit return types
- No `any` types (except where unavoidable)

### 4. Modularity

- Each file exports a single primary class or function
- Clear module boundaries
- Minimal circular dependencies

### 5. Testability

- Pure functions where possible
- Dependency injection
- Mockable external services
- Clear interfaces

## Navigation Tips

### Finding Code

**To implement a new tool:**
1. Create handler in `/src/handlers/`
2. Add schema in `/src/schemas/`
3. Register in `/src/server/ClaudeAgentMCPServer.ts`

**To add a new configuration option:**
1. Update types in `/src/types/config.ts`
2. Update loader in `/src/config/index.ts`
3. Update `.env.example`

**To add a new security check:**
1. Implement in `/src/utils/urlSecurity.ts` or `/src/utils/fileSecurity.ts`
2. Use in relevant handlers

**To modify Claude integration:**
1. Update `/src/services/ClaudeAIService.ts`
2. Ensure changes work with Claude Agent SDK

### Understanding Data Flow

1. **Request arrives** → `/src/server/ClaudeAgentMCPServer.ts`
2. **Route to handler** → `/src/handlers/*Handler.ts`
3. **Validate input** → `/src/schemas/index.ts`
4. **Execute business logic** → `/src/managers/` or `/src/services/`
5. **Return response** → Handler formats and returns

## Best Practices

### When Adding New Code

1. **Choose the right directory** based on responsibility
2. **Create types** in `/src/types/` first
3. **Add validation** schemas in `/src/schemas/`
4. **Write handler** in `/src/handlers/`
5. **Update documentation** (README, etc.)

### When Refactoring

1. **Keep modules focused** on single responsibility
2. **Extract shared code** to `/src/utils/`
3. **Maintain backward compatibility** when possible
4. **Update tests** if they exist

### When Reviewing Code

1. **Check directory placement** - is code in the right place?
2. **Verify type safety** - are types properly defined?
3. **Review error handling** - are errors caught and logged?
4. **Check security** - are inputs validated?

## Conclusion

This directory structure is designed to be:
- **Intuitive**: Easy to navigate and understand
- **Scalable**: Can accommodate growth
- **Maintainable**: Clear organization and separation of concerns
- **Testable**: Easy to test individual components

For more details on specific components, see:
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
- [IMPLEMENTATION.md](IMPLEMENTATION.md) - Implementation details
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
