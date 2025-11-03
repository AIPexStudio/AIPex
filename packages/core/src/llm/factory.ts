import { GeminiProvider } from "./gemini-provider.js";
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
      throw new Error("OpenAI provider not yet implemented");
    case "claude":
      throw new Error("Claude provider not yet implemented");
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}
