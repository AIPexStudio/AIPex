import type { AgentInputItem } from "@openai/agents";
import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryStorage } from "../storage/memory.js";
import type { SerializedSession } from "../types.js";
import type { ConversationCompressor } from "./compressor.js";
import { ConversationManager } from "./manager.js";
import { SessionStorage } from "./storage.js";

const createUserMessage = (content: string): AgentInputItem => ({
  type: "message",
  role: "user",
  content,
});

const createAssistantMessage = (content: string): AgentInputItem => ({
  type: "message",
  role: "assistant",
  status: "completed",
  content: [{ type: "output_text", text: content }],
});

describe("ConversationManager", () => {
  let manager: ConversationManager;
  let storage: SessionStorage;

  beforeEach(() => {
    storage = new SessionStorage(new InMemoryStorage<SerializedSession>());
    manager = new ConversationManager(storage);
  });

  it("should create a session", async () => {
    const session = await manager.createSession();
    expect(session.id).toBeDefined();
  });

  it("should get a session", async () => {
    const created = await manager.createSession();
    const retrieved = await manager.getSession(created.id);

    expect(retrieved?.id).toBe(created.id);
  });

  it("should return null for non-existent session", async () => {
    const retrieved = await manager.getSession("non-existent");
    expect(retrieved).toBeNull();
  });

  it("should save a session", async () => {
    const session = await manager.createSession();

    await session.addItems([
      createUserMessage("Test"),
      createAssistantMessage("Response"),
    ]);
    await manager.saveSession(session);

    const retrieved = await manager.getSession(session.id);
    expect(retrieved?.getItemCount()).toBe(2);
  });

  it("should delete a session", async () => {
    const session = await manager.createSession();
    await manager.deleteSession(session.id);

    const retrieved = await manager.getSession(session.id);
    expect(retrieved).toBeNull();
  });

  describe("Fork functionality", () => {
    it("should fork a session", async () => {
      const session = await manager.createSession();

      await session.addItems([
        createUserMessage("Turn 1"),
        createAssistantMessage("Response 1"),
        createUserMessage("Turn 2"),
        createAssistantMessage("Response 2"),
      ]);
      await manager.saveSession(session);

      const forked = await manager.forkSession(session.id, 1);

      expect(forked.id).not.toBe(session.id);
      expect(forked.parentSessionId).toBe(session.id);
      expect(forked.getItemCount()).toBe(2);
    });

    it("should throw error when forking non-existent session", async () => {
      await expect(manager.forkSession("non-existent")).rejects.toThrow();
    });

    it("should get session tree", async () => {
      const session = await manager.createSession();
      await session.addItems([
        createUserMessage("Test"),
        createAssistantMessage("Response"),
      ]);
      await manager.saveSession(session);

      await manager.forkSession(session.id, 0);

      const tree = await manager.getSessionTree();
      expect(tree.length).toBeGreaterThan(0);
    });

    it("should persist forked session and reload correctly", async () => {
      const session = await manager.createSession();
      await session.addItems([
        createUserMessage("Turn 1"),
        createAssistantMessage("Response 1"),
        createUserMessage("Turn 2"),
        createAssistantMessage("Response 2"),
      ]);
      await manager.saveSession(session);

      const forked = await manager.forkSession(session.id, 1);
      await forked.addItems([
        createUserMessage("Forked Turn 3"),
        createAssistantMessage("Forked Response 3"),
      ]);
      await manager.saveSession(forked);

      manager.clearCache();

      const reloaded = await manager.getSession(forked.id);
      expect(reloaded).not.toBeNull();
      expect(reloaded?.getItemCount()).toBe(4);
      expect(reloaded?.parentSessionId).toBe(session.id);
      expect(reloaded?.forkAtItemIndex).toBe(1);
    });

    it("should handle multi-level fork tree", async () => {
      const root = await manager.createSession();
      await root.addItems([
        createUserMessage("Root message"),
        createAssistantMessage("Root response"),
      ]);
      await manager.saveSession(root);

      const child1 = await manager.forkSession(root.id, 0);
      await child1.addItems([createUserMessage("Child 1 message")]);
      await manager.saveSession(child1);

      const child2 = await manager.forkSession(root.id, 1);
      await child2.addItems([createUserMessage("Child 2 message")]);
      await manager.saveSession(child2);

      const grandchild = await manager.forkSession(child1.id, 1);
      await grandchild.addItems([createUserMessage("Grandchild message")]);
      await manager.saveSession(grandchild);

      manager.clearCache();

      const reloadedRoot = await manager.getSession(root.id);
      const reloadedChild1 = await manager.getSession(child1.id);
      const reloadedChild2 = await manager.getSession(child2.id);
      const reloadedGrandchild = await manager.getSession(grandchild.id);

      expect(reloadedRoot?.parentSessionId).toBeUndefined();
      expect(reloadedChild1?.parentSessionId).toBe(root.id);
      expect(reloadedChild2?.parentSessionId).toBe(root.id);
      expect(reloadedGrandchild?.parentSessionId).toBe(child1.id);
    });

    it("should preserve metrics through fork and reload", async () => {
      const session = await manager.createSession();
      await session.addItems([
        createUserMessage("Test"),
        createAssistantMessage("Response"),
      ]);
      session.addMetrics({
        tokensUsed: 100,
        promptTokens: 60,
        completionTokens: 40,
      });
      await manager.saveSession(session);

      const forked = await manager.forkSession(session.id, 0);
      forked.addMetrics({
        tokensUsed: 50,
        promptTokens: 30,
        completionTokens: 20,
      });
      await manager.saveSession(forked);

      manager.clearCache();

      const reloadedOriginal = await manager.getSession(session.id);
      const reloadedForked = await manager.getSession(forked.id);

      const originalMetrics = reloadedOriginal?.getSessionMetrics();
      expect(originalMetrics?.totalTokensUsed).toBe(100);
      expect(originalMetrics?.executionCount).toBe(1);

      const forkedMetrics = reloadedForked?.getSessionMetrics();
      expect(forkedMetrics?.totalTokensUsed).toBe(50);
      expect(forkedMetrics?.executionCount).toBe(1);
    });

    it("should not affect parent session when modifying forked session", async () => {
      const session = await manager.createSession();
      await session.addItems([
        createUserMessage("Original message"),
        createAssistantMessage("Original response"),
      ]);
      await manager.saveSession(session);

      const forked = await manager.forkSession(session.id, 0);
      await forked.addItems([
        createUserMessage("Forked message"),
        createAssistantMessage("Forked response"),
      ]);
      await manager.saveSession(forked);

      manager.clearCache();

      const reloadedOriginal = await manager.getSession(session.id);
      const reloadedForked = await manager.getSession(forked.id);

      expect(reloadedOriginal?.getItemCount()).toBe(2);
      expect(reloadedForked?.getItemCount()).toBe(3);
    });
  });

  describe("Cache functionality", () => {
    it("should cache sessions", async () => {
      await manager.createSession();

      expect(manager.getCacheSize()).toBe(1);
    });

    it("should clear cache", async () => {
      await manager.createSession();
      manager.clearCache();

      expect(manager.getCacheSize()).toBe(0);
    });
  });

  describe("List sessions", () => {
    it("should list sessions with sorting", async () => {
      await manager.createSession();
      await manager.createSession();

      const sessions = await manager.listSessions({
        sortBy: "createdAt",
      });

      expect(sessions.length).toBe(2);
    });

    it("should paginate sessions", async () => {
      for (let i = 0; i < 10; i++) {
        await manager.createSession();
      }

      const page1 = await manager.listSessions({
        limit: 5,
        offset: 0,
      });

      const page2 = await manager.listSessions({
        limit: 5,
        offset: 5,
      });

      expect(page1.length).toBe(5);
      expect(page2.length).toBe(5);
      expect(page1[0]?.id).not.toBe(page2[0]?.id);
    });
  });

  describe("Compression integration", () => {
    it("should inject summary items when compressing", async () => {
      const compressor = {
        shouldCompress: () => false,
        async compressItems() {
          return { summary: "Important context", compressedItems: [] };
        },
      } as unknown as ConversationCompressor;

      const compressionManager = new ConversationManager(storage, {
        compressor,
      });
      const session = await compressionManager.createSession();
      await session.addItems([createUserMessage("Hello world")]);

      await compressionManager.compressSession(session.id);
      const reloaded = await compressionManager.getSession(session.id);

      expect(reloaded?.getMetadata("lastSummary")).toBe("Important context");
      const items = await reloaded?.getItems();
      expect(items?.[0]).toMatchObject({ role: "system" });
      expect(reloaded?.getSummary().preview).toContain("Important context");
    });

    it("should trigger compression based on token watermark", async () => {
      let compressCalled = false;
      const compressor = {
        shouldCompress: (_itemCount: number, lastPromptTokens?: number) => {
          if (lastPromptTokens !== undefined && lastPromptTokens > 150000) {
            return true;
          }
          return false;
        },
        async compressItems(items: AgentInputItem[]) {
          compressCalled = true;
          return {
            summary: "Compressed due to token watermark",
            compressedItems: items.slice(-2),
          };
        },
      } as unknown as ConversationCompressor;

      const compressionManager = new ConversationManager(storage, {
        compressor,
      });
      const session = await compressionManager.createSession();
      await session.addItems([
        createUserMessage("Message 1"),
        createAssistantMessage("Response 1"),
        createUserMessage("Message 2"),
        createAssistantMessage("Response 2"),
      ]);

      // Set lastPromptTokens above watermark
      session.setMetadata("lastPromptTokens", 200000);

      await compressionManager.saveSession(session);

      expect(compressCalled).toBe(true);

      const reloaded = await compressionManager.getSession(session.id);
      expect(reloaded?.getMetadata("lastSummary")).toBe(
        "Compressed due to token watermark",
      );
    });

    it("should not compress when token watermark not exceeded", async () => {
      let compressCalled = false;
      const compressor = {
        shouldCompress: (_itemCount: number, lastPromptTokens?: number) => {
          if (lastPromptTokens !== undefined && lastPromptTokens > 150000) {
            return true;
          }
          return false;
        },
        async compressItems(items: AgentInputItem[]) {
          compressCalled = true;
          return { summary: "", compressedItems: items };
        },
      } as unknown as ConversationCompressor;

      const compressionManager = new ConversationManager(storage, {
        compressor,
      });
      const session = await compressionManager.createSession();
      await session.addItems([
        createUserMessage("Message 1"),
        createAssistantMessage("Response 1"),
      ]);

      // Set lastPromptTokens below watermark
      session.setMetadata("lastPromptTokens", 100000);

      await compressionManager.saveSession(session);

      expect(compressCalled).toBe(false);

      const reloaded = await compressionManager.getSession(session.id);
      expect(reloaded?.getItemCount()).toBe(2);
    });

    it("should handle missing lastPromptTokens metadata gracefully", async () => {
      let compressCalled = false;
      const compressor = {
        shouldCompress: (itemCount: number, lastPromptTokens?: number) => {
          if (lastPromptTokens !== undefined && lastPromptTokens > 150000) {
            return true;
          }
          return itemCount > 10;
        },
        async compressItems(items: AgentInputItem[]) {
          compressCalled = true;
          return { summary: "Fallback compression", compressedItems: items };
        },
      } as unknown as ConversationCompressor;

      const compressionManager = new ConversationManager(storage, {
        compressor,
      });
      const session = await compressionManager.createSession();

      // Add many items to trigger item-count based compression
      for (let i = 0; i < 15; i++) {
        await session.addItems([
          createUserMessage(`Message ${i}`),
          createAssistantMessage(`Response ${i}`),
        ]);
      }

      // Do not set lastPromptTokens - it should fallback to item count
      await compressionManager.saveSession(session);

      expect(compressCalled).toBe(true);
    });
  });
});
