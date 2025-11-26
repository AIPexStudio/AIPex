import type { ConversationConfig } from "../types.js";
import { DEFAULT_CONVERSATION_CONFIG } from "./defaults.js";

export class ConfigBuilder {
  private config: Partial<ConversationConfig> = {};

  withStorage(storage: "memory" | "indexeddb" | "filesystem"): this {
    this.config.storage = storage;
    return this;
  }

  build(): ConversationConfig {
    return {
      ...DEFAULT_CONVERSATION_CONFIG,
      ...this.config,
    };
  }
}
