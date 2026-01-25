import { describe, it, expect, beforeEach, vi } from "vitest";
import { ConversationStorage } from "../conversation-storage";
import { ConversationMigration } from "../migration";
import type { UIMessage, ConversationData } from "../types";

// Mock IndexedDB with in-memory storage
class MockIDBDatabase {
  private stores: Map<string, Map<string, any>> = new Map();

  constructor(public name: string) {}

  createObjectStore(name: string) {
    this.stores.set(name, new Map());
    return {
      createIndex: vi.fn(),
    };
  }

  transaction(storeNames: string[], _mode: string) {
    return new MockIDBTransaction(
      this.stores,
      storeNames[0] ?? "conversations"
    );
  }

  close() {}
}

class MockIDBTransaction {
  constructor(
    private stores: Map<string, Map<string, any>>,
    private storeName: string
  ) {}

  objectStore(name: string) {
    return new MockIDBObjectStore(this.stores.get(name)!);
  }
}

class MockIDBObjectStore {
  constructor(private store: Map<string, any>) {}

  get(key: string) {
    return {
      onsuccess: null as any,
      onerror: null as any,
      result: this.store.get(key),
    };
  }

  getAll() {
    return {
      onsuccess: null as any,
      onerror: null as any,
      result: Array.from(this.store.values()),
    };
  }

  put(value: any) {
    this.store.set(value.id, value);
    return {
      onsuccess: null as any,
      onerror: null as any,
    };
  }

  delete(key: string) {
    this.store.delete(key);
    return {
      onsuccess: null as any,
      onerror: null as any,
    };
  }

  clear() {
    this.store.clear();
    return {
      onsuccess: null as any,
      onerror: null as any,
    };
  }
}

const indexedDBMock = {
  open: vi.fn((name: string, version: number) => {
    const db = new MockIDBDatabase(name);
    return {
      onsuccess: null as any,
      onerror: null as any,
      onupgradeneeded: null as any,
      result: db,
    };
  }),
};

Object.defineProperty(global, "indexedDB", {
  value: indexedDBMock,
  writable: true,
});

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

