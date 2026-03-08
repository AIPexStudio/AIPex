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
const STORAGE_KEY = "cachedModelList";
const STORAGE_TIMESTAMP_KEY = "cachedModelListTimestamp";
const MAX_MODELS = 200;

function getPriceLevel(
  pricing: ApiModelPricing,
): "cheap" | "normal" | "expensive" {
  const totalCost = pricing.input + pricing.output;
  if (totalCost < 2) return "cheap";
  if (totalCost < 10) return "normal";
  return "expensive";
}

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

function isValidApiResponse(data: unknown): data is ApiResponse {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  if (typeof obj.success !== "boolean") return false;
  if (typeof obj.data !== "object" || obj.data === null) return false;
  const d = obj.data as Record<string, unknown>;
  if (!Array.isArray(d.models)) return false;
  if (d.models.length > 0) {
    const first = d.models[0] as Record<string, unknown>;
    if (typeof first.id !== "string" || typeof first.name !== "string") {
      return false;
    }
  }
  return true;
}

// --- Persistent storage helpers ---

async function loadFromStorage(): Promise<ModelInfo[] | null> {
  try {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const result = await chrome.storage.local.get([STORAGE_KEY]);
      const models = result[STORAGE_KEY];
      if (Array.isArray(models) && models.length > 0) {
        return models as ModelInfo[];
      }
    }
  } catch {
    // Storage not available (e.g. in tests)
  }
  return null;
}

async function saveToStorage(
  models: ModelInfo[],
  serverTimestamp: number,
): Promise<void> {
  try {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      await chrome.storage.local.set({
        [STORAGE_KEY]: models,
        [STORAGE_TIMESTAMP_KEY]: serverTimestamp,
      });
    }
  } catch {
    // Ignore storage errors
  }
}

async function getStoredTimestamp(): Promise<number> {
  try {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const result = await chrome.storage.local.get([STORAGE_TIMESTAMP_KEY]);
      const ts = result[STORAGE_TIMESTAMP_KEY];
      if (typeof ts === "number") return ts;
    }
  } catch {
    // Ignore
  }
  return 0;
}

// --- In-memory cache (fast path) ---

let cachedModels: ModelInfo[] | null = null;
let cachedServerTimestamp = 0;
let storageLoaded = false;

/**
 * Fetch models with a two-tier cache:
 * 1. In-memory cache (instant)
 * 2. chrome.storage.local (survives service worker restarts)
 *
 * On the first call, returns storage-cached models immediately.
 * A background fetch updates both caches when the server reports new data.
 */
export async function fetchModels(): Promise<ModelInfo[]> {
  // 1. Fast path: in-memory cache
  if (cachedModels) {
    // Trigger background refresh (fire-and-forget)
    void refreshFromServer();
    return cachedModels;
  }

  // 2. Try loading from persistent storage
  if (!storageLoaded) {
    storageLoaded = true;
    const stored = await loadFromStorage();
    if (stored) {
      cachedModels = stored;
      cachedServerTimestamp = await getStoredTimestamp();
      // Trigger background refresh
      void refreshFromServer();
      return cachedModels;
    }
  }

  // 3. Nothing cached: fetch synchronously and return
  return await fetchFromServer();
}

let refreshInFlight = false;

async function refreshFromServer(): Promise<void> {
  if (refreshInFlight) return;
  refreshInFlight = true;
  try {
    await fetchFromServer();
  } finally {
    refreshInFlight = false;
  }
}

async function fetchFromServer(): Promise<ModelInfo[]> {
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
      const serverTimestamp = data.data.cache?.lastUpdate ?? Date.now();

      // Only update if the server data is newer
      if (serverTimestamp > cachedServerTimestamp) {
        const models = data.data.models
          .slice(0, MAX_MODELS)
          .map(convertApiModel);
        cachedModels = models;
        cachedServerTimestamp = serverTimestamp;
        await saveToStorage(models, serverTimestamp);
        // Notify listeners that models changed
        notifyModelChange(models);
      }

      return cachedModels ?? FALLBACK_MODELS;
    }

    throw new Error("Empty model list from API");
  } catch {
    return cachedModels ?? FALLBACK_MODELS;
  }
}

// --- Change notification for components ---

type ModelChangeListener = (models: ModelInfo[]) => void;
const modelChangeListeners = new Set<ModelChangeListener>();

function notifyModelChange(models: ModelInfo[]): void {
  for (const listener of modelChangeListeners) {
    try {
      listener(models);
    } catch {
      // Don't let listener errors break the loop
    }
  }
}

/**
 * Subscribe to model list updates (triggered when server returns new data).
 * Returns an unsubscribe function.
 */
export function onModelListChange(listener: ModelChangeListener): () => void {
  modelChangeListeners.add(listener);
  return () => modelChangeListeners.delete(listener);
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
