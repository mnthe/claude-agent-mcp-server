# claude-agent-mcp-server

An intelligent MCP (Model Context Protocol) server that enables AI assistants to interact with **Claude** (Anthropic) with **agentic capabilities** - intelligent query handling, multi-turn conversations, session management, MCP-to-MCP connectivity, and **multimodal input support** (images, text, PDFs).

## Purpose

This server provides:
- **Agentic Query Handling**: Access Claude's powerful reasoning and code understanding capabilities
- **Query Claude**: Send queries to Claude models for cross-validation, second opinions, or specialized tasks
- **Multi-turn Conversations**: Maintain context across queries with session management
- **MCP-to-MCP Connectivity**: Integrate with external MCP servers for extended tool capabilities
- **Multimodal Support**: Send images, text, and PDF documents alongside text prompts
- **Session Management**: Automatic session creation and cleanup with configurable timeouts
- **Logging & Observability**: File-based logging of execution traces and responses

## Key Features

### 🔗 MCP-to-MCP Connectivity
Extend Claude's capabilities with external MCP servers:
- **Dynamic Tool Discovery**: Automatically discover and use tools from connected MCP servers
- **Stdio & HTTP Support**: Connect to MCP servers via stdio (subprocess) or HTTP
- **Seamless Integration**: Tools from external servers appear natively to Claude
- **Agentic Orchestration**: Claude automatically selects and uses the right tools
- Configure via `CLAUDE_MCP_SERVERS` environment variable (JSON array)

### 🎨 Multimodal Input Support
Send rich media content to Claude:
- **Images**: JPEG, PNG, WebP, GIF
- **Documents**: PDF files
- **Text**: Plain text content
- Support for base64-encoded inline data and file URIs
- Pass via optional `parts` parameter in query tool

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

**Multi-Layer Defense**:
- **SSRF Protection**: HTTPS-only URL fetching, private IP blocking (10.x, 172.16.x, 192.168.x, 127.x, 169.254.x), cloud metadata endpoint blocking (AWS, GCP, Azure)
- **Prompt Injection Guardrails**: External content tagging, trust boundaries, system prompt hardening
- **File Security**: Path traversal prevention, executable file rejection, directory whitelist
- **Redirect Validation**: Manual redirect handling with security checks, maximum 5 redirects, cross-domain blocking
- **Content Boundaries**: 50KB size limits for web content, 10MB for file operations, external content wrapping with security tags

See [SECURITY.md](SECURITY.md) for detailed security documentation and best practices.

### 📝 Observability
- File-based logging (`logs/general.log`, `logs/reasoning.log`)
- Configurable log directory or disable logging for npx/containerized environments
- Detailed execution traces for debugging
- Token usage statistics per query

## Prerequisites

