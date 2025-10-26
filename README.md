# claude-agent-mcp-server

An intelligent MCP (Model Context Protocol) server that enables AI assistants to interact with **Claude** (Anthropic) with **agentic capabilities** - intelligent query handling, multi-turn conversations, session management, and extensible tool integration.

## Purpose

This server provides:
- **Agentic Query Handling**: Access Claude's powerful reasoning and code understanding capabilities
- **Query Claude**: Send queries to Claude models for cross-validation, second opinions, or specialized tasks
- **Multi-turn Conversations**: Maintain context across queries with session management
- **Tool Integration**: Extensible architecture for adding custom tools via MCP-to-MCP connectivity
- **Session Management**: Automatic session creation and cleanup with configurable timeouts
- **Logging & Observability**: File-based logging of execution traces and responses

## Key Features

### 🎭 System Prompt Customization
Customize the AI assistant's behavior and persona:
- **Domain-Specific Roles**: Configure as code reviewer, technical analyst, researcher, etc.
- **Environment-Based**: Set via `CLAUDE_SYSTEM_PROMPT` environment variable
- **Multi-Persona Support**: Run multiple servers with different personas
- **100% Backward Compatible**: Optional feature - works normally without customization

### 🤖 Intelligent Query Processing
Built on Claude's advanced capabilities:
- **Multi-turn conversations** with automatic session management
- **Context preservation** across conversation turns
- **Configurable model parameters** (temperature, max tokens)
- **Token usage tracking** for monitoring and optimization

### 🔐 Security First
- **API Key Security**: Secure credential management via environment variables
- **Session Isolation**: Each session maintains independent conversation state
- **Automatic Cleanup**: Expired sessions are automatically removed
- **Configurable Logging**: Control log output and storage

### 📝 Observability
- File-based logging (`logs/general.log`, `logs/reasoning.log`)
- Configurable log directory or disable logging for npx/containerized environments
- Detailed execution traces for debugging
- Token usage statistics per query

## Prerequisites

