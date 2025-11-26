import type { AgentInputItem } from "@openai/agents";
import { beforeEach, describe, expect, it } from "vitest";
import { ConversationManager } from "./manager.js";
import { InMemorySessionStorage } from "./memory.js";

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
  let storage: InMemorySessionStorage;

  beforeEach(() => {
    storage = new InMemorySessionStorage();
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
});
