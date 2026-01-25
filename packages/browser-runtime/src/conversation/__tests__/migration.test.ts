import { describe, it, expect, beforeEach, vi } from "vitest";
import { ConversationMigration } from "../migration";
import type { ConversationData } from "../types";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
  writable: true,
});

describe("ConversationMigration", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  const createMockConversation = (id: string): ConversationData => ({
    id,
    title: `Conversation ${id}`,
    messages: [
      {
        id: "msg1",
        role: "user",
        parts: [{ type: "text", text: "Hello" }],
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  describe("checkMigrationStatus", () => {
    it("should return false when migration flag is not set", async () => {
      const status = await ConversationMigration.checkMigrationStatus();
      expect(status).toBe(false);
    });

    it("should return true when migration flag is set to 'true'", async () => {
      localStorage.setItem("aipex-conversations-migrated", "true");
      const status = await ConversationMigration.checkMigrationStatus();
      expect(status).toBe(true);
    });

    it("should return false when migration flag is set to other value", async () => {
      localStorage.setItem("aipex-conversations-migrated", "false");
      const status = await ConversationMigration.checkMigrationStatus();
      expect(status).toBe(false);
    });
  });

  describe("markMigrationComplete", () => {
    it("should set migration flag to 'true'", async () => {
      await ConversationMigration.markMigrationComplete();
      expect(localStorage.getItem("aipex-conversations-migrated")).toBe("true");
    });
  });

  describe("getOldConversations", () => {
    it("should return empty array when no old data exists", async () => {
      const conversations = await ConversationMigration.getOldConversations();
      expect(conversations).toEqual([]);
    });

    it("should return parsed conversations from localStorage", async () => {
      const mockConversations = [
        createMockConversation("1"),
        createMockConversation("2"),
      ];
      localStorage.setItem(
        "aipex-conversations",
        JSON.stringify(mockConversations)
      );

      const conversations = await ConversationMigration.getOldConversations();

      expect(conversations).toHaveLength(2);
      expect(conversations[0]!.id).toBe("1");
      expect(conversations[1]!.id).toBe("2");
    });

    it("should return empty array when data is not an array", async () => {
      localStorage.setItem("aipex-conversations", JSON.stringify({ not: "array" }));

      const conversations = await ConversationMigration.getOldConversations();

      expect(conversations).toEqual([]);
    });

    it("should return empty array when data is invalid JSON", async () => {
      localStorage.setItem("aipex-conversations", "invalid json");

      const conversations = await ConversationMigration.getOldConversations();

      expect(conversations).toEqual([]);
    });
  });

  describe("cleanupOldStorage", () => {
    it("should remove old localStorage key", async () => {
      localStorage.setItem("aipex-conversations", "some data");

      await ConversationMigration.cleanupOldStorage();

      expect(localStorage.getItem("aipex-conversations")).toBeNull();
    });
  });

  describe("migrate", () => {
    it("should skip migration if already migrated", async () => {
      localStorage.setItem("aipex-conversations-migrated", "true");
      const saveCallback = vi.fn();

      const result = await ConversationMigration.migrate(saveCallback);

      expect(result.success).toBe(true);
      expect(result.migratedCount).toBe(0);
      expect(saveCallback).not.toHaveBeenCalled();
    });

    it("should mark as migrated when no conversations exist", async () => {
      const saveCallback = vi.fn();

      const result = await ConversationMigration.migrate(saveCallback);

      expect(result.success).toBe(true);
      expect(result.migratedCount).toBe(0);
      expect(localStorage.getItem("aipex-conversations-migrated")).toBe("true");
      expect(saveCallback).not.toHaveBeenCalled();
    });

    it("should migrate all conversations successfully", async () => {
      const mockConversations = [
        createMockConversation("1"),
        createMockConversation("2"),
        createMockConversation("3"),
      ];
      localStorage.setItem(
        "aipex-conversations",
        JSON.stringify(mockConversations)
      );
      const saveCallback = vi.fn().mockResolvedValue(undefined);

      const result = await ConversationMigration.migrate(saveCallback);

      expect(result.success).toBe(true);
      expect(result.migratedCount).toBe(3);
      expect(saveCallback).toHaveBeenCalledTimes(3);
      expect(localStorage.getItem("aipex-conversations-migrated")).toBe("true");
      expect(localStorage.getItem("aipex-conversations")).toBeNull();
    });

    it("should continue migration even if some conversations fail", async () => {
      const mockConversations = [
        createMockConversation("1"),
        createMockConversation("2"),
        createMockConversation("3"),
      ];
      localStorage.setItem(
        "aipex-conversations",
        JSON.stringify(mockConversations)
      );
      const saveCallback = vi
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("Save failed"))
        .mockResolvedValueOnce(undefined);

      const result = await ConversationMigration.migrate(saveCallback);

      expect(result.success).toBe(true);
      expect(result.migratedCount).toBe(2); // Only 2 succeeded
      expect(saveCallback).toHaveBeenCalledTimes(3);
      expect(localStorage.getItem("aipex-conversations-migrated")).toBe("true");
    });

    it("should cleanup old storage after migration", async () => {
      const mockConversations = [createMockConversation("1")];
      localStorage.setItem(
        "aipex-conversations",
        JSON.stringify(mockConversations)
      );
      const saveCallback = vi.fn().mockResolvedValue(undefined);

      await ConversationMigration.migrate(saveCallback);

      expect(localStorage.getItem("aipex-conversations")).toBeNull();
    });
  });
});