- Node.js 18 or higher
- Anthropic API key ([Get one here](https://console.anthropic.com/))
- **Optional**: AWS Bedrock or Google Cloud Vertex AI credentials (see [Provider Setup Guide](PROVIDERS.md))

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

Set your Anthropic API key (for default anthropic provider):
```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

**Using AWS Bedrock or Vertex AI?** See the [Provider Setup Guide](PROVIDERS.md) for detailed instructions. These providers use their own authentication methods (AWS credentials or GCP credentials) and do not require ANTHROPIC_API_KEY.

### Configuration

**Required for Anthropic Provider (default):**
```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

**Optional Model Settings:**
```bash
export CLAUDE_MODEL="claude-sonnet-4-5-20250929"  # or claude-haiku-4-5-20251001, claude-opus-4-1-20250805
export CLAUDE_TEMPERATURE="1.0"
export CLAUDE_MAX_TOKENS="8192"
```

**Optional Provider Settings:**
```bash
# Use AWS Bedrock instead of Anthropic API
export CLAUDE_PROVIDER="bedrock"
export BEDROCK_REGION="us-east-1"

# OR use Google Cloud Vertex AI
export CLAUDE_PROVIDER="vertex"
export VERTEX_PROJECT_ID="your-gcp-project"
export VERTEX_LOCATION="us-central1"
```

📘 **See [Provider Setup Guide](PROVIDERS.md) for complete instructions on using AWS Bedrock or Vertex AI.**

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

**Optional MCP Server Configuration:**
```bash
# Connect to external MCP servers for extended capabilities
# JSON array of server configurations
export CLAUDE_MCP_SERVERS='[
  {
    "name": "filesystem",
    "transport": "stdio",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/dir"]
  },
  {
    "name": "github",
    "transport": "stdio",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-github"],
    "env": {
      "GITHUB_PERSONAL_ACCESS_TOKEN": "your-github-token"
    }
  }
]'
```

Each server configuration supports:
- **Stdio transport**: Spawns MCP server as subprocess
  - `name`: Unique server identifier
  - `transport`: "stdio"
  - `command`: Command to execute (e.g., "npx", "node")
  - `args`: Array of command arguments
  - `env`: Optional environment variables
  
- **HTTP transport**: Connects to MCP server via HTTP
  - `name`: Unique server identifier
  - `transport`: "http"
  - `url`: Base URL of the MCP server
  - `headers`: Optional HTTP headers

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
        "CLAUDE_MODEL": "claude-sonnet-4-5-20250929",
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
        "CLAUDE_MODEL": "claude-sonnet-4-5-20250929"
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

This MCP server provides **3 core tools** for AI-powered information retrieval and conversation:

### query

Query Claude AI with intelligent response generation. Supports multi-turn conversations with session management and multimodal inputs.

**Parameters:**
- `prompt` (string, required): The text prompt to send to Claude
- `sessionId` (string, optional): Conversation session ID for multi-turn conversations
- `parts` (array, optional): Multimodal content parts (images, PDF documents)
  - Each part can contain:
    - `text`: Additional text content
    - `inlineData`: Base64-encoded file data with `mimeType` and `data` fields (supports image/* and application/pdf)
    - `fileData`: File URI with `mimeType` and `fileUri` fields (file://, https://) for images and PDFs

**How It Works:**
1. Receives the prompt, optional session ID, and optional multimodal parts
2. Retrieves conversation history if session ID provided
3. Creates new session if conversations enabled but no session ID given
4. Processes multimodal content if provided (images, PDF documents)
5. Sends query to Claude with conversation context and multimodal content
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

# Multimodal query with image (base64)
query: "What's in this image?"
parts: [
  {
    "inlineData": {
      "mimeType": "image/jpeg",
      "data": "base64-encoded-image-data..."
    }
  }
]

# Multimodal query with PDF document (file URI)
query: "Summarize this PDF document"
parts: [
  {
    "fileData": {
      "mimeType": "application/pdf",
      "fileUri": "file:///path/to/document.pdf"
    }
  }
]
```

**Response Includes:**
- Answer content
- Session ID (if conversations enabled)
- Token usage: Input tokens and output tokens

### search

Search for information using Claude. Returns a list of relevant search results following the OpenAI MCP specification for search tools.

**Parameters:**
- `query` (string, required): The search query

**Response Format:**
- Array of search results with document IDs and metadata
- Results can be fetched using the `fetch` tool

**Examples:**
```
# Search for information
search: "climate change impacts on agriculture"
→ Returns: Array of relevant search results

# Follow-up with fetch to get full content
fetch:
  id: "result-123"
→ Returns: Full document content
```

### fetch

Fetch the full contents of a search result document by its ID. Follows the OpenAI MCP specification for fetch tools.

**Parameters:**
- `id` (string, required): The unique identifier for the document to fetch

**Response Format:**
- Full document content
- Can be used after `search` tool to retrieve complete article/document

**Examples:**
```
# After searching, fetch a specific result
fetch:
  id: "doc-abc-123"
→ Returns: Full document content
```

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

See [examples/custom-prompts.md](examples/custom-prompts.md) for more ready-to-use templates.

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

**For Anthropic provider (default):**
1. Verify API key: `echo $ANTHROPIC_API_KEY`
2. Check key validity in [Anthropic Console](https://console.anthropic.com/)
3. Ensure key has proper permissions

**For Bedrock/Vertex AI:**
See [Provider Setup Guide](PROVIDERS.md) for provider-specific authentication troubleshooting.

### Session Issues

**Session not found:**
- Session may have expired (check `CLAUDE_SESSION_TIMEOUT`)
- Server may have restarted (sessions are in-memory only)
- Solution: Server creates new session automatically

**Context not preserved:**
- Verify `CLAUDE_ENABLE_CONVERSATIONS="true"`
- Check `CLAUDE_MAX_HISTORY` setting
- Ensure using same `sessionId` across queries

## Roadmap

### Implemented Features

- [x] **Query Tool**: Query Claude AI with multi-turn conversation support
- [x] **Search Tool**: Search for information using Claude
- [x] **Fetch Tool**: Retrieve full content of search results
- [x] **Multimodal Support**: Images, text, and PDF documents via optional `parts` parameter
- [x] **Session Management**: Multi-turn conversations with automatic session creation and cleanup
- [x] **Multi-provider Support**: Anthropic, Vertex AI, AWS Bedrock
- [x] **Security**: Input validation, session isolation, token limiting
- [x] **Logging**: File-based and stderr logging with configurable output

### Planned Features

- [ ] **Streaming**: Real-time response streaming for better user experience
- [ ] **Caching**: Response caching for identical queries to reduce costs
- [ ] **Advanced Reasoning**: Enhanced multi-step reasoning capabilities

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

Quick start:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Documentation

- [PROVIDERS.md](PROVIDERS.md) - **Provider setup guide (AWS Bedrock, Vertex AI)**
- [SECURITY.md](SECURITY.md) - Security documentation and best practices
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture and design
- [DIRECTORY_STRUCTURE.md](DIRECTORY_STRUCTURE.md) - Code organization
- [IMPLEMENTATION.md](IMPLEMENTATION.md) - Implementation details
- [BUILD.md](BUILD.md) - Build and release process
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
- [BUILD_SUMMARY.md](BUILD_SUMMARY.md) - Project metrics
- [examples/custom-prompts.md](examples/custom-prompts.md) - System prompt templates

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Anthropic Claude Agent SDK](https://docs.claude.com/en/api/agent-sdk/overview)
- Uses [Model Context Protocol](https://github.com/modelcontextprotocol/typescript-sdk)

## Support

- [Report Issues](https://github.com/mnthe/claude-agent-mcp-server/issues)
- [Anthropic Documentation](https://docs.anthropic.com/)
- [Claude Agent SDK Docs](https://docs.claude.com/en/api/agent-sdk/overview)
- [MCP Documentation](https://modelcontextprotocol.io/)
