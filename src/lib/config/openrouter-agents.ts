/**
 * OpenRouter Agent Configuration
 *
 * This file defines all agents used in AIPex with their OpenRouter-compatible settings.
 * Each agent has specific parameters optimized for its role.
 */

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  // Model selection - users can override these
  defaultModel: string;
  // Whether this agent needs vision/multimodal capabilities
  requiresVision: boolean;
  // OpenRouter-compatible parameters
  temperature: number;
  topP: number;
  maxTokens: number;
  frequencyPenalty: number;
  presencePenalty: number;
}

/**
 * Agent Definitions
 *
 * Each agent has optimized parameters for its specific task:
 * - Planner: Higher temperature for creative problem decomposition
 * - Navigator: Low temperature for deterministic, reliable actions
 * - Analyzer: Medium temperature for balanced analysis
 * - Summarizer: Low-medium temperature for accurate summaries
 */
export const AGENTS: Record<string, AgentConfig> = {
  planner: {
    id: "planner",
    name: "Planner",
    description: "Plans and decomposes complex tasks into actionable steps",
    defaultModel: "anthropic/claude-3.5-sonnet",
    requiresVision: false,
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 4096,
    frequencyPenalty: 0.1,
    presencePenalty: 0.1,
  },
  navigator: {
    id: "navigator",
    name: "Navigator",
    description: "Executes browser actions with precision and reliability",
    defaultModel: "anthropic/claude-3.5-sonnet",
    requiresVision: true,
    temperature: 0.1,
    topP: 0.95,
    maxTokens: 2048,
    frequencyPenalty: 0.0,
    presencePenalty: 0.0,
  },
  analyzer: {
    id: "analyzer",
    name: "Analyzer",
    description: "Analyzes page content, extracts information, and provides insights",
    defaultModel: "anthropic/claude-3.5-sonnet",
    requiresVision: true,
    temperature: 0.3,
    topP: 0.9,
    maxTokens: 4096,
    frequencyPenalty: 0.0,
    presencePenalty: 0.1,
  },
  summarizer: {
    id: "summarizer",
    name: "Summarizer",
    description: "Creates concise, accurate summaries of content",
    defaultModel: "anthropic/claude-3.5-sonnet",
    requiresVision: false,
    temperature: 0.2,
    topP: 0.9,
    maxTokens: 2048,
    frequencyPenalty: 0.3,
    presencePenalty: 0.0,
  },
};

/**
 * OpenRouter API Configuration
 */
export const OPENROUTER_CONFIG = {
  baseUrl: "https://openrouter.ai/api/v1/chat/completions",
  // HTTP headers required by OpenRouter
  headers: {
    "HTTP-Referer": "https://aipex.app",
    "X-Title": "AIPex Browser Assistant",
  },
};

/**
 * Popular models available on OpenRouter
 * Models marked with requiresVision: true support image inputs
 * This is a fallback list - prefer fetching from API
 */
export const OPENROUTER_MODELS = [
  // Anthropic Claude Models
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    requiresVision: true,
  },
  {
    id: "anthropic/claude-3.5-sonnet:beta",
    name: "Claude 3.5 Sonnet (Beta)",
    provider: "Anthropic",
    requiresVision: true,
  },
  {
    id: "anthropic/claude-3-opus",
    name: "Claude 3 Opus",
    provider: "Anthropic",
    requiresVision: true,
  },
  {
    id: "anthropic/claude-3-haiku",
    name: "Claude 3 Haiku",
    provider: "Anthropic",
    requiresVision: true,
  },
  // OpenAI Models
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    requiresVision: true,
  },
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "OpenAI",
    requiresVision: true,
  },
  {
    id: "openai/gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "OpenAI",
    requiresVision: true,
  },
  // Google Models
  {
    id: "google/gemini-2.0-flash-exp:free",
    name: "Gemini 2.0 Flash (Free)",
    provider: "Google",
    requiresVision: true,
  },
  {
    id: "google/gemini-pro-1.5",
    name: "Gemini Pro 1.5",
    provider: "Google",
    requiresVision: true,
  },
  // Meta Models
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B",
    provider: "Meta",
    requiresVision: false,
  },
  // DeepSeek Models
  {
    id: "deepseek/deepseek-chat",
    name: "DeepSeek V3",
    provider: "DeepSeek",
    requiresVision: false,
  },
  {
    id: "deepseek/deepseek-r1",
    name: "DeepSeek R1",
    provider: "DeepSeek",
    requiresVision: false,
  },
  // Mistral Models
  {
    id: "mistralai/mistral-large",
    name: "Mistral Large",
    provider: "Mistral",
    requiresVision: false,
  },
  // Qwen Models
  {
    id: "qwen/qwen-2.5-72b-instruct",
    name: "Qwen 2.5 72B",
    provider: "Qwen",
    requiresVision: false,
  },
];

