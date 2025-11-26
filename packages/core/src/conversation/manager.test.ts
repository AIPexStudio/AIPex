import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CompletedTurn, SummarizerFunction } from "../types.js";
import { ConversationCompressor } from "./compressor.js";
import { ConversationManager } from "./manager.js";
import { InMemorySessionStorage } from "./memory.js";

describe("ConversationManager", () => {
  let manager: ConversationManager;
  let storage: InMemorySessionStorage;

  beforeEach(() => {
    storage = new InMemorySessionStorage();
    manager = new ConversationManager(storage);
  });

  it("should create a session", async () => {
    const session = await manager.createSession({
      systemPrompt: "Test prompt",
    });

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

    const turn: CompletedTurn = {
      id: "turn-1",
      userMessage: { role: "user", content: "Test" },
      assistantMessage: { role: "assistant", content: "Response" },
      functionCalls: [],
      functionResults: [],
      timestamp: Date.now(),
    };

    session.addTurn(turn);
    await manager.saveSession(session);

    const retrieved = await manager.getSession(session.id);
    expect(retrieved?.getTurnCount()).toBe(1);
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

      const turns: CompletedTurn[] = [
        {
          id: "turn-1",
          userMessage: { role: "user", content: "Turn 1" },
          assistantMessage: { role: "assistant", content: "Response 1" },
          functionCalls: [],
          functionResults: [],
          timestamp: Date.now(),
        },
        {
          id: "turn-2",
          userMessage: { role: "user", content: "Turn 2" },
          assistantMessage: { role: "assistant", content: "Response 2" },
          functionCalls: [],
          functionResults: [],
          timestamp: Date.now(),
        },
      ];

      for (const turn of turns) {
        session.addTurn(turn);
      }
      await manager.saveSession(session);

      const forked = await manager.forkSession(session.id, 0);

      expect(forked.id).not.toBe(session.id);
      expect(forked.parentSessionId).toBe(session.id);
      expect(forked.getTurnCount()).toBe(1);
    });

    it("should throw error when forking non-existent session", async () => {
      await expect(manager.forkSession("non-existent")).rejects.toThrow();
    });

    it("should get session tree", async () => {
      const session = await manager.createSession();
      const turn: CompletedTurn = {
        id: "turn-1",
        userMessage: { role: "user", content: "Test" },
        assistantMessage: { role: "assistant", content: "Response" },
        functionCalls: [],
        functionResults: [],
        timestamp: Date.now(),
      };
      session.addTurn(turn);
      await manager.saveSession(session);

      await manager.forkSession(session.id, 0);

      const tree = await manager.getSessionTree();
      expect(tree.length).toBeGreaterThan(0);
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
      expect(page1[0].id).not.toBe(page2[0].id);
    });
  });

  describe("Compression functionality", () => {
    let managerWithCompressor: ConversationManager;
    let mockSummarizer: SummarizerFunction;
    let compressor: ConversationCompressor;

    const createTurn = (id: string): CompletedTurn => ({
      id,
      userMessage: { role: "user", content: `User message ${id}` },
      assistantMessage: { role: "assistant", content: `Response ${id}` },
      functionCalls: [],
      functionResults: [],
      timestamp: Date.now(),
    });

    beforeEach(() => {
      mockSummarizer = vi.fn().mockResolvedValue("Compressed summary");
      compressor = new ConversationCompressor(mockSummarizer, {
        summarizeAfterTurns: 5,
        keepRecentTurns: 2,
      });
      managerWithCompressor = new ConversationManager(storage, {
        compressor,
      });
    });

    it("should auto-compress on save when threshold is exceeded", async () => {
      const session = await managerWithCompressor.createSession();

      for (let i = 0; i < 8; i++) {
        session.addTurn(createTurn(`turn-${i}`));
      }

      await managerWithCompressor.saveSession(session);

      expect(mockSummarizer).toHaveBeenCalled();
      expect(session.getTurnCount()).toBe(2);
      expect(session.getConversationSummary()).toContain("Compressed summary");
    });

    it("should not auto-compress when below threshold", async () => {
      const session = await managerWithCompressor.createSession();

      for (let i = 0; i < 3; i++) {
        session.addTurn(createTurn(`turn-${i}`));
      }

      await managerWithCompressor.saveSession(session);

      expect(mockSummarizer).not.toHaveBeenCalled();
      expect(session.getTurnCount()).toBe(3);
    });

    it("should manually compress session", async () => {
      const session = await managerWithCompressor.createSession();

      for (let i = 0; i < 8; i++) {
        session.addTurn(createTurn(`turn-${i}`));
      }

      const result = await managerWithCompressor.compressSession(session.id);

      expect(result.compressed).toBe(true);
      expect(result.summary).toContain("Compressed summary");

      const retrieved = await managerWithCompressor.getSession(session.id);
      expect(retrieved?.getTurnCount()).toBe(2);
    });

    it("should return compressed: false when no compressor", async () => {
      const session = await manager.createSession();
      const result = await manager.compressSession(session.id);

      expect(result.compressed).toBe(false);
      expect(result.summary).toBeUndefined();
    });

    it("should throw error when compressing non-existent session", async () => {
      await expect(
        managerWithCompressor.compressSession("non-existent"),
      ).rejects.toThrow();
    });

    it("should combine existing summary with new summary", async () => {
      const session = await managerWithCompressor.createSession();
      session.setSummary("Existing summary");

      for (let i = 0; i < 8; i++) {
        session.addTurn(createTurn(`turn-${i}`));
      }

      await managerWithCompressor.compressSession(session.id);

      const summary = session.getConversationSummary();
      expect(summary).toContain("Existing summary");
      expect(summary).toContain("Compressed summary");
    });
  });
});