describe("ConversationStorage Integration Tests", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  const createMockMessages = (text: string): UIMessage[] => [
    {
      id: "msg1",
      role: "user",
      parts: [{ type: "text", text }],
      timestamp: Date.now(),
    },
    {
      id: "msg2",
      role: "assistant",
      parts: [{ type: "text", text: `Response to: ${text}` }],
      timestamp: Date.now() + 1000,
    },
  ];

  describe("Full workflow: Save → Get → Update → Delete", () => {
    it("should complete full conversation lifecycle", async () => {
      const storage = new ConversationStorage();

      // Mock storage operations
      vi.spyOn(storage as any, "ensureMigrated").mockResolvedValue(undefined);
      const mockSave = vi.fn().mockResolvedValue(undefined);
      const mockLoad = vi.fn();
      const mockDelete = vi.fn().mockResolvedValue(undefined);
      vi.spyOn((storage as any).storage, "save").mockImplementation(mockSave);
      vi.spyOn((storage as any).storage, "load").mockImplementation(mockLoad);
      vi.spyOn((storage as any).storage, "delete").mockImplementation(mockDelete);
      vi.spyOn(storage as any, "applyLRU").mockResolvedValue(undefined);

      // 1. Save a conversation
      const messages = createMockMessages("Hello world");
      const conversationId = await storage.saveConversation(messages);

      expect(conversationId).toBeTruthy();
      expect(conversationId).toMatch(/^conv_\d+_[a-z0-9]+$/);
      expect(mockSave).toHaveBeenCalled();

      // 2. Get the conversation
      const savedConversation: ConversationData = {
        id: conversationId,
        title: "Hello world",
        messages: messages.filter((m) => m.role !== "system"),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      mockLoad.mockResolvedValue(savedConversation);

      const retrieved = await storage.getConversation(conversationId);

      expect(retrieved).toBeTruthy();
      expect(retrieved?.id).toBe(conversationId);
      expect(retrieved?.messages).toHaveLength(2);

      // 3. Update the conversation
      const updatedMessages = [
        ...messages,
        {
          id: "msg3",
          role: "user" as const,
          parts: [{ type: "text" as const, text: "Follow-up question" }],
          timestamp: Date.now() + 2000,
        },
      ];

      await storage.updateConversation(conversationId, updatedMessages);

      expect(mockSave).toHaveBeenCalledWith(
        conversationId,
        expect.objectContaining({
          id: conversationId,
          messages: expect.arrayContaining([
            expect.objectContaining({ id: "msg3" }),
          ]),
        })
      );

      // 4. Delete the conversation
      await storage.deleteConversation(conversationId);

      expect(mockDelete).toHaveBeenCalledWith(conversationId);
    });
  });

  describe("LRU Policy Integration", () => {
    it("should automatically delete oldest conversations when exceeding limit", async () => {
      const storage = new ConversationStorage({ maxConversations: 3 });

      // Mock storage operations
      vi.spyOn(storage as any, "ensureMigrated").mockResolvedValue(undefined);
      const conversations: ConversationData[] = [];
      const mockSave = vi.fn((id: string, data: ConversationData) => {
        conversations.push(data);
        return Promise.resolve();
      });
      const mockListAll = vi.fn(() => Promise.resolve([...conversations]));
      const mockDelete = vi.fn((id: string) => {
        const index = conversations.findIndex((c) => c.id === id);
        if (index !== -1) conversations.splice(index, 1);
        return Promise.resolve();
      });

      vi.spyOn((storage as any).storage, "save").mockImplementation(
        mockSave as (id: string, data: ConversationData) => Promise<void>
      );
      vi.spyOn((storage as any).storage, "listAll").mockImplementation(
        mockListAll as () => Promise<ConversationData[]>
      );
      vi.spyOn((storage as any).storage, "delete").mockImplementation(
        mockDelete as (id: string) => Promise<void>
      );

      // Save 5 conversations (exceeding limit of 3)
      const ids: string[] = [];
      for (let i = 0; i < 5; i++) {
        const messages = createMockMessages(`Message ${i}`);
        const id = await storage.saveConversation(messages);
        ids.push(id);
        // Simulate time passing
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // After saving 5 conversations, only 3 should remain (most recent)
      expect(conversations).toHaveLength(3);
      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe("Migration Integration", () => {
    it("should migrate conversations from localStorage on first initialization", async () => {
      // Setup old conversations in localStorage
      const oldConversations: ConversationData[] = [
        {
          id: "old1",
          title: "Old Conversation 1",
          messages: createMockMessages("Old message 1"),
          createdAt: Date.now() - 10000,
          updatedAt: Date.now() - 10000,
        },
        {
          id: "old2",
          title: "Old Conversation 2",
          messages: createMockMessages("Old message 2"),
          createdAt: Date.now() - 5000,
          updatedAt: Date.now() - 5000,
        },
      ];

      localStorage.setItem(
        "aipex-conversations",
        JSON.stringify(oldConversations)
      );

      // Create storage instance (should trigger migration)
      const storage = new ConversationStorage();

      // Mock storage operations
      const mockSave = vi.fn().mockResolvedValue(undefined);
      vi.spyOn((storage as any).storage, "save").mockImplementation(mockSave);
      vi.spyOn(storage as any, "applyLRU").mockResolvedValue(undefined);

      // Manually trigger migration for testing
      await (storage as any).performMigration();

      // Verify migration flag is set
      expect(localStorage.getItem("aipex-conversations-migrated")).toBe("true");

      // Verify old data is removed
      expect(localStorage.getItem("aipex-conversations")).toBeNull();
    });

    it("should not migrate if already migrated", async () => {
      // Set migration flag
      localStorage.setItem("aipex-conversations-migrated", "true");

      // Setup old conversations (should be ignored)
      localStorage.setItem(
        "aipex-conversations",
        JSON.stringify([{ id: "old1" }])
      );

      const storage = new ConversationStorage();
      const mockSave = vi.fn().mockResolvedValue(undefined);
      vi.spyOn((storage as any).storage, "save").mockImplementation(mockSave);

      // Manually trigger migration
      await (storage as any).performMigration();

      // Should not save anything
      expect(mockSave).not.toHaveBeenCalled();
    });
  });

  describe("Concurrent Operations", () => {
    it("should handle multiple save operations concurrently", async () => {
      const storage = new ConversationStorage();

      // Mock storage operations
      vi.spyOn(storage as any, "ensureMigrated").mockResolvedValue(undefined);
      const mockSave = vi.fn().mockResolvedValue(undefined);
      vi.spyOn((storage as any).storage, "save").mockImplementation(mockSave);
      vi.spyOn(storage as any, "applyLRU").mockResolvedValue(undefined);

      // Save multiple conversations concurrently
      const savePromises = Array.from({ length: 5 }, (_, i) =>
        storage.saveConversation(createMockMessages(`Concurrent ${i}`))
      );

      const ids = await Promise.all(savePromises);

      // All saves should succeed
      expect(ids).toHaveLength(5);
      expect(ids.every((id) => id.length > 0)).toBe(true);
      expect(mockSave).toHaveBeenCalledTimes(5);
    });
  });

  describe("Error Handling", () => {
    it("should handle save errors gracefully", async () => {
      const storage = new ConversationStorage();

      // Mock storage to throw error
      vi.spyOn(storage as any, "ensureMigrated").mockResolvedValue(undefined);
      vi.spyOn((storage as any).storage, "save").mockRejectedValue(
        new Error("Save failed")
      );

      const messages = createMockMessages("Test");
      const conversationId = await storage.saveConversation(messages);

      // Should return empty string on error
      expect(conversationId).toBe("");
    });

    it("should handle get errors gracefully", async () => {
      const storage = new ConversationStorage();

      // Mock storage to throw error
      vi.spyOn(storage as any, "ensureMigrated").mockResolvedValue(undefined);
      vi.spyOn((storage as any).storage, "load").mockRejectedValue(
        new Error("Load failed")
      );

      const conversation = await storage.getConversation("nonexistent");

      // Should return null on error
      expect(conversation).toBeNull();
    });
  });
});
