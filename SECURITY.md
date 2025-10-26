# Security

This document describes the security measures implemented in claude-agent-mcp-server and best practices for secure deployment.

## Table of Contents

- [Security Overview](#security-overview)
- [Deployment Context](#deployment-context)
- [Security Measures](#security-measures)
  - [1. Input Validation](#1-input-validation)
  - [2. Cache Management](#2-cache-management)
  - [3. Logging Sanitization](#3-logging-sanitization)
  - [4. Session Isolation](#4-session-isolation)
  - [5. Credential Handling](#5-credential-handling)
- [Configuration](#configuration)
- [Best Practices](#best-practices)
- [Threat Model](#threat-model)
- [Vulnerability Reporting](#vulnerability-reporting)

## Security Overview

The claude-agent-mcp-server is designed for **local deployment** where it runs on the user's machine. Security measures focus on preventing accidental resource exhaustion and protecting sensitive data in logs.

**Security Philosophy:**
- **Defensive Programming**: Prevent common mistakes and accidents
- **Fail Safe**: Invalid inputs rejected with clear error messages
- **Privacy by Default**: Sensitive data sanitized from logs
- **Minimal Attack Surface**: Only 3 tools exposed (query, search, fetch)

## Deployment Context

**This server is designed for local deployment:**
- Runs on user's own machine (not exposed to internet)
- Single user access (no multi-tenancy concerns)
- Trusted environment assumption
- No authentication between MCP client and server (localhost communication)

**Security threats are primarily:**
- Accidental resource exhaustion (large inputs, memory leaks)
- Sensitive data in logs (API keys, user data)
- Configuration mistakes (wrong credentials, invalid settings)

## Security Measures

### 1. Input Validation

Prevents accidental errors and resource exhaustion from large inputs.

**Implementation:** `src/utils/securityLimits.ts`

```typescript
export const SecurityLimits = {
  MAX_PROMPT_LENGTH: 500_000,    // 500KB - enough for large documents
  MAX_QUERY_LENGTH: 50_000,       // 50KB - allow complex search queries
  MAX_MULTIMODAL_PARTS: 20,       // Reasonable number of parts
  MAX_BASE64_SIZE: 20 * 1024 * 1024,  // 20MB - Claude API limit
};
```

**What it prevents:**
- ❌ Accidentally pasting 100MB file as prompt
- ❌ API errors from exceeding Claude's limits
- ❌ Out of memory errors from large multimodal content

**Where applied:**
- `QueryHandler.ts`: Validates prompts and multimodal parts
- `SearchHandler.ts`: Validates search queries

### 2. Cache Management

Prevents memory exhaustion from search result caching.

**Implementation:** `src/handlers/SearchHandler.ts`

```typescript
private cleanupCache(): void {
  // Remove oldest entries if cache too large
  if (this.searchCache.size >= 100) {
    // Remove 10 oldest entries
  }

  // Remove entries older than 1 hour
  const now = Date.now();
  for (const [id, doc] of this.searchCache.entries()) {
    if (now - timestamp > 3_600_000) {
      this.searchCache.delete(id);
    }
  }
}
```

**Limits:**
- Max 100 cached documents
- 1-hour TTL (auto-cleanup)
- Oldest-first eviction when full

**What it prevents:**
- ❌ Memory leak from unlimited cache growth
- ❌ Stale search results persisting forever

### 3. Logging Sanitization

Removes sensitive data from log files.

**Implementation:** `src/utils/securityLimits.ts`

```typescript
export function sanitizeForLogging(data: any): any {
  // Mask API keys
  data.replace(/sk-ant-api\d+-[\w-]+/gi, 'sk-ant-***');
  data.replace(/Bearer\s+[\w-]+/gi, 'Bearer ***');

  // Truncate large strings (likely base64)
  if (data.length > 200) {
    return `${data.substring(0, 100)}...[${data.length} chars]...`;
  }

  // Hide sensitive fields (key, token, secret, password)
  // ...
}
```

**What it protects:**
- API keys shown as `sk-ant-***`
- Large base64 data shown as `[20971520 chars]`
- Sensitive field values shown as `***`

**Where applied:**
- `QueryHandler.ts`: Error logging
- `SearchHandler.ts`: Error logging

### 4. Session Isolation

Keeps conversation histories separate between sessions.

**Implementation:** `src/managers/ConversationManager.ts`

```typescript
class ConversationManager {
  private sessions: Map<string, Session>;

  createSession(): string {
    const sessionId = crypto.randomUUID();
    this.sessions.set(sessionId, {
      messages: [],
      created: Date.now(),
    });
    return sessionId;
  }
}
```

**Features:**
- Cryptographically random session IDs
- Automatic session cleanup after timeout
- No cross-session data leakage

**What it prevents:**
- ❌ Conversation mixing between different tasks
- ❌ Predictable session IDs

### 5. Credential Handling

Each provider uses its standard credential system (no custom storage).

**Anthropic Provider:**
```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```
- SDK reads directly from environment variable
- Never logged or stored by this server

**Vertex AI Provider:**
```bash
export ANTHROPIC_VERTEX_PROJECT_ID="your-project"
export CLOUD_ML_REGION="global"
# + GCP Application Default Credentials
```
- Uses standard Google Cloud authentication
- Credentials managed by gcloud SDK

**Bedrock Provider:**
```bash
export AWS_REGION="us-east-1"
# + AWS credentials via ~/.aws/credentials or IAM role
```
- Uses standard AWS credentials chain
- Credentials managed by AWS SDK

**What we DON'T do:**
- ❌ Store credentials in config files
- ❌ Log credential values
- ❌ Validate or override provider credentials
- ❌ Pass credentials between components

## Configuration

### Secure Configuration Examples

**Development (with logging):**
```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export CLAUDE_LOG_TO_STDERR="true"
export CLAUDE_ENABLE_CONVERSATIONS="true"
```

**Production (minimal logging):**
```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export CLAUDE_DISABLE_LOGGING="true"
export CLAUDE_SESSION_TIMEOUT="1800"  # 30 minutes
```

**Multi-Provider (enterprise):**
```bash
# Use Vertex AI for production
export CLAUDE_PROVIDER="vertex"
export ANTHROPIC_VERTEX_PROJECT_ID="prod-project"
export CLOUD_ML_REGION="us-central1"
export CLAUDE_DISABLE_LOGGING="true"
```

## Best Practices

### Credential Management

1. **Never commit credentials**
   ```bash
   # Good: Use environment variables
   export ANTHROPIC_API_KEY="sk-ant-..."

   # Bad: Hard-code in config files
   # ANTHROPIC_API_KEY=sk-ant-... # DON'T DO THIS
   ```

2. **Use secrets management** (for production)
   - AWS Secrets Manager
   - GCP Secret Manager
   - HashiCorp Vault
   - 1Password CLI

3. **Rotate credentials regularly**
   - Set calendar reminders for rotation
   - Use different keys for dev/staging/prod
   - Revoke old keys after rotation

### Logging Security

1. **Disable logging in sensitive environments**
   ```bash
   export CLAUDE_DISABLE_LOGGING="true"
   ```

2. **Or use secure log directory**
   ```bash
   export CLAUDE_LOG_DIR="/var/log/secure"
   chmod 700 /var/log/secure
   ```

3. **Regularly clean up logs**
   ```bash
   # Auto-rotate logs
   logrotate /etc/logrotate.d/claude-agent-mcp
   ```

### Session Security

1. **Set appropriate timeouts**
   ```bash
   # Short timeout for sensitive data
   export CLAUDE_SESSION_TIMEOUT="1800"  # 30 minutes

   # Longer timeout for convenience
   export CLAUDE_SESSION_TIMEOUT="7200"  # 2 hours
   ```

2. **Limit conversation history**
   ```bash
   # Reduce memory and exposure
   export CLAUDE_MAX_HISTORY="5"
   ```

### Network Security

1. **Use HTTPS for MCP-to-MCP** (if configured)
   ```json
   {
     "mcpServers": {
       "external-mcp": {
         "transport": "http",
         "url": "https://secure-server.example.com"
       }
     }
   }
   ```

2. **Restrict network access** (firewall)
   ```bash
   # Allow only Claude API endpoints
   ufw allow out to api.anthropic.com port 443
   ufw allow out to aiplatform.googleapis.com port 443
   ufw allow out to bedrock.amazonaws.com port 443
   ```

## Threat Model

### Threats We Mitigate

| Threat | Mitigation | Impact |
|--------|-----------|--------|
| **Large Input** | Input size limits (500KB prompt, 50KB query, 20MB base64) | Prevents API errors and memory exhaustion |
| **Memory Leak** | Cache limits (100 entries, 1-hour TTL) | Prevents unbounded memory growth |
| **API Key Exposure** | Logging sanitization | Keys masked in logs as `sk-ant-***` |
| **Session Confusion** | Session isolation with UUID | Prevents conversation mixing |
| **Stale Cache** | Automatic TTL cleanup | Prevents outdated results |

### Threats Outside Our Control

**Local Deployment Assumptions:**
- ✅ User has physical access to machine
- ✅ User controls all processes
- ✅ No untrusted external users

**We do NOT protect against:**
- User intentionally reading log files
- User intentionally accessing cache
- Local malware or keyloggers
- Physical access to machine
- Network sniffing (mitigated by HTTPS)

### Trust Boundaries

```
┌─────────────────────────────────────┐
│     User's Machine (Trusted)        │
│                                     │
│  ┌─────────────┐   ┌─────────────┐ │
│  │ MCP Client  │──▶│   Server    │ │
│  │ (Desktop)   │   │ (localhost) │ │
│  └─────────────┘   └─────────────┘ │
│                          │          │
└──────────────────────────┼──────────┘
                           │ HTTPS
                           ▼
              ┌─────────────────────┐
              │   Claude API        │
              │ (Anthropic/Vertex/  │
              │  Bedrock)           │
              └─────────────────────┘
```

**Trust levels:**
- **Trusted**: MCP client, server, localhost
- **Untrusted**: Claude API responses (validated but trusted)

## Vulnerability Reporting

If you discover a security vulnerability, please:

1. **Do NOT** open a public issue
2. Email security concerns to the repository owner
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will:
- Acknowledge receipt within 48 hours
- Provide a timeline for fixes
- Credit you in the security advisory (if desired)
- Keep you informed of progress

## Security Checklist

Before deploying claude-agent-mcp-server:

- [ ] API keys stored in environment variables, not code
- [ ] Logging configured securely or disabled (`CLAUDE_DISABLE_LOGGING=true`)
- [ ] Running latest version: `npm update`
- [ ] Session timeout appropriate for use case
- [ ] Conversation history limit set reasonably (`CLAUDE_MAX_HISTORY`)
- [ ] Tested with dummy API key first
- [ ] Provider credentials configured correctly

## Additional Resources

- [Anthropic Safety Best Practices](https://www.anthropic.com/safety)
- [Claude Agent SDK Security](https://docs.claude.com/en/api/agent-sdk/overview)
- [MCP Security Considerations](https://modelcontextprotocol.io/docs/security)
- [OWASP API Security](https://owasp.org/www-project-api-security/)

## License

This security documentation is part of claude-agent-mcp-server and is licensed under the MIT License.
