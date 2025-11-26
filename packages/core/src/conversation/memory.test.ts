import { beforeEach, describe, expect, it } from "vitest";
import type { CompletedTurn } from "../types.js";
import { InMemorySessionStorage } from "./memory.js";
import { Session } from "./session.js";

describe("InMemorySessionStorage", () => {
  let storage: InMemorySessionStorage;
  let session1: Session;
  let session2: Session;

  beforeEach(() => {
    storage = new InMemorySessionStorage();
    session1 = new Session("session-1");
    session2 = new Session("session-2");

    const turn: CompletedTurn = {
      id: "turn-1",
      userMessage: { role: "user", content: "Test" },
      assistantMessage: { role: "assistant", content: "Response" },
      functionCalls: [],
      functionResults: [],
      timestamp: Date.now(),
    };

    session1.addTurn(turn);
  });

  it("should save and load sessions", async () => {
    await storage.save(session1);
    const loaded = await storage.load("session-1");

    expect(loaded).toBeDefined();
    expect(loaded?.id).toBe("session-1");
  });

  it("should return null for non-existent session", async () => {
    const loaded = await storage.load("non-existent");
    expect(loaded).toBeNull();
  });

  it("should delete sessions", async () => {
    await storage.save(session1);
    await storage.delete("session-1");

    const loaded = await storage.load("session-1");
    expect(loaded).toBeNull();
  });

  it("should list all sessions", async () => {
    await storage.save(session1);
    await storage.save(session2);

    const summaries = await storage.listAll();
    expect(summaries.length).toBe(2);
  });

  describe("Fork tree support", () => {
    it("should get children of a session", async () => {
      const forked1 = session1.fork(0);
      const forked2 = session1.fork(0);

      await storage.save(session1);
      await storage.save(forked1);
      await storage.save(forked2);

      const children = await storage.getChildren("session-1");
      expect(children.length).toBe(2);
      expect(children.every((c) => c.parentSessionId === "session-1")).toBe(
        true,
      );
    });

    it("should build session tree", async () => {
      const forked1 = session1.fork(0);
      const forked2 = forked1.fork(0);

      await storage.save(session1);
      await storage.save(forked1);
      await storage.save(forked2);

      const tree = await storage.getSessionTree("session-1");

      expect(tree.length).toBe(1);
      expect(tree[0].session.id).toBe("session-1");
      expect(tree[0].children.length).toBe(1);
      expect(tree[0].children[0].children.length).toBe(1);
    });

    it("should get all root sessions when no rootId provided", async () => {
      const forked = session1.fork(0);

      await storage.save(session1);
      await storage.save(session2);
      await storage.save(forked);

      const tree = await storage.getSessionTree();
      expect(tree.length).toBe(2); // Only session1 and session2, forked is a child
    });
  });

  it("should clear all sessions", async () => {
    await storage.save(session1);
    await storage.save(session2);

    storage.clear();

    const summaries = await storage.listAll();
    expect(summaries.length).toBe(0);
  });
});
