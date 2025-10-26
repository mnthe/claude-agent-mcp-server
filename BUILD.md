# Build and Release Process

This document describes how to build, test, and release claude-agent-mcp-server.

## Table of Contents

- [Development Setup](#development-setup)
- [Build Process](#build-process)
- [Testing](#testing)
- [Release Process](#release-process)
- [Distribution](#distribution)

## Development Setup

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- Git
- Anthropic API key (for testing)

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/mnthe/claude-agent-mcp-server.git
cd claude-agent-mcp-server

# Install dependencies
npm install

# Build the project
npm run build

# Set up environment variables
cp .env.example .env
# Edit .env with your API key
```

### Development Environment Variables

Create a `.env` file:

```bash
# Required
ANTHROPIC_API_KEY=your-api-key-here

# Optional (for testing)
CLAUDE_PROVIDER=anthropic
CLAUDE_MODEL=claude-sonnet-4-5-20250929
CLAUDE_ENABLE_CONVERSATIONS=true
CLAUDE_DISABLE_LOGGING=false
CLAUDE_LOG_TO_STDERR=true
```

## Build Process

### Build Commands

```bash
# Production build
npm run build

# Watch mode (auto-rebuild on changes)
npm run watch

# Development mode (build + run)
npm run dev

# Clean build artifacts
rm -rf build/
npm run build
```

### Build Configuration

The build is configured via `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "outDir": "./build",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "build"]
}
```

### Build Output

The build process:
1. Compiles TypeScript files from `src/` to JavaScript in `build/`
2. Preserves directory structure
3. Generates source maps (if enabled)
4. Creates type declaration files

**Build artifacts:**
```
build/
├── config/
├── errors/
├── handlers/
├── managers/
├── schemas/
├── server/
├── services/
├── types/
├── utils/
└── index.js            # Entry point
```

### Build Scripts in package.json

```json
{
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch",
    "dev": "tsc && node build/index.js",
    "prepare": "tsc"
  }
}
```

**prepare script:** Automatically runs on `npm install`, ensuring the package is built before use (e.g., with npx).

## Testing

### Manual Testing

#### Test Tool Listing

```bash
# Build first
npm run build

# Test tool listing
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | \
  ANTHROPIC_API_KEY="test-key" node build/index.js
```

**Expected output:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "query",
        "description": "Query Claude AI with a prompt...",
        "inputSchema": {...}
      },
      {
        "name": "search",
        "description": "Search for information using Claude...",
        "inputSchema": {...}
      },
      {
        "name": "fetch",
        "description": "Fetch the full contents of a search result document...",
        "inputSchema": {...}
      }
    ]
  }
}
```

#### Test Query Tool

```bash
# Simple query
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"query","arguments":{"prompt":"What is 2+2?"}}}' | \
  ANTHROPIC_API_KEY="your-key" node build/index.js
```

#### Test with Different Providers

```bash
# Anthropic (default)
CLAUDE_PROVIDER=anthropic ANTHROPIC_API_KEY="..." node build/index.js

# Vertex AI
CLAUDE_PROVIDER=vertex ANTHROPIC_VERTEX_PROJECT_ID="..." CLOUD_ML_REGION="global" node build/index.js

# Bedrock
CLAUDE_PROVIDER=bedrock AWS_REGION="us-east-1" node build/index.js
```

### Integration Testing

#### Test with Claude Desktop

1. Build the project:
   ```bash
   npm run build
   ```

2. Update Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):
   ```json
   {
     "mcpServers": {
       "claude-agent-dev": {
         "command": "node",
         "args": ["/path/to/claude-agent-mcp-server/build/index.js"],
         "env": {
           "ANTHROPIC_API_KEY": "your-key",
           "CLAUDE_ENABLE_CONVERSATIONS": "true",
           "CLAUDE_LOG_TO_STDERR": "true"
         }
       }
     }
   }
   ```

3. Restart Claude Desktop

4. Test the server by asking Claude to use the tools

#### Test with npx

```bash
# Test from GitHub
npx -y github:mnthe/claude-agent-mcp-server

# Should build and start the server
```

### Security Testing

```bash
# Test SSRF protection
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"web_fetch","arguments":{"url":"http://localhost"}}}' | \
  ANTHROPIC_API_KEY="test" node build/index.js
# Should fail with security error

# Test private IP blocking
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"web_fetch","arguments":{"url":"https://192.168.1.1"}}}' | \
  ANTHROPIC_API_KEY="test" node build/index.js
# Should fail with security error

# Test path traversal
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"read_file","arguments":{"path":"../../etc/passwd"}}}' | \
  ANTHROPIC_API_KEY="test" node build/index.js
# Should fail with security error
```

## Release Process

### Pre-Release Checklist

- [ ] All features implemented and tested
- [ ] Documentation updated
  - [ ] README.md
  - [ ] ARCHITECTURE.md
  - [ ] SECURITY.md
  - [ ] CHANGELOG.md (if exists)
- [ ] Dependencies updated
- [ ] Build succeeds without errors
- [ ] Manual testing completed
- [ ] Security checks passed
- [ ] Examples tested

### Version Numbering

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

Example: `1.2.3` → `1.3.0` (new feature)

### Release Steps

1. **Update version in package.json**
   ```bash
   npm version minor  # or major/patch
   ```

2. **Create release commit**
   ```bash
   git add .
   git commit -m "Release v1.3.0"
   ```

3. **Create git tag**
   ```bash
   git tag -a v1.3.0 -m "Release v1.3.0"
   ```

4. **Push to GitHub**
   ```bash
   git push origin main
   git push origin v1.3.0
   ```

5. **Create GitHub Release**
   - Go to GitHub repository
   - Click "Releases" → "Create a new release"
   - Select the tag (v1.3.0)
   - Add release notes
   - Publish release

### Release Notes Template

```markdown
# Release v1.3.0

## What's New

### Features
- Add MCP-to-MCP connectivity support
- Implement search and fetch tools

### Improvements
- Enhanced security guardrails
- Updated documentation

### Bug Fixes
- Fixed session cleanup issue
- Resolved provider switching bug

## Breaking Changes

None

## Upgrade Instructions

```bash
# Update to latest version
npx -y github:mnthe/claude-agent-mcp-server@latest
```

## Documentation

- [README](README.md)
- [Security Guide](SECURITY.md)
- [Architecture](ARCHITECTURE.md)
```

## Distribution

### GitHub Distribution (Current)

The package is distributed directly from GitHub:

```bash
# Install latest
npx -y github:mnthe/claude-agent-mcp-server

# Install specific version
npx -y github:mnthe/claude-agent-mcp-server#v1.3.0
```

**How it works:**
1. npx clones the repository
2. Runs `npm install` (triggers `prepare` script)
3. `prepare` script runs `npm run build`
4. Server starts from `build/index.js`

### npm Distribution (Future)

To publish to npm registry:

1. **Prepare package.json**
   ```json
   {
     "name": "@mnthe/claude-agent-mcp-server",
     "version": "1.3.0",
     "main": "build/index.js",
     "bin": {
       "claude-agent-mcp-server": "build/index.js"
     },
     "files": [
       "build/**/*",
       "README.md",
       "LICENSE",
       ".env.example"
     ]
   }
   ```

2. **Build for release**
   ```bash
   npm run build
   ```

3. **Test package locally**
   ```bash
   npm pack
   npm install -g claude-agent-mcp-server-1.3.0.tgz
   ```

4. **Publish to npm**
   ```bash
   npm login
   npm publish --access public
   ```

5. **Users can install**
   ```bash
   npx @mnthe/claude-agent-mcp-server
   ```

### Docker Distribution (Future)

Create a Dockerfile:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

ENV CLAUDE_DISABLE_LOGGING=true

CMD ["node", "build/index.js"]
```

Build and publish:

```bash
docker build -t mnthe/claude-agent-mcp-server:1.3.0 .
docker push mnthe/claude-agent-mcp-server:1.3.0
```

Users can run:

```bash
docker run -e ANTHROPIC_API_KEY="your-key" \
  mnthe/claude-agent-mcp-server:1.3.0
```

## Continuous Integration (Future)

### GitHub Actions Workflow

Create `.github/workflows/build.yml`:

```yaml
name: Build and Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm test  # if tests exist
```

### Release Automation

Create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - name: Create Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          draft: false
          prerelease: false
```

## Troubleshooting

### Build Fails

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### npx Installation Fails

```bash
# Check Node.js version
node --version  # Should be 18+

# Try with cache cleared
npx --yes --cache ~/.npm-cache github:mnthe/claude-agent-mcp-server
```

### Type Errors

```bash
# Regenerate type declarations
rm -rf build/
npm run build
```

## Best Practices

### Before Committing

1. Build succeeds: `npm run build`
2. Code formatted consistently
3. No TypeScript errors
4. Documentation updated

### Before Releasing

1. All tests pass
2. Documentation reviewed
3. CHANGELOG updated
4. Version bumped appropriately
5. Git tagged correctly

### Versioning Strategy

- **Patch (1.0.x)**: Bug fixes, security patches
- **Minor (1.x.0)**: New features, backward compatible
- **Major (x.0.0)**: Breaking changes

## Additional Resources

- [npm Semantic Versioning](https://docs.npmjs.com/about-semantic-versioning)
- [Git Tagging](https://git-scm.com/book/en/v2/Git-Basics-Tagging)
- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github)
- [TypeScript Compiler Options](https://www.typescriptlang.org/tsconfig)

## License

This build documentation is part of claude-agent-mcp-server and is licensed under the MIT License.
