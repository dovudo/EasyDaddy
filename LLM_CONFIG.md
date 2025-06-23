# LLM Configuration Guide

## Overview

EasyDaddy Extension now supports flexible LLM model configuration through OpenRouter API. You can easily switch between different models and providers without changing code.

## Quick Setup

### 1. Environment Variables

Create a `.env` file in the project root:

```env
# Primary API key for OpenRouter (recommended)
VITE_OPENROUTER_API_KEY=sk-or-v1-your-openrouter-api-key

# Fallback for direct OpenAI API calls (optional)
VITE_OPENAI_API_KEY=sk-your-openai-api-key
```

### 2. Get OpenRouter API Key

1. Visit [OpenRouter.ai](https://openrouter.ai/)
2. Sign up for an account
3. Get your API key from the dashboard
4. Add it to your `.env` file

## Switching Models

To change the active model, edit `src/lib/llm-config.ts`:

```typescript
export const CONFIG = {
  // Change this line to switch models
  activeModel: 'deepseek-chat-free', // or 'gpt-4o-mini', 'claude-3-haiku', etc.
  
  // Fallback models if primary fails
  fallbackModels: ['gpt-4o-mini', 'claude-3-haiku'],
  
  // Other settings...
};
```

## Available Models

### DeepSeek Models (Recommended)

| Model ID | Description | Cost | Features |
|----------|-------------|------|----------|
| `deepseek-chat-free` | DeepSeek Chat (Free) | Free | Fast, JSON mode, Good reasoning |
| `deepseek-chat-paid` | DeepSeek Chat (Paid) | Low cost | Better performance, higher limits |

### OpenAI Models

| Model ID | Description | Cost | Features |
|----------|-------------|------|----------|
| `gpt-4o-mini` | GPT-4o Mini via OpenRouter | Low cost | Reliable, JSON mode |
| `gpt-4o-mini-direct` | GPT-4o Mini (Direct) | Low cost | Direct OpenAI API |

### Claude Models

| Model ID | Description | Cost | Features |
|----------|-------------|------|----------|
| `claude-3-haiku` | Claude 3 Haiku | Medium cost | Fast, large context |

## Adding New Models

To add a new model, edit `src/lib/llm-config.ts`:

1. **Add to PROVIDERS** (if new provider):
```typescript
export const PROVIDERS: Record<string, ModelProvider> = {
  // existing providers...
  
  'new-provider': {
    name: 'New Provider',
    description: 'Description of the provider',
    baseUrl: 'https://api.newprovider.com/v1',
    requiresApiKey: 'VITE_NEW_PROVIDER_API_KEY',
    // optional headers, site info, etc.
  }
};
```

2. **Add to MODELS**:
```typescript
export const MODELS: Record<string, ModelConfig> = {
  // existing models...
  
  'new-model': {
    name: 'new-model',
    displayName: 'New Model Name',
    provider: 'new-provider', // or existing provider
    modelId: 'actual-model-id-from-provider',
    description: 'Description of the model',
    features: {
      supportsJsonMode: true, // or false
      maxTokens: 8192,
      costTier: 'low', // 'free', 'low', 'medium', 'high'
      speed: 'fast' // 'fast', 'medium', 'slow'
    },
    parameters: {
      temperature: 0.7,
      maxTokens: 4096
    }
  }
};
```

3. **Update activeModel**:
```typescript
export const CONFIG = {
  activeModel: 'new-model', // Use your new model
  // ...
};
```

## Configuration Options

### Global Settings

```typescript
export const CONFIG = {
  // Active model
  activeModel: 'deepseek-chat-free',
  
  // Fallback models (tried if primary fails)
  fallbackModels: ['gpt-4o-mini', 'claude-3-haiku'],
  
  // Request timeout in milliseconds
  requestTimeout: 30000,
  
  // Retry configuration
  retries: {
    maxAttempts: 3,
    delayMs: 1000
  },
  
  // Enable debug logging
  debug: false
};
```

### Model Features

- **supportsJsonMode**: Whether the model supports structured JSON output
- **maxTokens**: Maximum tokens the model can handle
- **costTier**: Relative cost ('free', 'low', 'medium', 'high')
- **speed**: Relative response speed ('fast', 'medium', 'slow')

## Troubleshooting

### Common Issues

1. **"API key not found" error**
   - Make sure `.env` file exists and contains the correct API key
   - Check that the environment variable name matches the provider configuration

2. **Model not found**
   - Verify the model ID exists in the MODELS configuration
   - Check that the provider supports the model

3. **Request timeout**
   - Increase `CONFIG.requestTimeout` for slower models
   - Check your internet connection

### Debug Mode

Enable debug logging to see detailed request/response information:

```typescript
export const CONFIG = {
  // ...
  debug: true
};
```

This will log:
- Request details (model, headers, body)
- Response data
- Retry attempts
- Fallback model usage

## Best Practices

1. **Start with free models** like `deepseek-chat-free` for development
2. **Use fallback models** to ensure reliability
3. **Monitor costs** when using paid models
4. **Test model switching** before production use
5. **Keep API keys secure** and never commit them to version control

## Performance Comparison

| Model | Speed | Quality | Cost | JSON Support |
|-------|-------|---------|------|--------------|
| DeepSeek Free | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Free | ✅ |
| DeepSeek Paid | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | $ | ✅ |
| GPT-4o Mini | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | $ | ✅ |
| Claude Haiku | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | $$ | ❌ |
``` 