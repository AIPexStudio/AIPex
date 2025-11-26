import type { KeyValueStorage } from "../storage/index.js";
import type { ConversationConfig } from "../types.js";
import { DEFAULT_CONVERSATION_CONFIG } from "./defaults.js";

export interface StoredConversationConfig {
  id: string;
  config: ConversationConfig;
}

const DEFAULT_CONFIG_ID = "default_conversation_config";
const STORAGE_OPTIONS = new Set<ConversationConfig["storage"]>([
  "memory",
  "indexeddb",
]);

export async function saveConversationConfig(
  storage: KeyValueStorage<StoredConversationConfig>,
  config: ConversationConfig,
  id = DEFAULT_CONFIG_ID,
): Promise<void> {
  const sanitizedConfig = sanitizeConfig(config);
  await storage.save(id, { id, config: sanitizedConfig });
}

export async function loadConversationConfig(
  storage: KeyValueStorage<StoredConversationConfig>,
  id = DEFAULT_CONFIG_ID,
): Promise<ConversationConfig> {
  let stored: StoredConversationConfig | null = null;
  try {
    stored = await storage.load(id);
  } catch {
    return DEFAULT_CONVERSATION_CONFIG;
  }

  if (!stored) {
    return DEFAULT_CONVERSATION_CONFIG;
  }

  const normalized = sanitizeStoredConfig(stored);
  if (!normalized) {
    return DEFAULT_CONVERSATION_CONFIG;
  }

  return {
    ...DEFAULT_CONVERSATION_CONFIG,
    ...normalized.config,
  };
}

function sanitizeStoredConfig(value: unknown): StoredConversationConfig | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const maybeId = (value as { id?: unknown }).id;
  const maybeConfig = (value as { config?: unknown }).config;

  if (typeof maybeId !== "string" || maybeId.length === 0) {
    return null;
  }

  const normalizedConfig = sanitizeConfig(maybeConfig);
  return { id: maybeId, config: normalizedConfig };
}

function sanitizeConfig(value: unknown): ConversationConfig {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_CONVERSATION_CONFIG };
  }

  const result: ConversationConfig = {};

  if (
    "enabled" in value &&
    typeof (value as { enabled: unknown }).enabled === "boolean"
  ) {
    result.enabled = (value as { enabled: boolean }).enabled;
  }

  if (
    "storage" in value &&
    typeof (value as { storage: unknown }).storage === "string" &&
    STORAGE_OPTIONS.has(
      (value as { storage: string }).storage as ConversationConfig["storage"],
    )
  ) {
    result.storage = (
      value as { storage: ConversationConfig["storage"] }
    ).storage;
  }

  return result;
}
