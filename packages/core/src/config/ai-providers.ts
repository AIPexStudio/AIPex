import type { ProviderType } from "./types.js";

export interface AIProviderConfig {
  name: string;
  icon: string;
  host?: string;
  models: readonly string[];
  tokenPlaceholder: string;
  docs: string;
  providerType: ProviderType;
}

export const AI_PROVIDERS = {
  custom: {
    name: "Custom",
    icon: "⚙️",
    host: "",
    models: [] as const,
    tokenPlaceholder: "Your API Key",
    docs: "",
    providerType: "openai",
  },
  openai: {
    name: "OpenAI",
    icon: "🤖",
    host: "https://api.openai.com/v1",
    models: ["gpt-4o", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"] as const,
    tokenPlaceholder: "sk-...",
    docs: "https://platform.openai.com/api-keys",
    providerType: "openai",
  },
  anthropic: {
    name: "Anthropic",
    icon: "🧠",
    host: "https://api.anthropic.com",
    models: [
      "claude-sonnet-4-20250514",
      "claude-3-5-sonnet-20241022",
      "claude-3-opus-20240229",
    ] as const,
    tokenPlaceholder: "sk-ant-...",
    docs: "https://console.anthropic.com/settings/keys",
    providerType: "claude",
  },
  google: {
    name: "Google",
    icon: "🔍",
    models: [
      "gemini-2.5-flash-exp",
      "gemini-1.5-pro",
      "gemini-1.5-flash",
    ] as const,
    tokenPlaceholder: "AIza...",
    docs: "https://aistudio.google.com/app/apikey",
    providerType: "google",
  },
  openrouter: {
    name: "OpenRouter",
    icon: "🔀",
    host: "https://openrouter.ai/api/v1",
    models: [
      "anthropic/claude-3.5-sonnet",
      "openai/gpt-4o",
      "google/gemini-pro-1.5",
      "meta-llama/llama-3.1-70b-instruct",
      "deepseek/deepseek-chat",
    ] as const,
    tokenPlaceholder: "sk-or-v1-...",
    docs: "https://openrouter.ai/keys",
    providerType: "openai",
  },
  deepseek: {
    name: "DeepSeek",
    icon: "🔍",
    host: "https://api.deepseek.com/v1",
    models: ["deepseek-chat", "deepseek-coder"] as const,
    tokenPlaceholder: "sk-...",
    docs: "https://platform.deepseek.com/api_keys",
    providerType: "openai",
  },
  groq: {
    name: "Groq",
    icon: "⚡",
    host: "https://api.groq.com/openai/v1",
    models: [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "mixtral-8x7b-32768",
    ] as const,
    tokenPlaceholder: "gsk_...",
    docs: "https://console.groq.com/keys",
    providerType: "openai",
  },
  together: {
    name: "Together AI",
    icon: "🤝",
    host: "https://api.together.xyz/v1",
    models: [
      "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
      "mistralai/Mixtral-8x7B-Instruct-v0.1",
      "deepseek-ai/deepseek-coder-33b-instruct",
    ] as const,
    tokenPlaceholder: "...",
    docs: "https://api.together.xyz/settings/api-keys",
    providerType: "openai",
  },
  mistral: {
    name: "Mistral AI",
    icon: "🌬️",
    host: "https://api.mistral.ai/v1",
    models: [
      "mistral-large-latest",
      "mistral-medium-latest",
      "mistral-small-latest",
    ] as const,
    tokenPlaceholder: "...",
    docs: "https://console.mistral.ai/api-keys",
    providerType: "openai",
  },
  cohere: {
    name: "Cohere",
    icon: "🔗",
    host: "https://api.cohere.ai/v1",
    models: ["command-r-plus", "command-r", "command"] as const,
    tokenPlaceholder: "...",
    docs: "https://dashboard.cohere.com/api-keys",
    providerType: "openai",
  },
  perplexity: {
    name: "Perplexity",
    icon: "🔎",
    host: "https://api.perplexity.ai",
    models: [
      "llama-3.1-sonar-large-128k-online",
      "llama-3.1-sonar-small-128k-online",
    ] as const,
    tokenPlaceholder: "pplx-...",
    docs: "https://www.perplexity.ai/settings/api",
    providerType: "openai",
  },
  fireworks: {
    name: "Fireworks AI",
    icon: "🎆",
    host: "https://api.fireworks.ai/inference/v1",
    models: [
      "accounts/fireworks/models/llama-v3p1-70b-instruct",
      "accounts/fireworks/models/mixtral-8x7b-instruct",
    ] as const,
    tokenPlaceholder: "fw_...",
    docs: "https://fireworks.ai/api-keys",
    providerType: "openai",
  },
  replicate: {
    name: "Replicate",
    icon: "🔁",
    host: "https://api.replicate.com/v1",
    models: [
      "meta/llama-2-70b-chat",
      "mistralai/mixtral-8x7b-instruct-v0.1",
    ] as const,
    tokenPlaceholder: "r8_...",
    docs: "https://replicate.com/account/api-tokens",
    providerType: "openai",
  },
  azure: {
    name: "Azure OpenAI",
    icon: "☁️",
    host: "https://YOUR-RESOURCE.openai.azure.com/openai/deployments/YOUR-DEPLOYMENT",
    models: ["gpt-4", "gpt-35-turbo"] as const,
    tokenPlaceholder: "YOUR-API-KEY",
    docs: "https://portal.azure.com",
    providerType: "openai",
  },
} as const satisfies Record<string, AIProviderConfig>;

export type AIProviderKey = keyof typeof AI_PROVIDERS;

export function detectProviderFromHost(host: string): AIProviderKey {
  if (host.includes("api.openai.com")) return "openai";
  if (host.includes("anthropic.com")) return "anthropic";
  if (host.includes("generativelanguage.googleapis.com")) return "google";
  if (host.includes("openrouter.ai")) return "openrouter";
  if (host.includes("deepseek.com")) return "deepseek";
  if (host.includes("groq.com")) return "groq";
  if (host.includes("together.xyz")) return "together";
  if (host.includes("mistral.ai")) return "mistral";
  if (host.includes("cohere.ai")) return "cohere";
  if (host.includes("perplexity.ai")) return "perplexity";
  if (host.includes("fireworks.ai")) return "fireworks";
  if (host.includes("replicate.com")) return "replicate";
  if (host.includes("azure.com")) return "azure";
  return "custom";
}
