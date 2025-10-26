# Contributing to claude-agent-mcp-server

Thank you for your interest in contributing to claude-agent-mcp-server! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive experience for everyone. We expect all contributors to:

- Be respectful and considerate
- Welcome newcomers and help them get started
- Focus on what is best for the community
- Show empathy towards other community members

### Unacceptable Behavior

- Harassment or discrimination of any kind
- Trolling, insulting, or derogatory comments
- Publishing others' private information
- Any conduct that could be considered inappropriate in a professional setting

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- Git
- Anthropic API key (for testing)
- Basic understanding of TypeScript and MCP protocol

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/claude-agent-mcp-server.git
   cd claude-agent-mcp-server
   ```

3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/mnthe/claude-agent-mcp-server.git
   ```

### Set Up Development Environment

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the project:
   ```bash
   npm run build
   ```

3. Create `.env` file:
   ```bash
   cp .env.example .env
   # Edit .env with your API key
   ```

4. Test the setup:
   ```bash
   echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | \
     ANTHROPIC_API_KEY="test" node build/index.js
   ```

## Development Workflow

### Branch Strategy

- `main`: Stable, production-ready code
- `develop`: Integration branch for features (if exists)
- `feature/*`: New features
- `fix/*`: Bug fixes
- `docs/*`: Documentation updates

### Creating a Feature Branch

```bash
# Update your local main branch
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feature/my-new-feature
```

### Making Changes

