import type { KeyValueStorage } from "../storage/index.js";
import type { ConversationConfig } from "../types.js";
import { DEFAULT_CONVERSATION_CONFIG } from "./defaults.js";

export interface StoredConversationConfig {
  id: string;
  config: ConversationConfig;
}

const DEFAULT_CONFIG_ID = "default_conversation_config";

export async function saveConversationConfig(
  storage: KeyValueStorage<StoredConversationConfig>,
  config: ConversationConfig,
  id = DEFAULT_CONFIG_ID,
): Promise<void> {
  await storage.save(id, { id, config });
}

export async function loadConversationConfig(
  storage: KeyValueStorage<StoredConversationConfig>,
  id = DEFAULT_CONFIG_ID,
): Promise<ConversationConfig> {
  const stored = await storage.load(id);
  if (!stored) {
    return DEFAULT_CONVERSATION_CONFIG;
  }

  return {
    ...DEFAULT_CONVERSATION_CONFIG,
    ...stored.config,
  };
}
