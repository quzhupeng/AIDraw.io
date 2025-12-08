import { bedrock } from '@ai-sdk/amazon-bedrock';
import { openai, createOpenAI } from '@ai-sdk/openai';
import { anthropic, createAnthropic } from '@ai-sdk/anthropic';
import { google, createGoogleGenerativeAI } from '@ai-sdk/google';
import { azure, createAzure } from '@ai-sdk/azure';
import { ollama, createOllama } from 'ollama-ai-provider-v2';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

export type ProviderName =
  | 'bedrock'
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'azure'
  | 'ollama'
  | 'openrouter'
  // 中国大模型
  | 'deepseek'
  | 'zhipu'
  | 'qwen'
  | 'doubao'
  | 'moonshot'
  | 'baichuan'
  | 'minimax';

interface ModelConfig {
  model: any;
  providerOptions?: any;
}

export interface DynamicApiSettings {
  provider: ProviderName;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

// 中国大模型 API 端点配置
const CHINA_PROVIDER_BASE_URLS: Partial<Record<ProviderName, string>> = {
  deepseek: 'https://api.deepseek.com/v1',
  zhipu: 'https://open.bigmodel.cn/api/paas/v4',
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  doubao: 'https://ark.cn-beijing.volces.com/api/v3',
  moonshot: 'https://api.moonshot.cn/v1',
  baichuan: 'https://api.baichuan-ai.com/v1',
  minimax: 'https://api.minimax.chat/v1',
};

// Anthropic beta headers for fine-grained tool streaming
const ANTHROPIC_BETA_OPTIONS = {
  anthropic: {
    additionalModelRequestFields: {
      anthropic_beta: ['fine-grained-tool-streaming-2025-05-14']
    }
  }
};

/**
 * Validate that required API keys are present for the selected provider
 */
function validateProviderCredentials(provider: ProviderName): void {
  const requiredEnvVars: Record<ProviderName, string | null> = {
    bedrock: 'AWS_ACCESS_KEY_ID',
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    google: 'GOOGLE_GENERATIVE_AI_API_KEY',
    azure: 'AZURE_API_KEY',
    ollama: null, // No credentials needed for local Ollama
    openrouter: 'OPENROUTER_API_KEY',
    // 中国大模型 - 使用用户配置的 API key，不需要环境变量
    deepseek: null,
    zhipu: null,
    qwen: null,
    doubao: null,
    moonshot: null,
    baichuan: null,
    minimax: null,
  };

  const requiredVar = requiredEnvVars[provider];
  if (requiredVar && !process.env[requiredVar]) {
    throw new Error(
      `${requiredVar} environment variable is required for ${provider} provider. ` +
      `Please set it in your .env.local file.`
    );
  }
}

/**
 * Get the AI model based on environment variables
 *
 * Environment variables:
 * - AI_PROVIDER: The provider to use (bedrock, openai, anthropic, google, azure, ollama, openrouter)
 * - AI_MODEL: The model ID/name for the selected provider
 *
 * Provider-specific env vars:
 * - OPENAI_API_KEY: OpenAI API key
 * - ANTHROPIC_API_KEY: Anthropic API key
 * - GOOGLE_GENERATIVE_AI_API_KEY: Google API key
 * - AZURE_RESOURCE_NAME, AZURE_API_KEY: Azure OpenAI credentials
 * - AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY: AWS Bedrock credentials
 * - OLLAMA_BASE_URL: Ollama server URL (optional, defaults to http://localhost:11434)
 * - OPENROUTER_API_KEY: OpenRouter API key
 */
export function getAIModel(): ModelConfig {
  const provider = (process.env.AI_PROVIDER || 'bedrock') as ProviderName;
  const modelId = process.env.AI_MODEL;

  if (!modelId) {
    throw new Error(
      `AI_MODEL environment variable is required. Example: AI_MODEL=claude-sonnet-4-5`
    );
  }

  // Validate provider credentials
  validateProviderCredentials(provider);

  // Log initialization for debugging
  console.log(`[AI Provider] Initializing ${provider} with model: ${modelId}`);

  let model: any;
  let providerOptions: any = undefined;

  switch (provider) {
    case 'bedrock':
      model = bedrock(modelId);
      // Add Anthropic beta headers if using Claude models via Bedrock
      if (modelId.includes('anthropic.claude')) {
        providerOptions = ANTHROPIC_BETA_OPTIONS;
      }
      break;

    case 'openai':
      model = openai(modelId);
      break;

    case 'anthropic':
      model = anthropic(modelId);
      // Add beta headers for fine-grained tool streaming
      providerOptions = ANTHROPIC_BETA_OPTIONS;
      break;

    case 'google':
      model = google(modelId);
      break;

    case 'azure':
      model = azure(modelId);
      break;

    case 'ollama':
      model = ollama(modelId);
      break;

    case 'openrouter':
      const openrouter = createOpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY,
      });
      model = openrouter(modelId);
      break;

