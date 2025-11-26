import { describe, expect, it } from "vitest";
import { InMemoryStorage } from "../storage/memory.js";
import type { ConversationConfig } from "../types.js";
import {
  loadConversationConfig,
  type StoredConversationConfig,
  saveConversationConfig,
} from "./storage.js";

describe("Conversation config storage helpers", () => {
  it("should return defaults when config not stored", async () => {
    const storage = new InMemoryStorage<StoredConversationConfig>();
    const config = await loadConversationConfig(storage);

    expect(config.enabled).toBe(true);
    expect(config.storage).toBe("memory");
  });

  it("should persist and merge configs", async () => {
    const storage = new InMemoryStorage<StoredConversationConfig>();
    const custom: ConversationConfig = {
      enabled: false,
      storage: "filesystem",
    };

    await saveConversationConfig(storage, custom, "custom");
    const config = await loadConversationConfig(storage, "custom");

    expect(config.enabled).toBe(false);
    expect(config.storage).toBe("filesystem");
  });
});
