import { beforeEach, describe, expect, it } from "vitest";
import { Session } from "./session.js";
import type { CompletedTurn } from "./types.js";

describe("Session", () => {
  let session: Session;

  beforeEach(() => {
    session = new Session("test-id");
  });

  describe("constructor", () => {
    it("should accept custom config", () => {
      const customSession = new Session("custom-id", {
        systemPrompt: "You are a helpful assistant",
        maxHistoryLength: 50,
        maxContextTokens: 5000,
        keepRecentTurns: 5,
      });

      expect(customSession.id).toBe("custom-id");
    });
  });

  describe("addTurn", () => {
    it("should add turn and update metadata", () => {
      const turn: CompletedTurn = {
        id: "turn-1",
        userMessage: { role: "user", content: "Hello" },
        assistantMessage: { role: "assistant", content: "Hi" },
        functionCalls: [],
        functionResults: [],
        timestamp: Date.now(),
      };

      session.addTurn(turn);

      expect(session.getTurnCount()).toBe(1);
      expect(session.getSummary().totalTurns).toBe(1);
    });

    it("should truncate old turns when exceeding maxHistoryLength", () => {
      const customSession = new Session("test", {
        maxHistoryLength: 5,
        keepRecentTurns: 2,
      });

      for (let i = 1; i <= 10; i++) {
        const turn: CompletedTurn = {
          id: `turn-${i}`,
          userMessage: { role: "user", content: `Message ${i}` },
          assistantMessage: { role: "assistant", content: `Response ${i}` },
          functionCalls: [],
          functionResults: [],
          timestamp: Date.now(),
        };
        customSession.addTurn(turn);
      }

      expect(customSession.getTurnCount()).toBe(2);
      const recentTurns = customSession.getRecentTurns(2);
      expect(recentTurns[0].id).toBe("turn-9");
      expect(recentTurns[1].id).toBe("turn-10");
    });
  });

  describe("getMessages", () => {
    it("should return empty array for no turns", () => {
      const messages = session.getMessages();
      expect(messages).toEqual([]);
    });

    it("should include system prompt if set", () => {
      const sessionWithPrompt = new Session("test", {
        systemPrompt: "You are helpful",
      });

      const turn: CompletedTurn = {
        id: "turn-1",
        userMessage: { role: "user", content: "Hello" },
        assistantMessage: { role: "assistant", content: "Hi" },
        functionCalls: [],
        functionResults: [],
        timestamp: Date.now(),
      };

      sessionWithPrompt.addTurn(turn);
      const messages = sessionWithPrompt.getMessages();

      expect(messages[0].role).toBe("system");
      expect(messages[0].content).toBe("You are helpful");
    });

    it("should convert turns to messages", () => {
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

      expect(messages.length).toBe(2);
      expect(messages[0].role).toBe("user");
      expect(messages[0].content).toBe("Hello");
      expect(messages[1].role).toBe("assistant");
      expect(messages[1].content).toBe("Hi there");
    });

    it("should include function calls and responses", () => {
      const turn: CompletedTurn = {
        id: "turn-1",
        userMessage: { role: "user", content: "What's the weather?" },
        assistantMessage: { role: "assistant", content: "" },
        functionCalls: [
          {
            id: "call-1",
            name: "get_weather",
            params: { city: "Tokyo" },
          },
        ],
        functionResults: [
          {
            id: "call-1",
            name: "get_weather",
            result: { temperature: 25, condition: "sunny" },
          },
        ],
        timestamp: Date.now(),
      };

      session.addTurn(turn);
      const messages = session.getMessages();

      expect(messages.length).toBe(3);
      expect(messages[0].role).toBe("user");
      expect(messages[1].role).toBe("assistant");
      expect(messages[1].functionCall).toBeDefined();
      expect(messages[2].role).toBe("function");
      expect(messages[2].functionResponse).toBeDefined();
    });

    it("should handle assistant message with content and no function calls", () => {
      const turn: CompletedTurn = {
        id: "turn-1",
        userMessage: { role: "user", content: "Hello" },
        assistantMessage: { role: "assistant", content: "Hi, how can I help?" },
        functionCalls: [],
        functionResults: [],
        timestamp: Date.now(),
      };

      session.addTurn(turn);
      const messages = session.getMessages();

      expect(messages.length).toBe(2);
      expect(messages[1].content).toBe("Hi, how can I help?");
    });
  });

  describe("getRecentTurns", () => {
    it("should return requested number of recent turns", () => {
      for (let i = 1; i <= 5; i++) {
        const turn: CompletedTurn = {
          id: `turn-${i}`,
          userMessage: { role: "user", content: `Message ${i}` },
          assistantMessage: { role: "assistant", content: `Response ${i}` },
          functionCalls: [],
          functionResults: [],
          timestamp: Date.now(),
        };
        session.addTurn(turn);
      }

      const recent = session.getRecentTurns(3);
      expect(recent.length).toBe(3);
      expect(recent[0].id).toBe("turn-3");
      expect(recent[2].id).toBe("turn-5");
    });

    it("should return all turns if count exceeds total", () => {
      const turn: CompletedTurn = {
        id: "turn-1",
        userMessage: { role: "user", content: "Hello" },
        assistantMessage: { role: "assistant", content: "Hi" },
        functionCalls: [],
        functionResults: [],
        timestamp: Date.now(),
      };

      session.addTurn(turn);
      const recent = session.getRecentTurns(10);
      expect(recent.length).toBe(1);
    });
  });

  describe("getTurnCount", () => {
    it("should return zero for new session", () => {
      expect(session.getTurnCount()).toBe(0);
    });

    it("should return correct count after adding turns", () => {
      const turn: CompletedTurn = {
        id: "turn-1",
        userMessage: { role: "user", content: "Hello" },
        assistantMessage: { role: "assistant", content: "Hi" },
        functionCalls: [],
        functionResults: [],
        timestamp: Date.now(),
      };

      session.addTurn(turn);
      expect(session.getTurnCount()).toBe(1);

      session.addTurn({ ...turn, id: "turn-2" });
      expect(session.getTurnCount()).toBe(2);
    });
  });

  describe("getStats", () => {
    it("should return stats for empty session", () => {
      const stats = session.getStats();

      expect(stats.totalTurns).toBe(0);
      expect(stats.totalTokens).toBe(0);
      expect(stats.avgTurnDuration).toBe(0);
      expect(stats.toolCallCount).toBe(0);
      expect(stats.createdAt).toBeGreaterThan(0);
      expect(stats.lastActiveAt).toBeGreaterThan(0);
    });

    it("should calculate stats correctly", () => {
      const turn1: CompletedTurn = {
        id: "turn-1",
        userMessage: { role: "user", content: "Hello" },
        assistantMessage: { role: "assistant", content: "Hi" },
        functionCalls: [],
        functionResults: [],
        timestamp: Date.now(),
        metadata: {
          tokensUsed: 100,
          duration: 1000,
        },
      };

      const turn2: CompletedTurn = {
        id: "turn-2",
        userMessage: { role: "user", content: "Weather?" },
        assistantMessage: { role: "assistant", content: "Sunny" },
        functionCalls: [
          { id: "call-1", name: "get_weather", params: {} },
          { id: "call-2", name: "get_forecast", params: {} },
        ],
        functionResults: [],
        timestamp: Date.now(),
        metadata: {
          tokensUsed: 150,
          duration: 2000,
        },
      };

      session.addTurn(turn1);
      session.addTurn(turn2);

      const stats = session.getStats();

      expect(stats.totalTurns).toBe(2);
      expect(stats.totalTokens).toBe(250);
      expect(stats.avgTurnDuration).toBe(1500);
      expect(stats.toolCallCount).toBe(2);
    });
  });

  describe("setSystemPrompt", () => {
    it("should set system prompt", () => {
      session.setSystemPrompt("Be helpful");

      const turn: CompletedTurn = {
        id: "turn-1",
        userMessage: { role: "user", content: "Hello" },
        assistantMessage: { role: "assistant", content: "Hi" },
        functionCalls: [],
        functionResults: [],
        timestamp: Date.now(),
      };

      session.addTurn(turn);
      const messages = session.getMessages();

      expect(messages[0].role).toBe("system");
      expect(messages[0].content).toBe("Be helpful");
    });
  });

  describe("toJSON and fromJSON", () => {
    it("should serialize and deserialize correctly", () => {
      const turn: CompletedTurn = {
        id: "turn-1",
        userMessage: { role: "user", content: "Hello" },
        assistantMessage: { role: "assistant", content: "Hi" },
        functionCalls: [],
        functionResults: [],
        timestamp: Date.now(),
      };

      session.addTurn(turn);
      session.setSystemPrompt("Be helpful");

      const json = session.toJSON();
      const restored = Session.fromJSON(json);

      expect(restored.id).toBe(session.id);
      expect(restored.getTurnCount()).toBe(1);
      expect(restored.getMessages()[0].role).toBe("system");
    });

    it("should preserve all metadata", () => {
      session["metadata"].tags = ["important"];

      const json = session.toJSON();
      const restored = Session.fromJSON(json);

      expect(restored.getSummary().tags).toEqual(["important"]);
    });

    it("should generate default preview if missing", () => {
      const json = session.toJSON();
      delete (json as any).preview;

      const restored = Session.fromJSON(json);
      expect(restored.getSummary().preview).toMatch(/^Conversation/);
    });
  });

  describe("getSummary", () => {
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
      expect(summary.preview).toBe("第一条消息");
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
      expect(summary.preview.length).toBe(103);
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
});