/**
 * OpenRouter model from API response
 */
export interface OpenRouterModel {
  id: string;
  name: string;
  provider: string;
  requiresVision: boolean;
  contextLength?: number;
  pricing?: {
    prompt: number;
    completion: number;
  };
}

/**
 * Fetch all available models from OpenRouter API
 */
export async function fetchOpenRouterModels(): Promise<OpenRouterModel[]> {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models");
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data = await response.json();
    const models: OpenRouterModel[] = data.data.map((model: any) => {
      // Extract provider from model ID (e.g., "anthropic/claude-3" -> "Anthropic")
      const providerSlug = model.id.split("/")[0];
      const provider = providerSlug
        .split("-")
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      // Check if model supports vision based on architecture or modality
      const requiresVision =
        model.architecture?.modality?.includes("image") ||
        model.architecture?.input_modalities?.includes("image") ||
        model.id.includes("vision") ||
        model.id.includes("gpt-4o") ||
        model.id.includes("claude-3") ||
        model.id.includes("gemini");

      return {
        id: model.id,
        name: model.name || model.id,
        provider,
        requiresVision,
        contextLength: model.context_length,
        pricing: model.pricing
          ? {
              prompt: parseFloat(model.pricing.prompt) || 0,
              completion: parseFloat(model.pricing.completion) || 0,
            }
          : undefined,
      };
    });

    // Sort by provider, then by name
    models.sort((a, b) => {
      const providerCompare = a.provider.localeCompare(b.provider);
      if (providerCompare !== 0) return providerCompare;
      return a.name.localeCompare(b.name);
    });

    return models;
  } catch (error) {
    console.error("Failed to fetch OpenRouter models:", error);
    // Return fallback models on error
    return OPENROUTER_MODELS;
  }
}

/**
 * Group models by provider
 */
export function groupModelsByProvider(
  models: OpenRouterModel[]
): Record<string, OpenRouterModel[]> {
  const grouped: Record<string, OpenRouterModel[]> = {};

  for (const model of models) {
    if (!grouped[model.provider]) {
      grouped[model.provider] = [];
    }
    grouped[model.provider].push(model);
  }

  // Sort providers alphabetically
  const sortedGrouped: Record<string, OpenRouterModel[]> = {};
  const sortedProviders = Object.keys(grouped).sort();

  for (const provider of sortedProviders) {
    // Sort models within each provider
    sortedGrouped[provider] = grouped[provider].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }

  return sortedGrouped;
}

/**
 * Get agent configuration by ID
 */
export function getAgentConfig(agentId: string): AgentConfig | undefined {
  return AGENTS[agentId];
}

/**
 * Get all agent IDs
 */
export function getAgentIds(): string[] {
  return Object.keys(AGENTS);
}

/**
 * Check if a model supports vision
 */
export function modelSupportsVision(modelId: string): boolean {
  const model = OPENROUTER_MODELS.find((m) => m.id === modelId);
  return model?.requiresVision ?? false;
}

/**
 * Get model display name
 */
export function getModelDisplayName(modelId: string): string {
  const model = OPENROUTER_MODELS.find((m) => m.id === modelId);
  return model?.name ?? modelId;
}

/**
 * Storage keys for agent model overrides
 */
export const STORAGE_KEYS = {
  apiKey: "openrouter_api_key",
  agentModels: "openrouter_agent_models",
};

/**
 * Default agent model assignments
 */
export function getDefaultAgentModels(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(AGENTS).map(([id, config]) => [id, config.defaultModel])
  );
}