- Node.js 18 or higher
- Anthropic API key ([Get one here](https://console.anthropic.com/))

## Quick Start

### Installation

#### Option 1: npx (Recommended)
```bash
npx -y github:mnthe/claude-agent-mcp-server
```

#### Option 2: From Source
```bash
git clone https://github.com/mnthe/claude-agent-mcp-server.git
cd claude-agent-mcp-server
npm install
npm run build
```

### Authentication

Set your Anthropic API key:
```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

### Configuration

**Required Environment Variables:**
```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

**Optional Model Settings:**
```bash
export CLAUDE_MODEL="claude-3-5-sonnet-20241022"
export CLAUDE_TEMPERATURE="1.0"
export CLAUDE_MAX_TOKENS="8192"
```

**Optional Conversation Settings:**
```bash
# Multi-turn conversations
export CLAUDE_ENABLE_CONVERSATIONS="true"
export CLAUDE_SESSION_TIMEOUT="3600"  # 1 hour
export CLAUDE_MAX_HISTORY="10"        # Keep last 10 messages
```

**Optional System Prompt:**
```bash
# Customize AI behavior
export CLAUDE_SYSTEM_PROMPT="You are a code review specialist. Focus on code quality, security, and best practices."
```

**Optional Logging Configuration:**
```bash
export CLAUDE_DISABLE_LOGGING="false"      # Set to 'true' to disable file-based logging
export CLAUDE_LOG_DIR="/path/to/logs"      # Custom log directory (default: ./logs)
export CLAUDE_LOG_TO_STDERR="true"         # Set to 'true' to pipe logs to stderr for debugging
```

### MCP Client Integration

Add to your MCP client configuration:

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):
```json
{
  "mcpServers": {
    "claude-agent": {
      "command": "npx",
      "args": ["-y", "github:mnthe/claude-agent-mcp-server"],
      "env": {
        "ANTHROPIC_API_KEY": "your-api-key-here",
        "CLAUDE_MODEL": "claude-3-5-sonnet-20241022",
        "CLAUDE_ENABLE_CONVERSATIONS": "true"
      }
    }
  }
}
```

**Claude Code** (`.claude.json` in project root):
```json
{
  "mcpServers": {
    "claude-agent": {
      "command": "npx",
      "args": ["-y", "github:mnthe/claude-agent-mcp-server"],
      "env": {
        "ANTHROPIC_API_KEY": "your-api-key-here",
        "CLAUDE_MODEL": "claude-3-5-sonnet-20241022"
      }
    }
  }
}
```

**Other MCP Clients** (Generic stdio):
```bash
# Command to run
npx -y github:mnthe/claude-agent-mcp-server

# Or direct execution
node /path/to/claude-agent-mcp-server/build/index.js
```

#### Multi-Persona Setup

You can run multiple Claude servers with different personas for specialized tasks:

```json
{
  "mcpServers": {
    "claude-code": {
      "command": "npx",
      "args": ["-y", "github:mnthe/claude-agent-mcp-server"],
      "env": {
        "ANTHROPIC_API_KEY": "your-api-key",
        "CLAUDE_SYSTEM_PROMPT": "You are a code review specialist. Focus on code quality, security, and best practices."
      }
    },
    "claude-research": {
      "command": "npx",
      "args": ["-y", "github:mnthe/claude-agent-mcp-server"],
      "env": {
        "ANTHROPIC_API_KEY": "your-api-key",
        "CLAUDE_SYSTEM_PROMPT": "You are an academic research assistant. Cite sources and provide comprehensive analysis."
      }
    },
    "claude-writer": {
      "command": "npx",
      "args": ["-y", "github:mnthe/claude-agent-mcp-server"],
      "env": {
        "ANTHROPIC_API_KEY": "your-api-key",
        "CLAUDE_SYSTEM_PROMPT": "You are a professional technical writer. Focus on clear, concise documentation."
      }
    }
  }
}
```

## Available Tools

### query

Main entrypoint for querying Claude AI with support for multi-turn conversations.

**Parameters:**
- `prompt` (string, required): The text prompt to send to Claude
- `sessionId` (string, optional): Conversation session ID for multi-turn conversations

**How It Works:**
1. Receives the prompt and optional session ID
2. Retrieves conversation history if session ID provided
3. Creates new session if conversations enabled but no session ID given
4. Sends query to Claude with conversation context
5. Saves conversation history for future turns
6. Returns response with session ID and token usage statistics

**Examples:**
```
# Simple query
query: "What is the capital of France?"

# Multi-turn conversation (session auto-created)
query: "What is machine learning?"
→ Returns: Answer + Session ID: abc123...

# Continue conversation
query: "Give me an example"
sessionId: "abc123..."
→ Uses previous context to provide relevant example

# Complex query
query: "Review this code for security issues: [code snippet]"
→ Leverages Claude's code understanding capabilities
```

**Response Includes:**
- Answer content
- Session ID (if conversations enabled)
- Token usage: Input tokens and output tokens

## Architecture

### Project Structure

```
src/
├── config/            # Configuration loading
│   └── index.ts            # Environment variable parsing
│
├── types/             # TypeScript type definitions
│   ├── config.ts           # Configuration types
│   ├── conversation.ts     # Conversation types
│   └── mcp.ts              # MCP protocol types
│
├── schemas/           # Zod validation schemas
│   └── index.ts            # Tool input schemas
│
├── managers/          # Business logic
│   └── ConversationManager.ts  # Session and history management
│
├── services/          # External services
│   └── ClaudeAIService.ts      # Anthropic API wrapper
│
├── handlers/          # Tool handlers
│   └── QueryHandler.ts         # Query tool implementation
│
├── server/            # MCP server
│   └── ClaudeAgentMCPServer.ts # Server orchestration
│
├── errors/            # Custom error types
│   └── index.ts            # Error class definitions
│
├── utils/             # Utilities
│   └── Logger.ts           # File-based logging
│
└── index.ts           # Entry point
```

### Component Details

#### Configuration (`config/`)
- Loads environment variables
- Validates required settings
- Provides defaults for optional settings
- Parses MCP server configurations

#### Services (`services/`)
- **ClaudeAIService**: Wraps Anthropic SDK
  - Handles message formatting
  - Manages API calls
  - Supports streaming responses
  - Tracks token usage

#### Managers (`managers/`)
- **ConversationManager**: Session management
  - Creates and tracks sessions
  - Stores conversation history
  - Implements automatic cleanup
  - Limits history size

#### Handlers (`handlers/`)
- **QueryHandler**: Main query processing
  - Coordinates conversation retrieval
  - Calls Claude service
  - Updates conversation history
  - Formats responses

#### Server (`server/`)
- **ClaudeAgentMCPServer**: MCP protocol implementation
  - Registers tools with MCP
  - Routes tool calls to handlers
  - Handles errors gracefully
  - Manages stdio transport

## Advanced Usage

### Session Management

Conversations are automatically managed when enabled:

```bash
export CLAUDE_ENABLE_CONVERSATIONS="true"
export CLAUDE_SESSION_TIMEOUT="3600"  # 1 hour
export CLAUDE_MAX_HISTORY="10"        # Keep last 10 messages
```

**Session Lifecycle:**
1. **Creation**: New session created on first query (or if sessionId not found)
2. **Usage**: Pass sessionId to subsequent queries to maintain context
3. **Expiration**: Sessions expire after timeout period of inactivity
4. **Cleanup**: Expired sessions automatically removed every minute

**Example Multi-Turn Conversation:**
```typescript
// First query - creates session
const response1 = await query({
  prompt: "Explain dependency injection"
});
// response1 includes: sessionId: "abc123..."

// Second query - uses context
const response2 = await query({
  prompt: "Show me a TypeScript example",
  sessionId: "abc123..."
});
// Claude remembers we're discussing dependency injection

// Third query - continues context
const response3 = await query({
  prompt: "What are the benefits?",
  sessionId: "abc123..."
});
// Claude understands we're asking about DI benefits
```

### Custom System Prompts

Customize Claude's behavior for specific use cases:

**Code Review Assistant:**
```bash
export CLAUDE_SYSTEM_PROMPT="You are a senior software engineer specializing in code review. Focus on:
1. Security vulnerabilities
2. Performance issues
3. Best practices and design patterns
4. Code maintainability
Provide specific, actionable feedback."
```

**Technical Writer:**
```bash
export CLAUDE_SYSTEM_PROMPT="You are a professional technical writer. Your documentation should be:
1. Clear and concise
2. Well-structured with headings
3. Include practical examples
4. Accessible to the target audience"
```

**Research Assistant:**
```bash
export CLAUDE_SYSTEM_PROMPT="You are an academic research assistant. When responding:
1. Cite sources and provide references
2. Present multiple perspectives
3. Acknowledge limitations and uncertainties
4. Use formal academic language"
```

### Logging Configuration

Control how the server logs information:

**Disable Logging (for npx or containers):**
```bash
export CLAUDE_DISABLE_LOGGING="true"
```

**Custom Log Directory:**
```bash
export CLAUDE_LOG_DIR="/var/log/claude-agent"
```

**Debug Mode (log to stderr):**
```bash
export CLAUDE_LOG_TO_STDERR="true"
```

**Check Logs:**
```bash
tail -f logs/general.log     # All logs
tail -f logs/reasoning.log   # Reasoning traces (if implemented)
```

### Token Usage Monitoring

Every response includes token usage:
```
Answer content here...

---
Session ID: abc123...
Tokens - Input: 150, Output: 200
```

Use this information to:
- Monitor API costs
- Optimize prompt length
- Track conversation complexity
- Plan conversation history limits

## Development

### Build
```bash
npm run build
```

### Watch Mode
```bash
npm run watch
```

### Development Mode
```bash
npm run dev
```

### Clean Build
```bash
npm run clean
npm run build
```

## Troubleshooting

### MCP Server Connection Issues

If the MCP server appears to be "dead" or disconnects unexpectedly:

**Enable stderr logging to see what's happening:**
```json
{
  "mcpServers": {
    "claude-agent": {
      "command": "npx",
      "args": ["-y", "github:mnthe/claude-agent-mcp-server"],
      "env": {
        "ANTHROPIC_API_KEY": "your-api-key",
        "CLAUDE_LOG_TO_STDERR": "true"
      }
    }
  }
}
```

This will pipe all server logs to stderr, making them visible in your MCP client's logs.

### Log Directory Errors

If you encounter errors like `ENOENT: no such file or directory, mkdir './logs'`:

**Quick Fix:** Disable logging when running via npx:
```bash
export CLAUDE_DISABLE_LOGGING="true"
```

**Alternative:** Set a custom log directory with write permissions:
```bash
export CLAUDE_LOG_DIR="/tmp/claude-logs"
```

### Authentication Errors

1. Verify API key: `echo $ANTHROPIC_API_KEY`
2. Check key validity in [Anthropic Console](https://console.anthropic.com/)
3. Ensure key has proper permissions

### Session Issues

**Session not found:**
- Session may have expired (check `CLAUDE_SESSION_TIMEOUT`)
- Server may have restarted (sessions are in-memory only)
- Solution: Server creates new session automatically

**Context not preserved:**
- Verify `CLAUDE_ENABLE_CONVERSATIONS="true"`
- Check `CLAUDE_MAX_HISTORY` setting
- Ensure using same `sessionId` across queries

## Comparison with gemini-mcp-server

This project is inspired by and follows the architecture of [gemini-mcp-server](https://github.com/mnthe/gemini-mcp-server), adapted for Claude:

| Feature | gemini-mcp-server | claude-agent-mcp-server |
|---------|-------------------|-------------------------|
| AI Model | Google Gemini | Anthropic Claude |
| SDK | @google/genai | @anthropic-ai/sdk |
| Multi-turn Conversations | ✅ | ✅ |
| System Prompt Customization | ✅ | ✅ |
| Session Management | ✅ | ✅ |
| File-based Logging | ✅ | ✅ |
| MCP-to-MCP Connectivity | ✅ | 🚧 Planned |
| Agentic Loop | ✅ | 🚧 Planned |
| Tool Execution | ✅ (WebFetch, MCP) | 🚧 Planned |
| Multimodal Support | ✅ (images, audio, video) | 🚧 Planned |

## Roadmap

### Planned Features

- [ ] **Agentic Loop**: Turn-based execution with automatic tool selection
- [ ] **Tool Execution**: Built-in tools (bash, file operations, web fetch)
- [ ] **MCP-to-MCP**: Integration with external MCP servers
- [ ] **Streaming**: Real-time response streaming
- [ ] **Multimodal**: Support for images and documents
- [ ] **Caching**: Response caching for identical queries
- [ ] **Advanced Reasoning**: Multi-step reasoning capabilities

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by [gemini-mcp-server](https://github.com/mnthe/gemini-mcp-server)
- Built with [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-typescript)
- Uses [Model Context Protocol](https://github.com/modelcontextprotocol/typescript-sdk)

## Support

- [Report Issues](https://github.com/mnthe/claude-agent-mcp-server/issues)
- [Anthropic Documentation](https://docs.anthropic.com/)
- [MCP Documentation](https://modelcontextprotocol.io/)
