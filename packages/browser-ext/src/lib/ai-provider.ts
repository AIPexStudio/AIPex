import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { AIProvider, ChatSettings } from "~/types";

export interface ProviderConfig {
  provider: AIProvider;
  apiKey: string;
  baseURL?: string;
}

const PROVIDER_DEFAULTS: Record<AIProvider, { baseURL: string }> = {
  openai: { baseURL: "https://api.openai.com/v1" },
  anthropic: { baseURL: "https://api.anthropic.com" },
  google: { baseURL: "https://generativelanguage.googleapis.com/v1beta" },
};

export function createAIProvider(settings: ChatSettings) {
  const provider = settings.aiProvider ?? "openai";
  const apiKey = settings.aiToken ?? "";
  const baseURL = settings.aiHost || PROVIDER_DEFAULTS[provider].baseURL;

  switch (provider) {
    case "anthropic":
      return createAnthropic({ apiKey, baseURL });
    case "google":
      return createGoogleGenerativeAI({ apiKey, baseURL });
    default:
      return createOpenAI({ apiKey, baseURL });
  }
}
