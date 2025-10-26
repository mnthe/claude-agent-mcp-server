# Provider Setup Guide

This guide explains how to use claude-agent-mcp-server with different AI providers: Anthropic (default), AWS Bedrock, and Google Cloud Vertex AI.

## Table of Contents

- [Overview](#overview)
- [Anthropic API (Default)](#anthropic-api-default)
- [AWS Bedrock](#aws-bedrock)
- [Google Cloud Vertex AI](#google-cloud-vertex-ai)
- [Switching Between Providers](#switching-between-providers)
- [Troubleshooting](#troubleshooting)

## Overview

The claude-agent-mcp-server uses the Claude Agent SDK, which supports multiple backends for accessing Claude models:

| Provider | Region Availability | Authentication | Best For |
|----------|-------------------|----------------|----------|
| **Anthropic** | Global | API Key | Quick setup, development, global access |
| **AWS Bedrock** | AWS Regions | AWS Credentials | Enterprise AWS deployments, private VPC |
| **Vertex AI** | GCP Regions | GCP Credentials | Enterprise GCP deployments, data residency |

**Key Points:**
- All providers use the same Claude models
- Configuration is done via environment variables
- The Claude Agent SDK handles provider routing automatically
- Each provider uses its own authentication method (API key for Anthropic, AWS credentials for Bedrock, GCP credentials for Vertex AI)

## Anthropic API (Default)

The Anthropic API is the default and easiest way to get started.

### Prerequisites

- Anthropic API key ([Get one here](https://console.anthropic.com/))

### Configuration

**Environment Variables:**
```bash
# Required
export ANTHROPIC_API_KEY="sk-ant-api03-..."

# Optional: explicitly set provider (default is 'anthropic')
export CLAUDE_PROVIDER="anthropic"

# Optional: model configuration
export CLAUDE_MODEL="claude-sonnet-4-5-20250929"
export CLAUDE_TEMPERATURE="1.0"
export CLAUDE_MAX_TOKENS="16384"
```

### Claude Desktop Configuration

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "claude-agent": {
      "command": "npx",
      "args": ["-y", "github:mnthe/claude-agent-mcp-server"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-api03-...",
        "CLAUDE_MODEL": "claude-sonnet-4-5-20250929",
        "CLAUDE_ENABLE_CONVERSATIONS": "true"
      }
    }
  }
}
```

### Advantages

✅ **Simple Setup**: Just one API key required  
✅ **Global Access**: Works from anywhere  
✅ **Latest Features**: First to get new capabilities  
✅ **Direct Support**: Direct access to Anthropic support

## AWS Bedrock

AWS Bedrock provides Claude models through AWS infrastructure, ideal for enterprise AWS deployments.

### Prerequisites

1. **AWS Account** with Bedrock access
2. **AWS Credentials** configured (IAM user or role)
3. **Model Access**: Enable Claude models in Bedrock console

### Step 1: Enable Claude Models in Bedrock

1. Go to [AWS Bedrock Console](https://console.aws.amazon.com/bedrock/)
2. Navigate to **Model access** in the left sidebar
3. Click **Modify model access**
4. Enable **Anthropic Claude** models:
   - Claude 3.5 Sonnet
   - Claude 3 Opus
   - Claude 3 Sonnet
   - Claude 3 Haiku
5. Submit the request (usually instant approval)

### Step 2: Configure AWS Credentials

The Claude Agent SDK uses standard AWS credentials. Choose one method:

#### Option A: AWS Credentials File (Recommended)

```bash
# Create/edit ~/.aws/credentials
mkdir -p ~/.aws
cat > ~/.aws/credentials << EOF
[default]
aws_access_key_id = YOUR_ACCESS_KEY_ID
aws_secret_access_key = YOUR_SECRET_ACCESS_KEY
EOF

# Create/edit ~/.aws/config
cat > ~/.aws/config << EOF
[default]
region = us-east-1
EOF
```

#### Option B: Environment Variables

```bash
export AWS_ACCESS_KEY_ID="YOUR_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="YOUR_SECRET_ACCESS_KEY"
export AWS_REGION="us-east-1"
```

#### Option C: IAM Role (EC2/ECS)

If running on AWS infrastructure, use an IAM role with Bedrock permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "arn:aws:bedrock:*::foundation-model/anthropic.claude-*"
    }
  ]
}
```

### Step 3: Configure claude-agent-mcp-server

**Environment Variables:**
```bash
# Required
export CLAUDE_PROVIDER="bedrock"
export BEDROCK_REGION="us-east-1"

# Optional: model configuration
export CLAUDE_MODEL="claude-sonnet-4-5-20250929"
```

**AWS Regions with Bedrock:**
- `us-east-1` (US East - N. Virginia)
- `us-west-2` (US West - Oregon)
- `ap-southeast-1` (Asia Pacific - Singapore)
- `ap-northeast-1` (Asia Pacific - Tokyo)
- `eu-central-1` (Europe - Frankfurt)
- `eu-west-1` (Europe - Ireland)
- `eu-west-2` (Europe - London)

### Claude Desktop Configuration

```json
{
  "mcpServers": {
    "claude-agent-bedrock": {
      "command": "npx",
      "args": ["-y", "github:mnthe/claude-agent-mcp-server"],
      "env": {
        "CLAUDE_PROVIDER": "bedrock",
        "BEDROCK_REGION": "us-east-1",
        "CLAUDE_MODEL": "claude-sonnet-4-5-20250929",
        "CLAUDE_ENABLE_CONVERSATIONS": "true"
      }
    }
  }
}
```

**Note:** AWS credentials are loaded from standard locations (~/.aws/credentials or environment variables), not from the MCP config.

### Claude Code Configuration

In your project's `.claude.json`:

```json
{
  "mcpServers": {
    "claude-agent-bedrock": {
      "command": "npx",
      "args": ["-y", "github:mnthe/claude-agent-mcp-server"],
      "env": {
        "CLAUDE_PROVIDER": "bedrock",
        "BEDROCK_REGION": "us-east-1",
        "CLAUDE_MODEL": "claude-sonnet-4-5-20250929"
      }
    }
  }
}
```

### Advantages

✅ **AWS Integration**: Works seamlessly with AWS services  
✅ **Private Deployment**: Can run in VPC without internet access  
✅ **AWS Billing**: Consolidated billing with other AWS services  
✅ **Compliance**: Leverage AWS compliance certifications  
✅ **IAM Integration**: Fine-grained access control with IAM policies

### Model Naming in Bedrock

Bedrock uses different model identifiers. The Claude Agent SDK handles the mapping automatically. Supported latest models:

- `claude-opus-4-20250514` → `anthropic.claude-opus-4-v1`
- `claude-sonnet-4-5-20250929` → `anthropic.claude-sonnet-4-5-v2`
- `claude-haiku-4-5-20250919` → `anthropic.claude-haiku-4-5-v2`

## Google Cloud Vertex AI

Vertex AI provides Claude models through Google Cloud infrastructure, ideal for enterprise GCP deployments.

### Prerequisites

1. **Google Cloud Project** with Vertex AI API enabled
2. **GCP Credentials** configured (service account or user credentials)
3. **Claude Model Access**: Request access to Claude models in Vertex AI


### Step 1: Enable Vertex AI API

```bash
# Set your GCP project
export PROJECT_ID="your-gcp-project-id"

# Enable required APIs
gcloud services enable aiplatform.googleapis.com
gcloud services enable cloudresourcemanager.googleapis.com
```

### Step 2: Request Claude Model Access

1. Go to [Vertex AI Model Garden](https://console.cloud.google.com/vertex-ai/model-garden)
2. Search for "Claude"
3. Request access to Anthropic Claude models
4. Wait for approval (usually within 1-2 business days)

### Step 3: Configure GCP Credentials

The Claude Agent SDK uses Google Cloud Application Default Credentials (ADC). Choose one method:

#### Option A: User Credentials (Recommended for Development)

```bash
# Authenticate with your Google account
gcloud auth application-default login

# This creates credentials at:
# - Linux/macOS: ~/.config/gcloud/application_default_credentials.json
# - Windows: %APPDATA%\gcloud\application_default_credentials.json
```

#### Option B: Service Account (Recommended for Production)

```bash
# Create a service account
gcloud iam service-accounts create claude-agent-mcp \
  --display-name="Claude Agent MCP Server"

# Grant Vertex AI User role
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:claude-agent-mcp@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# Create and download key
gcloud iam service-accounts keys create ~/claude-agent-key.json \
  --iam-account=claude-agent-mcp@$PROJECT_ID.iam.gserviceaccount.com

# Set environment variable
export GOOGLE_APPLICATION_CREDENTIALS="$HOME/claude-agent-key.json"
```

#### Option C: Workload Identity (GKE)

If running in GKE, bind a Kubernetes service account to a GCP service account:

```bash
# Create GCP service account
gcloud iam service-accounts create claude-agent-mcp

# Grant Vertex AI permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:claude-agent-mcp@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# Bind to Kubernetes service account
gcloud iam service-accounts add-iam-policy-binding \
  claude-agent-mcp@$PROJECT_ID.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:$PROJECT_ID.svc.id.goog[default/claude-agent-mcp]"
```

### Step 4: Configure claude-agent-mcp-server

**Environment Variables:**
```bash
# Required
export CLAUDE_PROVIDER="vertex"
export VERTEX_PROJECT_ID="your-gcp-project-id"

# Optional
export VERTEX_LOCATION="us-central1"  # Default region
export CLAUDE_MODEL="claude-sonnet-4-5-20250929"
```

**Available Vertex AI Regions:**
- `us-central1` (Iowa)
- `us-east4` (Northern Virginia)
- `us-west1` (Oregon)
- `europe-west1` (Belgium)
- `europe-west4` (Netherlands)
- `asia-southeast1` (Singapore)

### Claude Desktop Configuration

```json
{
  "mcpServers": {
    "claude-agent-vertex": {
      "command": "npx",
      "args": ["-y", "github:mnthe/claude-agent-mcp-server"],
      "env": {
        "CLAUDE_PROVIDER": "vertex",
        "VERTEX_PROJECT_ID": "your-gcp-project-id",
        "VERTEX_LOCATION": "us-central1",
        "CLAUDE_MODEL": "claude-sonnet-4-5-20250929",
        "CLAUDE_ENABLE_CONVERSATIONS": "true"
      }
    }
  }
}
```

**Note:** GCP credentials are loaded from Application Default Credentials (via gcloud auth or GOOGLE_APPLICATION_CREDENTIALS), not from the MCP config.

### Claude Code Configuration

In your project's `.claude.json`:

```json
{
  "mcpServers": {
    "claude-agent-vertex": {
      "command": "npx",
      "args": ["-y", "github:mnthe/claude-agent-mcp-server"],
      "env": {
        "CLAUDE_PROVIDER": "vertex",
        "VERTEX_PROJECT_ID": "your-gcp-project-id",
        "VERTEX_LOCATION": "us-central1",
        "CLAUDE_MODEL": "claude-sonnet-4-5-20250929"
      }
    }
  }
}
```

### Advantages

✅ **GCP Integration**: Works seamlessly with Google Cloud services  
✅ **Data Residency**: Keep data within specific GCP regions  
✅ **GCP Billing**: Consolidated billing with other GCP services  
✅ **Compliance**: Leverage GCP compliance certifications  
✅ **IAM Integration**: Fine-grained access control with GCP IAM

## Switching Between Providers

You can run multiple instances of claude-agent-mcp-server with different providers simultaneously.

### Multi-Provider Setup Example

```json
{
  "mcpServers": {
    "claude-anthropic": {
      "command": "npx",
      "args": ["-y", "github:mnthe/claude-agent-mcp-server"],
      "env": {
        "CLAUDE_PROVIDER": "anthropic",
        "ANTHROPIC_API_KEY": "sk-ant-api03-...",
        "CLAUDE_MODEL": "claude-sonnet-4-5-20250929"
      }
    },
    "claude-bedrock": {
      "command": "npx",
      "args": ["-y", "github:mnthe/claude-agent-mcp-server"],
      "env": {
        "CLAUDE_PROVIDER": "bedrock",
        "BEDROCK_REGION": "us-east-1",
        "CLAUDE_MODEL": "claude-sonnet-4-5-20250929"
      }
    },
    "claude-vertex": {
      "command": "npx",
      "args": ["-y", "github:mnthe/claude-agent-mcp-server"],
      "env": {
        "CLAUDE_PROVIDER": "vertex",
        "VERTEX_PROJECT_ID": "your-project",
        "VERTEX_LOCATION": "us-central1",
        "CLAUDE_MODEL": "claude-sonnet-4-5-20250929"
      }
    }
  }
}
```

This allows you to:
- Compare performance across providers
- Use different providers for different use cases
- Have fallback options if one provider has issues

## Troubleshooting

### Common Issues

#### Bedrock: "Model not found" or "Access denied"

**Problem:** Error when trying to invoke Claude models.

**Solutions:**
1. **Enable model access** in Bedrock console (see Step 1 above)
2. **Check IAM permissions**: Ensure `bedrock:InvokeModel` permission
3. **Verify region**: Model must be available in your selected region
4. **Wait for propagation**: Model access can take a few minutes to activate

```bash
# Test AWS credentials
aws sts get-caller-identity

# Test Bedrock access
aws bedrock list-foundation-models --region us-east-1
```

#### Vertex AI: "Permission denied" or "API not enabled"

**Problem:** Error accessing Vertex AI models.

**Solutions:**
1. **Enable APIs**: Make sure Vertex AI API is enabled
2. **Check credentials**: Verify Application Default Credentials are set
3. **Request access**: Claude models require explicit access approval
4. **Check project ID**: Ensure correct project ID is set

```bash
# Test GCP authentication
gcloud auth application-default print-access-token

# Test Vertex AI access
gcloud ai models list --region=us-central1
```

#### Vertex AI: "Model not available in region"

**Problem:** Selected region doesn't support Claude models.

**Solution:** Use a supported region (us-central1, us-east4, europe-west1, etc.)

```bash
# Set to a supported region
export VERTEX_LOCATION="us-central1"
```

#### "ECONNREFUSED" or Connection Errors

**Problem:** Network connection issues.

**Solutions:**
1. **Check internet access**: All providers require internet (unless using private endpoints)
2. **VPC/Firewall**: Ensure outbound HTTPS (443) is allowed
3. **Proxy settings**: Configure proxy if required in your environment

### Testing Provider Configuration

#### Test Anthropic API

```bash
export ANTHROPIC_API_KEY="sk-ant-api03-..."
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"query","arguments":{"prompt":"Say hello"}}}' | \
  CLAUDE_PROVIDER=anthropic npx -y github:mnthe/claude-agent-mcp-server
```

#### Test AWS Bedrock

```bash
export ANTHROPIC_API_KEY="sk-ant-api03-..."
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"query","arguments":{"prompt":"Say hello"}}}' | \
  CLAUDE_PROVIDER=bedrock BEDROCK_REGION=us-east-1 npx -y github:mnthe/claude-agent-mcp-server
```

#### Test Vertex AI

```bash
export ANTHROPIC_API_KEY="sk-ant-api03-..."
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"query","arguments":{"prompt":"Say hello"}}}' | \
  CLAUDE_PROVIDER=vertex VERTEX_PROJECT_ID=your-project npx -y github:mnthe/claude-agent-mcp-server
```

### Enable Debug Logging

For detailed troubleshooting, enable stderr logging:

```json
{
  "mcpServers": {
    "claude-agent": {
      "command": "npx",
      "args": ["-y", "github:mnthe/claude-agent-mcp-server"],
      "env": {
        "CLAUDE_PROVIDER": "bedrock",
        "ANTHROPIC_API_KEY": "...",
        "BEDROCK_REGION": "us-east-1",
        "CLAUDE_LOG_TO_STDERR": "true"
      }
    }
  }
}
```

Check your MCP client logs to see detailed error messages.

### Getting Help

If you're still having issues:

1. **Check logs**: Enable `CLAUDE_LOG_TO_STDERR=true` for detailed logs
2. **Verify credentials**: Test AWS/GCP credentials independently
3. **Review documentation**:
   - [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
   - [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
   - [Claude Agent SDK](https://docs.claude.com/en/api/agent-sdk/overview)
4. **Open an issue**: [GitHub Issues](https://github.com/mnthe/claude-agent-mcp-server/issues)

## Additional Resources

### Provider Documentation

- **Anthropic API**: https://docs.anthropic.com/
- **AWS Bedrock**: https://docs.aws.amazon.com/bedrock/
- **Google Cloud Vertex AI**: https://cloud.google.com/vertex-ai/docs

### Authentication Guides

- **AWS Credentials**: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html
- **GCP Application Default Credentials**: https://cloud.google.com/docs/authentication/application-default-credentials

### Related Documentation

- [README.md](README.md) - Main documentation
- [SECURITY.md](SECURITY.md) - Security considerations for all providers
- [BUILD.md](BUILD.md) - Build and testing instructions
- [.env.example](.env.example) - Example environment configuration

## Cost Considerations

### Pricing Differences

Each provider has different pricing models:

- **Anthropic API**: Direct per-token pricing
- **AWS Bedrock**: Per-token pricing + AWS infrastructure costs
- **Vertex AI**: Per-token pricing + GCP infrastructure costs

**Recommendation:** Start with Anthropic API for simplicity, then migrate to Bedrock/Vertex for enterprise deployments with specific requirements.

### Cost Optimization

1. **Set token limits**: Use `CLAUDE_MAX_TOKENS` to control maximum output
2. **Monitor usage**: Track token consumption via logs
3. **Limit conversation history**: Set `CLAUDE_MAX_HISTORY` to control context size
4. **Use appropriate models**: Haiku for simple tasks, Sonnet for complex ones

## Security Best Practices

### Credential Management

1. **Never commit credentials**: Use environment variables or secure vaults
2. **Rotate credentials regularly**: Set up automatic rotation
3. **Use IAM roles**: Prefer IAM roles over access keys when possible
4. **Principle of least privilege**: Grant only necessary permissions

### Production Deployment

1. **Separate credentials**: Use different credentials for dev/staging/prod
2. **Enable logging**: Monitor for unusual activity
3. **Restrict network access**: Use VPC/firewall rules
4. **Regular updates**: Keep dependencies up to date

See [SECURITY.md](SECURITY.md) for comprehensive security guidelines.

## License

This documentation is part of claude-agent-mcp-server and is licensed under the MIT License.
