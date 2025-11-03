import { beforeEach, describe, expect, it } from "vitest";
import { Session } from "./session.js";
import type { CompletedTurn } from "./types.js";

describe("Session.getSummary", () => {
  let session: Session;

  beforeEach(() => {
    session = new Session("test-id");
  });

  it("should generate preview from first user message", () => {
    const turn: CompletedTurn = {
      id: "turn-1",
      userMessage: { role: "user", content: "帮我分析代码" },
      assistantMessage: { role: "assistant", content: "好的" },
      functionCalls: [],
      functionResults: [],
      timestamp: Date.now(),
    };

    session.addTurn(turn);

    const summary = session.getSummary();
    expect(summary.id).toBe("test-id");
    expect(summary.preview).toBe("帮我分析代码");
    expect(summary.totalTurns).toBe(1);
    expect(summary.createdAt).toBeGreaterThan(0);
    expect(summary.lastActiveAt).toBeGreaterThan(0);
  });

  it("should use default preview when no user message", () => {
    const summary = session.getSummary();
    expect(summary.preview).toMatch(/^Conversation/);
    expect(summary.totalTurns).toBe(0);
  });

  it("should handle multiple turns correctly", () => {
    const turn1: CompletedTurn = {
      id: "turn-1",
      userMessage: { role: "user", content: "第一条消息" },
      assistantMessage: { role: "assistant", content: "回复1" },
      functionCalls: [],
      functionResults: [],
      timestamp: Date.now(),
    };

    const turn2: CompletedTurn = {
      id: "turn-2",
      userMessage: { role: "user", content: "第二条消息" },
      assistantMessage: { role: "assistant", content: "回复2" },
      functionCalls: [],
      functionResults: [],
      timestamp: Date.now(),
    };

    session.addTurn(turn1);
    session.addTurn(turn2);

    const summary = session.getSummary();
    expect(summary.preview).toBe("第一条消息"); // Should use first message
    expect(summary.totalTurns).toBe(2);
  });

  it("should truncate long first message", () => {
    const longMessage = "A".repeat(150);
    const turn: CompletedTurn = {
      id: "turn-1",
      userMessage: { role: "user", content: longMessage },
      assistantMessage: { role: "assistant", content: "回复" },
      functionCalls: [],
      functionResults: [],
      timestamp: Date.now(),
    };

    session.addTurn(turn);

    const summary = session.getSummary();
    expect(summary.preview.length).toBe(103); // 100 chars + "..."
    expect(summary.preview).toContain("...");
  });

  it("should include tags in summary", () => {
    const sessionWithTags = new Session("test-id", {
      systemPrompt: "test",
    });
    sessionWithTags["metadata"].tags = ["important", "urgent"];

    const turn: CompletedTurn = {
      id: "turn-1",
      userMessage: { role: "user", content: "测试消息" },
      assistantMessage: { role: "assistant", content: "回复" },
      functionCalls: [],
      functionResults: [],
      timestamp: Date.now(),
    };

    sessionWithTags.addTurn(turn);

    const summary = sessionWithTags.getSummary();
    expect(summary.tags).toEqual(["important", "urgent"]);
  });

  it("should update totalTurns in summary", () => {
    const turn: CompletedTurn = {
      id: "turn-1",
      userMessage: { role: "user", content: "测试" },
      assistantMessage: { role: "assistant", content: "回复" },
      functionCalls: [],
      functionResults: [],
      timestamp: Date.now(),
    };

    session.addTurn(turn);
    expect(session.getSummary().totalTurns).toBe(1);

    session.addTurn(turn);
    expect(session.getSummary().totalTurns).toBe(2);
  });
});
