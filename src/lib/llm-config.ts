// LLM Configuration
// This file contains all model and provider configurations

// Универсальная LLM-конфигурация для EasyDaddy Extension
// Всё задаётся через переменные окружения или дефолты ниже

export interface LLMConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  headers?: Record<string, string>;
  siteUrl?: string;
  siteName?: string;
  supportsJsonMode?: boolean;
  maxTokens?: number;
  temperature?: number;
}

// Основная конфигурация — всё можно переопределить через .env.local
export const CONFIG = {
  // ID модели (например, deepseek/deepseek-r1-0528, openai/gpt-4o, anthropic/claude-3-haiku и т.д.)
  model: (import.meta as any).env.VITE_LLM_MODEL || 'deepseek/deepseek-chat-v3-0324:free',

  // Базовый URL API (по умолчанию OpenRouter)
  baseUrl: (import.meta as any).env.VITE_LLM_BASE_URL || 'https://openrouter.ai/api/v1',

  // API ключ (OpenRouter или OpenAI)
  apiKey:
    (import.meta as any).env.VITE_LLM_API_KEY ||
    (import.meta as any).env.VITE_OPENROUTER_API_KEY ||
    (import.meta as any).env.VITE_OPENAI_API_KEY,

  // Для рейтинга на openrouter (опционально)
  siteUrl: (import.meta as any).env.VITE_LLM_SITE_URL || 'https://easydaddy.extension',
  siteName: (import.meta as any).env.VITE_LLM_SITE_NAME || 'EasyDaddy Extension',

  // Поддержка structured JSON (можно вынести в env при необходимости)
  supportsJsonMode:
    (import.meta as any).env.VITE_LLM_SUPPORTS_JSON_MODE !== undefined
      ? (import.meta as any).env.VITE_LLM_SUPPORTS_JSON_MODE === 'true'
      : true,

  // Параметры генерации
  temperature: Number((import.meta as any).env.VITE_LLM_TEMPERATURE) || 0.7,
  maxTokens: Number((import.meta as any).env.VITE_LLM_MAX_TOKENS) || 4096,

  // Таймаут и ретраи
  requestTimeout: Number((import.meta as any).env.VITE_LLM_TIMEOUT) || 30000,
  retries: {
    maxAttempts: Number((import.meta as any).env.VITE_LLM_RETRIES) || 3,
    delayMs: Number((import.meta as any).env.VITE_LLM_RETRY_DELAY) || 1000,
  },

  // Debug mode
  debug: (import.meta as any).env.VITE_LLM_DEBUG === 'true',
};

console.log('[LLM CONFIG] apiKey:', CONFIG.apiKey);
console.log('[LLM CONFIG] baseUrl:', CONFIG.baseUrl);
console.log('[LLM CONFIG] model:', CONFIG.model);

// Универсальный билдер конфига для chat()
export const buildModelConfig = (): LLMConfig => {
  if (!CONFIG.apiKey) {
    throw new Error('API key not found. Please set VITE_LLM_API_KEY, VITE_OPENROUTER_API_KEY или VITE_OPENAI_API_KEY in .env.local');
  }
  return {
    apiKey: CONFIG.apiKey,
    baseUrl: CONFIG.baseUrl,
    model: CONFIG.model,
    siteUrl: CONFIG.siteUrl,
    siteName: CONFIG.siteName,
    supportsJsonMode: CONFIG.supportsJsonMode,
    maxTokens: CONFIG.maxTokens,
    temperature: CONFIG.temperature,
    headers: {
      ...(CONFIG.siteUrl ? { 'HTTP-Referer': CONFIG.siteUrl } : {}),
      ...(CONFIG.siteName ? { 'X-Title': CONFIG.siteName } : {}),
    },
  };
}; 