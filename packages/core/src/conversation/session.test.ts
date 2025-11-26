import { beforeEach, describe, expect, it } from "vitest";
import type { CompletedTurn } from "../types.js";
import { Session } from "./session.js";

describe("Session", () => {
  let session: Session;

  beforeEach(() => {
    session = new Session(undefined, {
      systemPrompt: "Test system prompt",
    });
  });

  describe("Basic functionality", () => {
    it("should create a session with a generated ID", () => {
      expect(session.id).toBeDefined();
      expect(session.id.length).toBeGreaterThan(0);
    });

    it("should create a session with provided ID", () => {
      const customSession = new Session("custom-id");
      expect(customSession.id).toBe("custom-id");
    });

    it("should add turns correctly", () => {
      const turn: CompletedTurn = {
        id: "turn-1",
        userMessage: { role: "user", content: "Hello" },
        assistantMessage: { role: "assistant", content: "Hi there!" },
        functionCalls: [],
        functionResults: [],
        timestamp: Date.now(),
      };

      session.addTurn(turn);
      expect(session.getTurnCount()).toBe(1);
    });

    it("should get messages correctly", () => {
      const turn: CompletedTurn = {
        id: "turn-1",
        userMessage: { role: "user", content: "Hello" },
        assistantMessage: { role: "assistant", content: "Hi!" },
        functionCalls: [],
        functionResults: [],
        timestamp: Date.now(),
      };

      session.addTurn(turn);
      const messages = session.getMessages();

      expect(messages.length).toBe(3); // system + user + assistant
      expect(messages[0].role).toBe("system");
      expect(messages[1].role).toBe("user");
      expect(messages[2].role).toBe("assistant");
    });
  });

  describe("Fork functionality", () => {
    beforeEach(() => {
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
        {
          id: "turn-3",
          userMessage: { role: "user", content: "Turn 3" },
          assistantMessage: { role: "assistant", content: "Response 3" },
          functionCalls: [],
          functionResults: [],
          timestamp: Date.now(),
        },
      ];

      for (const turn of turns) {
        session.addTurn(turn);
      }
    });

    it("should fork a session at specified turn", () => {
      const forkedSession = session.fork(1);

      expect(forkedSession.id).not.toBe(session.id);
      expect(forkedSession.getTurnCount()).toBe(2); // turns 0 and 1
      expect(forkedSession.parentSessionId).toBe(session.id);
      expect(forkedSession.forkAtTurn).toBe(1);
    });

    it("should fork at last turn by default", () => {
      const forkedSession = session.fork();

      expect(forkedSession.getTurnCount()).toBe(3);
      expect(forkedSession.forkAtTurn).toBe(2);
    });

    it("should throw error for invalid turn index", () => {
      expect(() => session.fork(10)).toThrow();
      expect(() => session.fork(-1)).toThrow();
    });

    it("should preserve system prompt in forked session", () => {
      const forkedSession = session.fork(0);
      const messages = forkedSession.getMessages();

      expect(messages[0].role).toBe("system");
      expect(messages[0].content).toBe("Test system prompt");
    });

    it("should have independent turns after fork", () => {
      const forkedSession = session.fork(1);

      const newTurn: CompletedTurn = {
        id: "turn-4",
        userMessage: { role: "user", content: "New turn" },
        assistantMessage: { role: "assistant", content: "New response" },
        functionCalls: [],
        functionResults: [],
        timestamp: Date.now(),
      };

      forkedSession.addTurn(newTurn);

      expect(session.getTurnCount()).toBe(3);
      expect(forkedSession.getTurnCount()).toBe(3); // 2 from fork + 1 new
    });

    it("should get fork info correctly", () => {
      const forkedSession = session.fork(1);
      const forkInfo = forkedSession.getForkInfo();

      expect(forkInfo.parentSessionId).toBe(session.id);
      expect(forkInfo.forkAtTurn).toBe(1);
    });

    it("should get turns up to specified index", () => {
      const turns = session.getTurnsUpTo(1);

      expect(turns.length).toBe(2);
      expect(turns[0].userMessage.content).toBe("Turn 1");
      expect(turns[1].userMessage.content).toBe("Turn 2");
    });
  });

  describe("Serialization", () => {
    it("should preserve all data through serialization including fork info", () => {
      const turn: CompletedTurn = {
        id: "turn-1",
        userMessage: { role: "user", content: "Hello" },
        assistantMessage: { role: "assistant", content: "Hi!" },
        functionCalls: [],
        functionResults: [],
        timestamp: Date.now(),
      };

      session.addTurn(turn);
      const forkedSession = session.fork(0);
      const serialized = forkedSession.toJSON();
      const deserialized = Session.fromJSON(serialized);

      expect(deserialized.id).toBe(forkedSession.id);
      expect(deserialized.getTurnCount()).toBe(1);
      expect(deserialized.parentSessionId).toBe(session.id);
      expect(deserialized.forkAtTurn).toBe(0);
    });

    it("should throw error for invalid session data", () => {
      expect(() => Session.fromJSON(null as any)).toThrow(
        "Invalid session data",
      );
      expect(() => Session.fromJSON({} as any)).toThrow("Invalid session data");
    });
  });

  describe("Session summary", () => {
    it("should generate summary correctly", () => {
      const turn: CompletedTurn = {
        id: "turn-1",
        userMessage: { role: "user", content: "Hello world" },
        assistantMessage: { role: "assistant", content: "Hi!" },
        functionCalls: [],
        functionResults: [],
        timestamp: Date.now(),
      };

      session.addTurn(turn);
      const summary = session.getSummary();

      expect(summary.id).toBe(session.id);
      expect(summary.turnCount).toBe(1);
      expect(summary.preview).toBe("Hello world");
    });

    it("should include fork info in summary", () => {
      const turn: CompletedTurn = {
        id: "turn-1",
        userMessage: { role: "user", content: "Test" },
        assistantMessage: { role: "assistant", content: "Response" },
        functionCalls: [],
        functionResults: [],
        timestamp: Date.now(),
      };
      session.addTurn(turn);

      const forkedSession = session.fork(0);
      const summary = forkedSession.getSummary();

      expect(summary.parentSessionId).toBe(session.id);
      expect(summary.forkAtTurn).toBe(0);
    });
  });

  describe("Conversation summary", () => {
    it("should set and get conversation summary", () => {
      session.setSummary("This is a test summary");
      expect(session.getConversationSummary()).toBe("This is a test summary");
    });

    it("should return undefined when no summary is set", () => {
      expect(session.getConversationSummary()).toBeUndefined();
    });

    it("should include summary in messages", () => {
      session.setSummary("Previous conversation summary");
      const turn: CompletedTurn = {
        id: "turn-1",
        userMessage: { role: "user", content: "Hello" },
        assistantMessage: { role: "assistant", content: "Hi!" },
        functionCalls: [],
        functionResults: [],
        timestamp: Date.now(),
      };
      session.addTurn(turn);

      const messages = session.getMessages();
      expect(messages[0].role).toBe("system");
      expect(messages[0].content).toBe("Test system prompt");
      expect(messages[1].role).toBe("system");
      expect(messages[1].content).toContain("Previous conversation summary");
    });

    it("should serialize and deserialize summary", () => {
      session.setSummary("Test summary");
      const serialized = session.toJSON();
      const deserialized = Session.fromJSON(serialized);

      expect(deserialized.getConversationSummary()).toBe("Test summary");
    });
  });

  describe("Turn management", () => {
    it("should get all turns", () => {
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

      const allTurns = session.getAllTurns();
      expect(allTurns.length).toBe(2);
      expect(allTurns[0].id).toBe("turn-1");
      expect(allTurns[1].id).toBe("turn-2");
    });

    it("should replace turns", () => {
      const originalTurns: CompletedTurn[] = [
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

      for (const turn of originalTurns) {
        session.addTurn(turn);
      }

      const newTurns: CompletedTurn[] = [
        {
          id: "turn-3",
          userMessage: { role: "user", content: "New turn" },
          assistantMessage: { role: "assistant", content: "New response" },
          functionCalls: [],
          functionResults: [],
          timestamp: Date.now(),
        },
      ];

      session.replaceTurns(newTurns);

      expect(session.getTurnCount()).toBe(1);
      expect(session.getAllTurns()[0].id).toBe("turn-3");
    });
  });
});
