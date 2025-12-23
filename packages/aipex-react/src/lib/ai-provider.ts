/**
 * AI Provider Factory
 * Creates AI SDK provider instances based on configuration
 */

import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { AIProviderKey, AppSettings } from "@aipexstudio/aipex-core";

export interface ProviderConfig {
  provider: AIProviderKey;
  apiKey: string;
  baseURL?: string;
}

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
 * });
 *
 * const model = provider("gpt-4");
 * ```
 */
export function createAIProvider(settings: AppSettings) {
  const provider = settings.aiProvider ?? "openai";
  const apiKey = settings.aiToken ?? "";
  const baseURL = settings.aiHost || undefined;

  switch (provider) {
    case "anthropic":
      return createAnthropic({ apiKey, baseURL });
    case "google":
      return createGoogleGenerativeAI({ apiKey, baseURL });
    case "openai":
      return createOpenAI({ apiKey, baseURL });
    default:
      // For custom providers, baseURL is required
      if (!baseURL) {
        throw new Error(
          `Custom provider "${provider}" requires aiHost to be specified`,
        );
      }
      return createOpenAICompatible({ apiKey, baseURL, name: provider });
  }
}
