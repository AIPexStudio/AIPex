import { describe, expect, it } from "vitest";
import { DEFAULT_CONVERSATION_CONFIG } from "./defaults.js";
import {
  createConversationConfig,
  isValidConversationStorage,
  normalizeConversationConfig,
} from "./utils.js";

describe("conversation config helpers", () => {
  it("returns defaults when no overrides provided", () => {
    const config = createConversationConfig();

    expect(config).toEqual(DEFAULT_CONVERSATION_CONFIG);
  });

  it("merges overrides with defaults", () => {
    const config = createConversationConfig({ enabled: false });

    expect(config.enabled).toBe(false);
    expect(config.storage).toBe(DEFAULT_CONVERSATION_CONFIG.storage);
  });

  it("rejects invalid shapes", () => {
    expect(() => normalizeConversationConfig(undefined)).toThrowError(
      /must be an object/i,
    );

    expect(() => normalizeConversationConfig({ enabled: "true" })).toThrowError(
      /must be boolean/i,
    );

    expect(() => normalizeConversationConfig({ storage: "fs" })).toThrowError(
      /must be one of/i,
    );
  });

  it("validates storage values", () => {
    expect(isValidConversationStorage("memory")).toBe(true);
    expect(isValidConversationStorage("indexeddb")).toBe(true);
    expect(isValidConversationStorage("disk")).toBe(false);
    expect(isValidConversationStorage(123)).toBe(false);
  });
});
