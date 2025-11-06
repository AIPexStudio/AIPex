import { ClaudeProvider } from "./claude-provider.js";
import { GeminiProvider } from "./gemini-provider.js";
import { OpenAIProvider } from "./openai-provider.js";
import type { LLMProvider } from "./provider.js";

export interface LLMProviderConfig {
  provider: "gemini" | "openai" | "claude";
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export function createLLMProvider(config: LLMProviderConfig): LLMProvider {
  switch (config.provider) {
    case "gemini":
      return new GeminiProvider({
        apiKey: config.apiKey,
        model: config.model,
      });
    case "openai":
      return new OpenAIProvider({
        apiKey: config.apiKey,
        model: config.model,
        baseUrl: config.baseUrl,
      });
    case "claude":
      return new ClaudeProvider({
        apiKey: config.apiKey,
        model: config.model,
      });
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}
