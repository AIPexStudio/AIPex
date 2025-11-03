import { beforeEach, describe, expect, it } from "vitest";
import { ConversationManager } from "./manager.js";
import { InMemoryStorage } from "./memory-storage.js";
import type { CompletedTurn } from "./types.js";

describe("ConversationManager", () => {
  let manager: ConversationManager;

  beforeEach(() => {
    const storage = new InMemoryStorage();
    manager = new ConversationManager(storage);
  });

  it("should create new session", async () => {
    const session = await manager.createSession();

    expect(session).toBeDefined();
    expect(session.id).toBeDefined();
  });

  it("should create session with config", async () => {
    const session = await manager.createSession({
      systemPrompt: "You are helpful",
      maxHistoryLength: 50,
    });

    const messages = session.getMessages();
    expect(messages[0].content).toBe("You are helpful");
  });

  it("should retrieve saved session", async () => {
    const session = await manager.createSession();
    const id = session.id;

    const retrieved = await manager.getSession(id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(id);
  });

  it("should return null for non-existent session", async () => {
    const session = await manager.getSession("non-existent");
    expect(session).toBeNull();
  });

  it("should save session changes", async () => {
    const session = await manager.createSession();

    const turn: CompletedTurn = {
      id: "turn-1",
      userMessage: { role: "user", content: "Hello" },
      assistantMessage: { role: "assistant", content: "Hi" },
      functionCalls: [],
      functionResults: [],
      timestamp: Date.now(),
    };

    session.addTurn(turn);
    await manager.saveSession(session);

    const retrieved = await manager.getSession(session.id);
    expect(retrieved?.getTurnCount()).toBe(1);
  });

  it("should delete session", async () => {
    const session = await manager.createSession();
    const id = session.id;

    await manager.deleteSession(id);

    const retrieved = await manager.getSession(id);
    expect(retrieved).toBeNull();
  });

  it("should list all sessions", async () => {
    await manager.createSession();
    await manager.createSession();
    await manager.createSession();

    const sessions = await manager.listSessions();
    expect(sessions).toHaveLength(3);
  });

  it("should include session metadata in list", async () => {
    const session = await manager.createSession();

    const turn: CompletedTurn = {
      id: "turn-1",
      userMessage: { role: "user", content: "Hello" },
      assistantMessage: { role: "assistant", content: "Hi" },
      functionCalls: [],
      functionResults: [],
      timestamp: Date.now(),
    };

    session.addTurn(turn);
    await manager.saveSession(session);

    const sessions = await manager.listSessions();
    const found = sessions.find((s) => s.id === session.id);

    expect(found).toBeDefined();
    expect(found?.turnCount).toBe(1);
    expect(found?.createdAt).toBeDefined();
    expect(found?.lastActiveAt).toBeDefined();
  });
});
