import type { ConversationConfig } from "../types.js";
import {
  DEFAULT_COMPRESSION_CONFIG,
  DEFAULT_CONVERSATION_CONFIG,
} from "./defaults.js";

export class ConfigBuilder {
  private config: Partial<ConversationConfig> = {};

  withStorage(storage: "memory" | "indexeddb"): this {
    this.config.storage = storage;
    return this;
  }

  withMaxHistoryLength(length: number): this {
    if (length < 1) {
      throw new Error("Max history length must be positive");
    }
    this.config.maxHistoryLength = length;
    return this;
  }

  withMaxContextTokens(tokens: number): this {
    if (tokens < 1) {
      throw new Error("Max context tokens must be positive");
    }
    this.config.maxContextTokens = tokens;
    return this;
  }

  withCompression(enabled: boolean): this {
    if (enabled) {
      this.config.compression = { ...DEFAULT_COMPRESSION_CONFIG };
    } else {
      this.config.compression = undefined;
    }
    return this;
  }

  build(): ConversationConfig {
    return {
      ...DEFAULT_CONVERSATION_CONFIG,
      ...this.config,
    };
  }
}