1. Make your changes in the feature branch
2. Follow [Coding Standards](#coding-standards)
3. Build and test frequently:
   ```bash
   npm run build
   # Test your changes
   ```

4. Commit with clear messages:
   ```bash
   git add .
   git commit -m "Add feature: description of what was added"
   ```

### Keeping Your Branch Up-to-Date

```bash
# Fetch latest changes from upstream
git fetch upstream

# Rebase your branch on latest main
git rebase upstream/main

# If conflicts occur, resolve them and continue
git add .
git rebase --continue
```

## Coding Standards

### TypeScript Style Guide

- **Use TypeScript strict mode**: All type checking enabled
- **Explicit types**: Provide return types for functions
- **No `any`**: Avoid using `any` type (use `unknown` if needed)
- **Const over let**: Use `const` by default, `let` only when necessary
- **Arrow functions**: Prefer arrow functions for callbacks

**Good:**
```typescript
async function processQuery(prompt: string, sessionId?: string): Promise<QueryResult> {
  const config = loadConfig();
  const result = await service.query(prompt, sessionId);
  return result;
}
```

**Bad:**
```typescript
async function processQuery(prompt, sessionId) {
  var config = loadConfig();
  let result = await service.query(prompt, sessionId);
  return result;
}
```

### Naming Conventions

- **Classes**: PascalCase (`ClaudeAIService`)
- **Functions/Methods**: camelCase (`loadConfig`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- **Interfaces/Types**: PascalCase (`ServerConfig`)
- **Private members**: prefix with `_` (`_internalMethod`)

### File Organization

- One main export per file
- Group related functionality
- Keep files focused and reasonably sized (< 300 lines)
- Use `index.ts` for re-exports

### Error Handling

- Use custom error types from `/src/errors/`
- Always log errors before throwing
- Provide meaningful error messages

```typescript
import { SecurityError } from './errors/index.js';
import { Logger } from './utils/Logger.js';

try {
  validateUrl(url);
} catch (error) {
  logger.error('URL validation failed', error);
  throw new SecurityError(`Invalid URL: ${url}`);
}
```

### Comments and Documentation

- Use JSDoc for public APIs
- Explain "why" not "what"
- Keep comments up-to-date

```typescript
/**
 * Validates a URL for security issues.
 * 
 * Checks for:
 * - HTTPS protocol
 * - Private IP addresses
 * - Cloud metadata endpoints
 * 
 * @param url - The URL to validate
 * @throws SecurityError if validation fails
 */
export function validateUrl(url: string): void {
  // Implementation
}
```

### Imports

- Use ES6 imports
- Group imports: external, then internal
- Add `.js` extension for relative imports

```typescript
// External dependencies
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Internal dependencies
import { ClaudeAIService } from './services/ClaudeAIService.js';
import { ConversationManager } from './managers/ConversationManager.js';
import { Logger } from './utils/Logger.js';
```

## Testing Guidelines

### Manual Testing

Before submitting a PR, test:

1. **Tool listing**
   ```bash
   echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | \
     ANTHROPIC_API_KEY="test" node build/index.js
   ```

2. **Query tool**
   ```bash
   echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"query","arguments":{"prompt":"Test"}}}' | \
     ANTHROPIC_API_KEY="your-key" node build/index.js
   ```

3. **Security validations**
   - Test SSRF protection
   - Test path traversal prevention
   - Test file type blocking

4. **Multi-provider support** (if applicable)
   - Test with Anthropic
   - Test with Vertex AI (if you have access)
   - Test with Bedrock (if you have access)

### Integration Testing

Test with actual MCP clients:
- Claude Desktop
- Claude Code
- Other MCP clients

### Test Documentation

If adding a new feature:
1. Document how to test it
2. Provide example commands
3. Explain expected output

## Pull Request Process

### Before Creating a PR

- [ ] Code builds successfully (`npm run build`)
- [ ] Manual testing completed
- [ ] Documentation updated (README, etc.)
- [ ] Commit messages are clear
- [ ] Branch is up-to-date with main

### Creating a Pull Request

1. Push your branch to your fork:
   ```bash
   git push origin feature/my-new-feature
   ```

2. Go to GitHub and create a Pull Request
3. Fill out the PR template (if exists)
4. Provide clear description of changes

### PR Description Template

```markdown
## Description

Brief description of what this PR does.

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Changes Made

- Change 1
- Change 2
- Change 3

## Testing

How did you test these changes?

- [ ] Tool listing works
- [ ] Query tool works
- [ ] Security validations pass
- [ ] Tested with Claude Desktop

## Screenshots (if applicable)

Add screenshots or examples of the feature working.

## Checklist

- [ ] Code builds successfully
- [ ] Documentation updated
- [ ] No TypeScript errors
- [ ] Follows coding standards
```

### PR Review Process

1. Maintainers will review your PR
2. Address any requested changes
3. Update your PR by pushing to your branch
4. Once approved, your PR will be merged

### After Your PR is Merged

1. Delete your feature branch:
   ```bash
   git branch -d feature/my-new-feature
   git push origin --delete feature/my-new-feature
   ```

2. Update your local main:
   ```bash
   git checkout main
   git pull upstream main
   ```

## Issue Reporting

### Before Creating an Issue

- Search existing issues to avoid duplicates
- Verify the bug exists in the latest version
- Collect relevant information (logs, environment, etc.)

### Bug Report Template

```markdown
## Bug Description

Clear description of what the bug is.

## Steps to Reproduce

1. Step 1
2. Step 2
3. Step 3

## Expected Behavior

What you expected to happen.

## Actual Behavior

What actually happened.

## Environment

- OS: [e.g., macOS 14.1]
- Node.js version: [e.g., 18.19.0]
- claude-agent-mcp-server version: [e.g., commit hash or tag]
- Provider: [Anthropic/Vertex/Bedrock]

## Logs

```
Paste relevant logs here
```

## Additional Context

Any other information that might be helpful.
```

### Feature Request Template

```markdown
## Feature Description

Clear description of the feature you'd like to see.

## Use Case

Why is this feature needed? What problem does it solve?

## Proposed Solution

How do you think this should work?

## Alternatives Considered

What other solutions have you considered?

## Additional Context

Any other information or examples.
```

## Types of Contributions

### Code Contributions

- New features
- Bug fixes
- Performance improvements
- Refactoring

### Documentation Contributions

- README improvements
- API documentation
- Examples and tutorials
- Translation (if applicable)

### Testing Contributions

- Writing tests
- Improving test coverage
- Finding and reporting bugs

### Design Contributions

- UI/UX improvements (if applicable)
- Architecture proposals
- Security audits

## Questions?

If you have questions:
1. Check existing documentation
2. Search closed issues
3. Open a new issue with the "question" label
4. Be patient - maintainers are volunteers

## Recognition

Contributors will be:
- Listed in release notes
- Mentioned in documentation (if significant contribution)
- Thanked in commit messages

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Thank You!

Your contributions make this project better for everyone. Thank you for taking the time to contribute!
