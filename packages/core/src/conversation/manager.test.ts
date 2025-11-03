import { beforeEach, describe, expect, it } from "vitest";
import { ConversationManager } from "./manager.js";
import { InMemoryStorage } from "./memory-storage.js";
import type { CompletedTurn } from "./types.js";

describe("ConversationManager.listSessions", () => {
  let manager: ConversationManager;

  beforeEach(() => {
    manager = new ConversationManager(new InMemoryStorage());
  });

  it("should list all sessions", async () => {
    // Create multiple sessions
    const session1 = await manager.createSession();
    const session2 = await manager.createSession();

    const turn: CompletedTurn = {
      id: "turn-1",
      userMessage: { role: "user", content: "测试消息1" },
      assistantMessage: { role: "assistant", content: "回复" },
      functionCalls: [],
      functionResults: [],
      timestamp: Date.now(),
    };

    session1.addTurn(turn);
    await manager.saveSession(session1);

    session2.addTurn({
      ...turn,
      userMessage: { role: "user", content: "测试消息2" },
    });
    await manager.saveSession(session2);

    const sessions = await manager.listSessions();
    expect(sessions.length).toBe(2);
    expect(sessions[0].preview).toBeTruthy();
    expect(sessions[1].preview).toBeTruthy();
  });

  it("should sort by lastActiveAt by default", async () => {
    const session1 = await manager.createSession();

    const turn1: CompletedTurn = {
      id: "turn-1",
      userMessage: { role: "user", content: "First" },
      assistantMessage: { role: "assistant", content: "回复" },
      functionCalls: [],
      functionResults: [],
      timestamp: Date.now(),
    };

    session1.addTurn(turn1);
    await manager.saveSession(session1);

    // Wait to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));

    const session2 = await manager.createSession();
    const turn2: CompletedTurn = {
      id: "turn-2",
      userMessage: { role: "user", content: "Second (newer)" },
      assistantMessage: { role: "assistant", content: "回复" },
      functionCalls: [],
      functionResults: [],
      timestamp: Date.now(),
    };

    session2.addTurn(turn2);
    await manager.saveSession(session2);

    const sessions = await manager.listSessions();
    expect(sessions.length).toBe(2);
    expect(sessions[0].id).toBe(session2.id); // Most recent first
    expect(sessions[1].id).toBe(session1.id);
  });

  it("should sort by createdAt when specified", async () => {
    const session1 = await manager.createSession();
    await new Promise((resolve) => setTimeout(resolve, 10));
    const session2 = await manager.createSession();

    const sessions = await manager.listSessions({ sortBy: "createdAt" });
    expect(sessions.length).toBe(2);
    expect(sessions[0].id).toBe(session2.id); // Most recent created first
    expect(sessions[1].id).toBe(session1.id);
  });

  it("should support pagination", async () => {
    // Create 5 sessions
    for (let i = 0; i < 5; i++) {
      await manager.createSession();
    }

    const page1 = await manager.listSessions({ limit: 2, offset: 0 });
    expect(page1.length).toBe(2);

    const page2 = await manager.listSessions({ limit: 2, offset: 2 });
    expect(page2.length).toBe(2);

    const page3 = await manager.listSessions({ limit: 2, offset: 4 });
    expect(page3.length).toBe(1);

    // Verify no overlap
    expect(page1[0].id).not.toBe(page2[0].id);
    expect(page2[0].id).not.toBe(page3[0].id);
  });

  it("should filter by tags", async () => {
    const session1 = await manager.createSession();
    session1["metadata"].tags = ["important", "urgent"];
    await manager.saveSession(session1);

    const session2 = await manager.createSession();
    session2["metadata"].tags = ["draft"];
    await manager.saveSession(session2);

    const session3 = await manager.createSession();
    session3["metadata"].tags = ["important"];
    await manager.saveSession(session3);

    const importantSessions = await manager.listSessions({
      tags: ["important"],
    });
    expect(importantSessions.length).toBe(2);
    expect(importantSessions.map((s) => s.id)).toContain(session1.id);
    expect(importantSessions.map((s) => s.id)).toContain(session3.id);

    const urgentSessions = await manager.listSessions({ tags: ["urgent"] });
    expect(urgentSessions.length).toBe(1);
    expect(urgentSessions[0].id).toBe(session1.id);
  });

  it("should handle empty sessions list", async () => {
    const sessions = await manager.listSessions();
    expect(sessions).toEqual([]);
  });

  it("should respect default limit", async () => {
    // Create more than default limit (50)
    for (let i = 0; i < 55; i++) {
      await manager.createSession();
    }

    const sessions = await manager.listSessions();
    expect(sessions.length).toBe(50); // Default limit
  });

  it("should combine filters, sorting, and pagination", async () => {
    // Create sessions with different tags
    for (let i = 0; i < 10; i++) {
      const session = await manager.createSession();
      if (i % 2 === 0) {
        session["metadata"].tags = ["even"];
      } else {
        session["metadata"].tags = ["odd"];
      }
      await manager.saveSession(session);
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    const filtered = await manager.listSessions({
      tags: ["even"],
      sortBy: "createdAt",
      limit: 2,
      offset: 1,
    });

    expect(filtered.length).toBe(2);
    expect(filtered.every((s) => s.tags?.includes("even"))).toBe(true);
  });
});