    default:
      throw new Error(
        `Unknown AI provider: ${provider}. Supported providers: bedrock, openai, anthropic, google, azure, ollama, openrouter`
      );
  }

  // Log if provider options are being applied
  if (providerOptions) {
    console.log('[AI Provider] Applying provider-specific options');
  }

  return { model, providerOptions };
}

/**
 * Get AI model from user-provided settings (client-side configuration)
 * This allows users to configure their own API keys and providers
 */
export function getAIModelFromSettings(settings: DynamicApiSettings): ModelConfig {
  const { provider, apiKey, model: modelId, baseUrl } = settings;

  if (!modelId) {
    throw new Error('Model ID is required');
  }

  console.log(`[AI Provider] Initializing ${provider} with model: ${modelId} (user config)`);

  let model: any;
  let providerOptions: any = undefined;

  switch (provider) {
    case 'bedrock':
      // Bedrock uses server-side env vars, not user API key
      model = bedrock(modelId);
      if (modelId.includes('anthropic.claude')) {
        providerOptions = ANTHROPIC_BETA_OPTIONS;
      }
      break;

    case 'openai':
      if (baseUrl) {
        // 使用自定义 Base URL 时，走 OpenAI Compatible 模式（支持第三方 API 中转）
        const customOpenAICompatible = createOpenAICompatible({
          name: 'openai-compatible',
          apiKey,
          baseURL: baseUrl,
        });
        model = customOpenAICompatible(modelId);
      } else {
        const customOpenAI = createOpenAI({ apiKey });
        model = customOpenAI(modelId);
      }
      break;

    case 'anthropic':
      const customAnthropic = createAnthropic({ apiKey });
      model = customAnthropic(modelId);
      providerOptions = ANTHROPIC_BETA_OPTIONS;
      break;

    case 'google':
      const customGoogle = createGoogleGenerativeAI({ apiKey });
      model = customGoogle(modelId);
      break;

    case 'azure':
      if (!baseUrl) {
        throw new Error('Azure requires a resource name/base URL');
      }
      const customAzure = createAzure({
        apiKey,
        resourceName: baseUrl,
      });
      model = customAzure(modelId);
      break;

    case 'ollama':
      const customOllama = createOllama({
        baseURL: baseUrl || 'http://localhost:11434/api',
      });
      model = customOllama(modelId);
      break;

    case 'openrouter':
      const customOpenRouter = createOpenRouter({ apiKey });
      model = customOpenRouter(modelId);
      break;

    // 中国大模型 - 使用 OpenAI Compatible 接口
    case 'deepseek':
    case 'zhipu':
    case 'qwen':
    case 'doubao':
    case 'moonshot':
    case 'baichuan':
    case 'minimax': {
      const chinaBaseUrl = baseUrl || CHINA_PROVIDER_BASE_URLS[provider];
      if (!chinaBaseUrl) {
        throw new Error(`Base URL is required for ${provider}`);
      }

      console.log(`[AI Provider] Creating ${provider} client with baseURL: ${chinaBaseUrl}`);

      const chinaProvider = createOpenAICompatible({
        name: provider,
        apiKey,
        baseURL: chinaBaseUrl,
        // 添加超时配置
        fetch: async (url, init) => {
          console.log(`[${provider}] Fetching:`, url);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes timeout

          try {
            const response = await fetch(url, {
              ...init,
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
            console.log(`[${provider}] Response status:`, response.status);
            return response;
          } catch (error) {
            clearTimeout(timeoutId);
            console.error(`[${provider}] Fetch error:`, error);
            throw error;
          }
        },
      });
      model = chinaProvider(modelId);

      console.log(`[AI Provider] ${provider} model initialized:`, modelId);
      break;
    }

    default:
      throw new Error(
        `Unknown AI provider: ${provider}. Supported providers: bedrock, openai, anthropic, google, azure, ollama, openrouter, deepseek, zhipu, qwen, doubao, moonshot, baichuan, minimax`
      );
  }

  if (providerOptions) {
    console.log('[AI Provider] Applying provider-specific options');
  }

  return { model, providerOptions };
}
