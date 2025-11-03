import { beforeEach, describe, expect, it } from "vitest";
import { Session } from "./session.js";
import type { CompletedTurn } from "./types.js";

describe("Session", () => {
  let session: Session;

  beforeEach(() => {
    session = new Session();
  });

  it("should create session with generated id", () => {
    expect(session.id).toBeDefined();
    expect(typeof session.id).toBe("string");
  });

  it("should create session with custom id", () => {
    const customSession = new Session("custom-id");
    expect(customSession.id).toBe("custom-id");
  });

  it("should add turn to session", () => {
    const turn: CompletedTurn = {
      id: "turn-1",
      userMessage: { role: "user", content: "Hello" },
      assistantMessage: { role: "assistant", content: "Hi there" },
      functionCalls: [],
      functionResults: [],
      timestamp: Date.now(),
    };

    session.addTurn(turn);
    expect(session.getTurnCount()).toBe(1);
  });

  it("should get messages from turns", () => {
    const turn: CompletedTurn = {
      id: "turn-1",
      userMessage: { role: "user", content: "Hello" },
      assistantMessage: { role: "assistant", content: "Hi there" },
      functionCalls: [],
      functionResults: [],
      timestamp: Date.now(),
    };

    session.addTurn(turn);
    const messages = session.getMessages();

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("user");
    expect(messages[1].role).toBe("assistant");
  });

  it("should include system prompt in messages", () => {
    const sessionWithPrompt = new Session(undefined, {
      systemPrompt: "You are a helpful assistant",
    });

    const messages = sessionWithPrompt.getMessages();
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toBe("You are a helpful assistant");
  });

  it("should handle function calls in turns", () => {
    const turn: CompletedTurn = {
      id: "turn-1",
      userMessage: { role: "user", content: "What is the weather?" },
      assistantMessage: { role: "assistant", content: "" },
      functionCalls: [
        { id: "call-1", name: "get_weather", params: { city: "Tokyo" } },
      ],
      functionResults: [
        { id: "call-1", name: "get_weather", result: { temp: 20 } },
      ],
      timestamp: Date.now(),
    };

    session.addTurn(turn);
    const messages = session.getMessages();

    expect(messages.some((m) => m.functionCall)).toBe(true);
    expect(messages.some((m) => m.functionResponse)).toBe(true);
  });

  it("should get recent turns", () => {
    for (let i = 0; i < 10; i++) {
      session.addTurn({
        id: `turn-${i}`,
        userMessage: { role: "user", content: `Message ${i}` },
        assistantMessage: { role: "assistant", content: `Response ${i}` },
        functionCalls: [],
        functionResults: [],
        timestamp: Date.now(),
      });
    }

    const recent = session.getRecentTurns(3);
    expect(recent).toHaveLength(3);
    expect(recent[2].id).toBe("turn-9");
  });

  it("should calculate stats correctly", () => {
    session.addTurn({
      id: "turn-1",
      userMessage: { role: "user", content: "Hello" },
      assistantMessage: { role: "assistant", content: "Hi" },
      functionCalls: [{ id: "call-1", name: "test_tool", params: {} }],
      functionResults: [{ id: "call-1", name: "test_tool", result: {} }],
      timestamp: Date.now(),
      metadata: {
        tokensUsed: 100,
        duration: 1000,
      },
    });

    const stats = session.getStats();
    expect(stats.totalTurns).toBe(1);
    expect(stats.totalTokens).toBe(100);
    expect(stats.avgTurnDuration).toBe(1000);
    expect(stats.toolCallCount).toBe(1);
  });

  it("should truncate old turns when exceeding max history", () => {
    const sessionWithLimit = new Session(undefined, {
      maxHistoryLength: 3,
      keepRecentTurns: 3,
    });

    for (let i = 0; i < 10; i++) {
      sessionWithLimit.addTurn({
        id: `turn-${i}`,
        userMessage: { role: "user", content: `Message ${i}` },
        assistantMessage: { role: "assistant", content: `Response ${i}` },
        functionCalls: [],
        functionResults: [],
        timestamp: Date.now(),
      });
    }

    // After adding 10 turns with maxHistoryLength=3 and keepRecentTurns=3
    // Should keep only the last 3 turns
    expect(sessionWithLimit.getTurnCount()).toBe(3);
  });

  it("should serialize and deserialize", () => {
    session.addTurn({
      id: "turn-1",
      userMessage: { role: "user", content: "Hello" },
      assistantMessage: { role: "assistant", content: "Hi" },
      functionCalls: [],
      functionResults: [],
      timestamp: Date.now(),
    });

    const json = session.toJSON();
    const restored = Session.fromJSON(json);

    expect(restored.id).toBe(session.id);
    expect(restored.getTurnCount()).toBe(session.getTurnCount());
  });

  it("should update system prompt", () => {
    session.setSystemPrompt("New system prompt");
    const messages = session.getMessages();

    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toBe("New system prompt");
  });
});
