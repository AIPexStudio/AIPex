import type { ConversationConfig } from "../types.js";
import { DEFAULT_CONVERSATION_CONFIG } from "./defaults.js";

const STORAGE_OPTIONS: ReadonlySet<ConversationConfig["storage"]> = new Set([
  "memory",
  "indexeddb",
]);

/**
 * Merge user provided overrides with the default conversation config.
 * Throws when overrides contain invalid values so callers can fail fast
 * instead of silently falling back to defaults.
 */
export function createConversationConfig(
  overrides?: ConversationConfig,
): ConversationConfig {
  if (!overrides || Object.keys(overrides).length === 0) {
    return { ...DEFAULT_CONVERSATION_CONFIG };
  }

  const normalized = normalizeConversationConfig(overrides);

  return {
    ...DEFAULT_CONVERSATION_CONFIG,
    ...normalized,
  };
}

/**
 * Ensure a value only contains valid conversation config properties.
 * Returns a sanitized object with only accepted keys.
 */
export function normalizeConversationConfig(
  value: unknown,
): ConversationConfig {
  if (!value || typeof value !== "object") {
    throw new TypeError("Conversation config must be an object.");
  }

  const result: ConversationConfig = {};

  if ("enabled" in value) {
    const enabled = (value as { enabled?: unknown }).enabled;
    if (typeof enabled !== "boolean") {
      throw new TypeError("Conversation config 'enabled' must be boolean.");
    }
    result.enabled = enabled;
  }

  if ("storage" in value) {
    const storage = (value as { storage?: unknown }).storage;
    if (typeof storage !== "string") {
      throw new TypeError("Conversation config 'storage' must be a string.");
    }
    if (!STORAGE_OPTIONS.has(storage as ConversationConfig["storage"])) {
      throw new TypeError(
        "Conversation config 'storage' must be one of: memory | indexeddb.",
      );
    }
    result.storage = storage as ConversationConfig["storage"];
  }

  return result;
}

export function isValidConversationStorage(
  value: unknown,
): value is ConversationConfig["storage"] {
  if (typeof value !== "string") {
    return false;
  }
  return STORAGE_OPTIONS.has(value as ConversationConfig["storage"]);
}
