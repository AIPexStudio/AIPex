// API response types (must match server contract)
interface ApiModelPricing {
  input: number;
  output: number;
}

interface ApiModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  pricing: ApiModelPricing;
}

interface ApiResponse {
  success: boolean;
  data: {
    models: ApiModel[];
    count: number;
    cache: {
      lastUpdate: number;
      modelCount: number;
    };
  };
}

// Internal model info used by the chatbot UI
export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  description: string;
  supportsTools: boolean;
  contextLength?: number;
  pricing?: {
    input: string;
    output: string;
  };
  priceLevel: "cheap" | "normal" | "expensive";
}

// Fallback models in case API fails
const FALLBACK_MODELS: ModelInfo[] = [
  {
    id: "anthropic/claude-3-haiku",
    name: "Claude 3 Haiku",
    provider: "Anthropic",
    description: "Cost-effective choice for basic tasks",
    supportsTools: true,
    contextLength: 200_000,
    pricing: {
      input: "$0.30/1M tokens",
      output: "$1.50/1M tokens",
    },
    priceLevel: "cheap",
  },
  {
    id: "anthropic/claude-sonnet-4.5",
    name: "Claude Sonnet 4.5",
    provider: "Anthropic",
    description: "AI model for various tasks",
    supportsTools: true,
    contextLength: 200_000,
    pricing: {
      input: "$3.60/1M tokens",
      output: "$18.00/1M tokens",
    },
    priceLevel: "expensive",
  },
];

const MODELS_API_URL = "https://www.claudechrome.com/api/models";

// Convert API pricing to price level
function getPriceLevel(
  pricing: ApiModelPricing,
): "cheap" | "normal" | "expensive" {
  const totalCost = pricing.input + pricing.output;
  if (totalCost < 2) return "cheap";
  if (totalCost < 10) return "normal";
  return "expensive";
}

// Convert API model to internal ModelInfo
function convertApiModel(apiModel: ApiModel): ModelInfo {
  return {
    id: apiModel.id,
    name: apiModel.name,
    provider: apiModel.provider,
    description: apiModel.description,
    supportsTools: true,
    pricing: {
      input: `$${apiModel.pricing.input.toFixed(2)}/1M tokens`,
      output: `$${apiModel.pricing.output.toFixed(2)}/1M tokens`,
    },
    priceLevel: getPriceLevel(apiModel.pricing),
  };
}

// Validate that the API response matches the expected schema
function isValidApiResponse(data: unknown): data is ApiResponse {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  if (typeof obj.success !== "boolean") return false;
  if (typeof obj.data !== "object" || obj.data === null) return false;
  const d = obj.data as Record<string, unknown>;
  if (!Array.isArray(d.models)) return false;
  // Validate first model shape if present
  if (d.models.length > 0) {
    const first = d.models[0] as Record<string, unknown>;
    if (typeof first.id !== "string" || typeof first.name !== "string") {
      return false;
    }
  }
  return true;
}

// Cache for models
let cachedModels: ModelInfo[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_MODELS = 200; // Safety cap on number of models

/**
 * Fetch models from the server API with caching and fallback.
 * Returns cached result if still valid (5 min TTL).
 * Falls back to FALLBACK_MODELS on any error.
 */
export async function fetchModels(): Promise<ModelInfo[]> {
  // Return cached models if still valid
  if (cachedModels && Date.now() - lastFetchTime < CACHE_DURATION) {
    return cachedModels;
  }

  try {
    const response = await fetch(MODELS_API_URL);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data: unknown = await response.json();

    if (!isValidApiResponse(data)) {
      throw new Error("Invalid API response structure");
    }

    if (data.success && data.data.models.length > 0) {
      // Apply safety cap
      const models = data.data.models
        .slice(0, MAX_MODELS)
        .map(convertApiModel);
      cachedModels = models;
      lastFetchTime = Date.now();
      return cachedModels;
    }

    throw new Error("Empty model list from API");
  } catch (_error) {
    // Return fallback - do not log sensitive details
    return FALLBACK_MODELS;
  }
}

/**
 * Fetch models and convert to the {name, value} format used by the model selector.
 */
export async function fetchModelsForSelector(): Promise<
  Array<{ name: string; value: string }>
> {
  const models = await fetchModels();
  return models.map((m) => ({ name: m.name, value: m.id }));
}

/**
 * Fetch models as ModelInfo[] for ModelChangePrompt compatibility.
 */
export async function fetchModelsForPrompt(): Promise<ModelInfo[]> {
  return fetchModels();
}
