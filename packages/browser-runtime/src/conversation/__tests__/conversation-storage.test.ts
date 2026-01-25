import { describe, it, expect, beforeEach, vi } from "vitest";
import { ConversationStorage } from "../conversation-storage";
import type { UIMessage } from "../types";

// Mock IndexedDB
const indexedDBMock = {
  open: vi.fn(),
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

describe("ConversationStorage", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  const createMockMessages = (count: number = 3): UIMessage[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `msg${i}`,
      role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
      parts: [{ type: "text" as const, text: `Message ${i}` }],
      timestamp: Date.now() + i * 1000,
    }));
  };

  describe("generateTitle", () => {
    it("should generate title from first user message", () => {
      const storage = new ConversationStorage();
      const messages: UIMessage[] = [
        {
          id: "1",
          role: "user",
          parts: [{ type: "text", text: "Hello, how are you?" }],
        },
      ];

      // Access private method through type assertion for testing
      const title = (storage as any).generateTitle(messages);

      expect(title).toBe("Hello, how are you?");
    });

    it("should truncate long titles", () => {
      const storage = new ConversationStorage();
      const longText = "a".repeat(50);
      const messages: UIMessage[] = [
        {
          id: "1",
          role: "user",
          parts: [{ type: "text", text: longText }],
        },
      ];

      const title = (storage as any).generateTitle(messages);

      expect(title).toHaveLength(33); // 30 chars + "..."
      expect(title).toMatch(/^a+\.\.\.$/);
    });

    it("should return default title when no user message", () => {
      const storage = new ConversationStorage();
      const messages: UIMessage[] = [
        {
          id: "1",
          role: "assistant",
          parts: [{ type: "text", text: "Hello" }],
        },
      ];

      const title = (storage as any).generateTitle(messages);

      expect(title).toBe("新对话");
    });

    it("should return default title when user message has no text", () => {
      const storage = new ConversationStorage();
      const messages: UIMessage[] = [
        {
          id: "1",
          role: "user",
          parts: [{ type: "image", imageData: "data:image/png;base64,..." }],
        },
      ];

      const title = (storage as any).generateTitle(messages);

      expect(title).toBe("新对话");
    });
  });

  describe("filterMessages", () => {
    it("should filter out system messages", () => {
      const storage = new ConversationStorage();
      const messages: UIMessage[] = [
        {
          id: "1",
          role: "system",
          parts: [{ type: "text", text: "System message" }],
        },
        {
          id: "2",
          role: "user",
          parts: [{ type: "text", text: "User message" }],
        },
        {
          id: "3",
          role: "assistant",
          parts: [{ type: "text", text: "Assistant message" }],
        },
      ];

      const filtered = (storage as any).filterMessages(messages);

      expect(filtered).toHaveLength(2);
      expect(filtered.find((m: UIMessage) => m.role === "system")).toBeUndefined();
    });

    it("should keep user and assistant messages", () => {
      const storage = new ConversationStorage();
      const messages: UIMessage[] = [
        {
          id: "1",
          role: "user",
          parts: [{ type: "text", text: "User message" }],
        },
        {
          id: "2",
          role: "assistant",
          parts: [{ type: "text", text: "Assistant message" }],
        },
      ];

      const filtered = (storage as any).filterMessages(messages);

      expect(filtered).toHaveLength(2);
      expect(filtered).toEqual(messages);
    });
  });

  describe("configuration", () => {
    it("should use default configuration", () => {
      const storage = new ConversationStorage();

      expect((storage as any).config.maxConversations).toBe(5);
      expect((storage as any).config.dbName).toBe("aipex-conversations-db");
      expect((storage as any).config.storeName).toBe("conversations");
    });

    it("should accept custom configuration", () => {
      const storage = new ConversationStorage({
        maxConversations: 10,
        dbName: "custom-db",
        storeName: "custom-store",
      });

      expect((storage as any).config.maxConversations).toBe(10);
      expect((storage as any).config.dbName).toBe("custom-db");
      expect((storage as any).config.storeName).toBe("custom-store");
    });

    it("should use defaults for missing config values", () => {
      const storage = new ConversationStorage({
        maxConversations: 10,
      });

      expect((storage as any).config.maxConversations).toBe(10);
      expect((storage as any).config.dbName).toBe("aipex-conversations-db");
      expect((storage as any).config.storeName).toBe("conversations");
    });
  });

  describe("saveConversation", () => {
    it("should return empty string for empty messages", async () => {
      const storage = new ConversationStorage();
      const conversationId = await storage.saveConversation([]);

      expect(conversationId).toBe("");
    });

    it("should return empty string when all messages are system messages", async () => {
      const storage = new ConversationStorage();
      const messages: UIMessage[] = [
        {
          id: "1",
          role: "system",
          parts: [{ type: "text", text: "System message" }],
        },
      ];

      const conversationId = await storage.saveConversation(messages);

      expect(conversationId).toBe("");
    });

    it("should generate conversation ID with correct format", async () => {
      const storage = new ConversationStorage();
      const messages = createMockMessages(2);

      // Mock the storage.save to avoid IndexedDB operations
      vi.spyOn(storage as any, "ensureMigrated").mockResolvedValue(undefined);
      vi.spyOn((storage as any).storage, "save").mockResolvedValue(undefined);
      vi.spyOn(storage as any, "applyLRU").mockResolvedValue(undefined);

      const conversationId = await storage.saveConversation(messages);

      expect(conversationId).toMatch(/^conv_\d+_[a-z0-9]+$/);
    });
  });

  describe("message types", () => {
    it("should handle text messages", () => {
      const storage = new ConversationStorage();
      const messages: UIMessage[] = [
        {
          id: "1",
          role: "user",
          parts: [{ type: "text", text: "Hello" }],
        },
      ];

      const filtered = (storage as any).filterMessages(messages);
      expect(filtered).toHaveLength(1);
    });

    it("should handle image messages", () => {
      const storage = new ConversationStorage();
      const messages: UIMessage[] = [
        {
          id: "1",
          role: "user",
          parts: [
            {
              type: "image",
              imageData: "data:image/png;base64,...",
              imageTitle: "Screenshot",
            },
          ],
        },
      ];

      const filtered = (storage as any).filterMessages(messages);
      expect(filtered).toHaveLength(1);
    });

    it("should handle tool_use messages", () => {
      const storage = new ConversationStorage();
      const messages: UIMessage[] = [
        {
          id: "1",
          role: "assistant",
          parts: [
            {
              type: "tool_use",
              id: "tool1",
              name: "search",
              input: { query: "test" },
            },
          ],
        },
      ];

      const filtered = (storage as any).filterMessages(messages);
      expect(filtered).toHaveLength(1);
    });

    it("should handle tool_result messages", () => {
      const storage = new ConversationStorage();
      const messages: UIMessage[] = [
        {
          id: "1",
          role: "user",
          parts: [
            {
              type: "tool_result",
              tool_use_id: "tool1",
              content: "Result",
              is_error: false,
            },
          ],
        },
      ];

      const filtered = (storage as any).filterMessages(messages);
      expect(filtered).toHaveLength(1);
    });

    it("should handle mixed message parts", () => {
      const storage = new ConversationStorage();
      const messages: UIMessage[] = [
        {
          id: "1",
          role: "user",
          parts: [
            { type: "text", text: "Check this image:" },
            { type: "image", imageData: "data:image/png;base64,..." },
          ],
        },
      ];

      const filtered = (storage as any).filterMessages(messages);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].parts).toHaveLength(2);
    });
  });
});
