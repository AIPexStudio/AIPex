/**
 * AI Provider Factory
 * Creates AI SDK provider instances based on configuration
 */

import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { AIProviderKey, AppSettings } from "@aipexstudio/aipex-core";

export interface ProviderConfig {
  provider: AIProviderKey;
  apiKey: string;
  baseURL?: string;
}

const PROVIDER_DEFAULTS = {
  openai: { baseURL: "https://api.openai.com/v1" },
  anthropic: { baseURL: "https://api.anthropic.com" },
  google: { baseURL: "https://generativelanguage.googleapis.com/v1beta" },
} as const;

const DEFAULT_BASE_URL = "https://api.openai.com/v1";

/**
 * Create an AI SDK provider instance based on settings
 *
 * @param settings - Chat settings containing provider, token, and host
 * @returns AI SDK provider instance (OpenAI, Anthropic, or Google)
 *
 * @example
 * ```typescript
 * const provider = createAIProvider({
 *   aiProvider: "openai",
 *   aiToken: "sk-...",
 *   aiHost: "https://api.openai.com/v1"
 * });
 *
 * const model = provider("gpt-4");
 * ```
 */
export function createAIProvider(settings: AppSettings) {
  const provider = settings.aiProvider ?? "openai";
  const apiKey = settings.aiToken ?? "";
  const defaults =
    PROVIDER_DEFAULTS[provider as keyof typeof PROVIDER_DEFAULTS];
  const baseURL = settings.aiHost || defaults?.baseURL || DEFAULT_BASE_URL;

  switch (provider) {
    case "anthropic":
      return createAnthropic({ apiKey, baseURL });
    case "google":
      return createGoogleGenerativeAI({ apiKey, baseURL });
    default:
      return createOpenAICompatible({ apiKey, baseURL, name: provider });
  }
}
