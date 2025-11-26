import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConversationManager } from "../conversation/manager.js";
import { InMemorySessionStorage } from "../conversation/memory.js";
import type { AgentEvent, AiSdkModel } from "../types.js";
import { AIPexAgent } from "./wrapper.js";

vi.mock("@openai/agents", () => ({
  Agent: vi.fn(),
  run: vi.fn(),
}));

import type { StreamedRunResult } from "@openai/agents";
import { run } from "@openai/agents";

const mockModel = {} as AiSdkModel;

// Helper to create a properly typed mock result
// Note: We use 'unknown' to bypass the private field requirement,
// then cast to the expected type. This matches how the actual code
// handles the usage field (see wrapper.ts line 85-87).
function createMockRunResult(
  overrides: {
    finalOutput?: string;
    usage?: { promptTokens?: number; completionTokens?: number };
  } = {},
): StreamedRunResult<unknown, any> {
  return {
    finalOutput: "",
    ...overrides,
  } as unknown as StreamedRunResult<unknown, any>;
}

describe("AIPexAgent", () => {
  let manager: ConversationManager;

  beforeEach(() => {
    vi.resetAllMocks();
    const storage = new InMemorySessionStorage();
    manager = new ConversationManager(storage);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("executeStream", () => {
    it("should create session and yield events in correct order", async () => {
      vi.mocked(run).mockResolvedValue(
        createMockRunResult({ finalOutput: "Hello!" }),
      );

      const agent = AIPexAgent.create({
        instructions: "Test agent",
        model: mockModel,
        conversationManager: manager,
      });

      const events: AgentEvent[] = [];
      for await (const event of agent.executeStream("Hi")) {
        events.push(event);
      }

      expect(events[0].type).toBe("session_created");
      expect(events[1]).toEqual({ type: "content_delta", delta: "Hello!" });
      expect(events[2].type).toBe("metrics_update");
      expect(events[3]).toEqual({ type: "turn_complete", turnNumber: 1 });
      expect(events[4].type).toBe("execution_complete");
      if (events[4].type === "execution_complete") {
        expect(events[4].turns).toBe(1);
        expect(events[4].finalOutput).toBe("Hello!");
        expect(events[4].metrics).toBeDefined();
      }
    });

    it("should persist turn to session after execution", async () => {
      vi.mocked(run).mockResolvedValue(
        createMockRunResult({ finalOutput: "Response" }),
      );

      const agent = AIPexAgent.create({
        instructions: "Test",
        model: mockModel,
        conversationManager: manager,
      });

      let sessionId: string | undefined;
      for await (const event of agent.executeStream("Hello")) {
        if (event.type === "session_created") {
          sessionId = event.sessionId;
        }
      }

      const session = await manager.getSession(sessionId!);
      expect(session?.getTurnCount()).toBe(1);
    });

    it("should work without conversation manager", async () => {
      vi.mocked(run).mockResolvedValue(
        createMockRunResult({ finalOutput: "Reply" }),
      );

      const agent = AIPexAgent.create({
        instructions: "Test",
        model: mockModel,
      });

      const events: AgentEvent[] = [];
      for await (const event of agent.executeStream("Hi")) {
        events.push(event);
      }

      expect(events.find((e) => e.type === "session_created")).toBeUndefined();
      expect(events[0].type).toBe("content_delta");
    });
  });

  describe("continueConversation", () => {
    it("should throw error without conversation manager", async () => {
      const agent = AIPexAgent.create({
        instructions: "Test",
        model: mockModel,
      });

      await expect(async () => {
        for await (const _ of agent.continueConversation("session-1", "Hi")) {
          // consume generator
        }
      }).rejects.toThrow("ConversationManager is required");
    });

    it("should throw error for non-existent session", async () => {
      const agent = AIPexAgent.create({
        instructions: "Test",
        model: mockModel,
        conversationManager: manager,
      });

      await expect(async () => {
        for await (const _ of agent.continueConversation(
          "non-existent",
          "Hi",
        )) {
          // consume generator
        }
      }).rejects.toThrow("Session non-existent not found");
    });

    it("should resume existing session and increment turn count", async () => {
      vi.mocked(run).mockResolvedValue(
        createMockRunResult({ finalOutput: "Response 1" }),
      );

      const agent = AIPexAgent.create({
        instructions: "Test",
        model: mockModel,
        conversationManager: manager,
      });

      let sessionId: string | undefined;
      for await (const event of agent.executeStream("First message")) {
        if (event.type === "session_created") {
          sessionId = event.sessionId;
        }
      }

      vi.mocked(run).mockResolvedValue(
        createMockRunResult({ finalOutput: "Response 2" }),
      );

      const events: AgentEvent[] = [];
      for await (const event of agent.continueConversation(
        sessionId!,
        "Second message",
      )) {
        events.push(event);
      }

      expect(events[0]).toEqual({
        type: "session_resumed",
        sessionId,
        turnCount: 1,
      });

      const session = await manager.getSession(sessionId!);
      expect(session?.getTurnCount()).toBe(2);
    });
  });

  describe("create", () => {
    it("should use default values when options not provided", () => {
      const agent = AIPexAgent.create({
        instructions: "Test",
        model: mockModel,
      });

      expect(agent).toBeDefined();
    });
  });

  describe("metrics", () => {
    it("should yield metrics_update event with correct data", async () => {
      vi.mocked(run).mockResolvedValue(
        createMockRunResult({
          finalOutput: "Response",
          usage: {
            promptTokens: 10,
            completionTokens: 20,
          },
        }),
      );

      const agent = AIPexAgent.create({
        instructions: "Test",
        model: mockModel,
        maxTokens: 4096,
        maxTurns: 5,
      });

      const events: AgentEvent[] = [];
      for await (const event of agent.executeStream("Test input")) {
        events.push(event);
      }

      const metricsEvent = events.find((e) => e.type === "metrics_update");
      expect(metricsEvent).toBeDefined();
      if (metricsEvent && metricsEvent.type === "metrics_update") {
        expect(metricsEvent.metrics.tokensUsed).toBe(30);
        expect(metricsEvent.metrics.promptTokens).toBe(10);
        expect(metricsEvent.metrics.completionTokens).toBe(20);
        expect(metricsEvent.metrics.maxTokens).toBe(4096);
        expect(metricsEvent.metrics.maxTurns).toBe(5);
        expect(metricsEvent.metrics.turnCount).toBe(1);
        expect(metricsEvent.metrics.startTime).toBeGreaterThan(0);
        expect(metricsEvent.metrics.duration).toBeGreaterThanOrEqual(0);
      }
    });

    it("should handle missing usage data gracefully", async () => {
      vi.mocked(run).mockResolvedValue(
        createMockRunResult({
          finalOutput: "Response",
        }),
      );

      const agent = AIPexAgent.create({
        instructions: "Test",
        model: mockModel,
      });

      const events: AgentEvent[] = [];
      for await (const event of agent.executeStream("Test")) {
        events.push(event);
      }

      const metricsEvent = events.find((e) => e.type === "metrics_update");
      expect(metricsEvent).toBeDefined();
      if (metricsEvent && metricsEvent.type === "metrics_update") {
        expect(metricsEvent.metrics.tokensUsed).toBe(0);
        expect(metricsEvent.metrics.promptTokens).toBe(0);
        expect(metricsEvent.metrics.completionTokens).toBe(0);
      }
    });

    it("should include metrics in execution_complete event", async () => {
      vi.mocked(run).mockResolvedValue(
        createMockRunResult({
          finalOutput: "Done",
          usage: {
            promptTokens: 15,
            completionTokens: 25,
          },
        }),
      );

      const agent = AIPexAgent.create({
        instructions: "Test",
        model: mockModel,
        maxTokens: 2000,
      });

      const events: AgentEvent[] = [];
      for await (const event of agent.executeStream("Input")) {
        events.push(event);
      }

      const completeEvent = events.find((e) => e.type === "execution_complete");
      expect(completeEvent).toBeDefined();
      if (completeEvent && completeEvent.type === "execution_complete") {
        expect(completeEvent.metrics.tokensUsed).toBe(40);
        expect(completeEvent.metrics.maxTokens).toBe(2000);
        expect(completeEvent.metrics.turnCount).toBe(1);
      }
    });

    it("should save token metadata to session turns", async () => {
      vi.mocked(run).mockResolvedValue(
        createMockRunResult({
          finalOutput: "Response",
          usage: {
            promptTokens: 5,
            completionTokens: 10,
          },
        }),
      );

      const agent = AIPexAgent.create({
        instructions: "Test",
        model: mockModel,
        conversationManager: manager,
      });

      let sessionId: string | undefined;
      for await (const event of agent.executeStream("Hello")) {
        if (event.type === "session_created") {
          sessionId = event.sessionId;
        }
      }

      const session = await manager.getSession(sessionId!);
      expect(session).toBeDefined();
      const turns = session!.getRecentTurns(1);
      expect(turns).toHaveLength(1);
      expect(turns[0].metadata?.tokensUsed).toBe(15);
      expect(turns[0].metadata?.duration).toBeGreaterThanOrEqual(0);
    });

    it("should accumulate metrics in continueConversation", async () => {
      vi.mocked(run).mockResolvedValue(
        createMockRunResult({
          finalOutput: "Response 1",
          usage: { promptTokens: 10, completionTokens: 10 },
        }),
      );

      const agent = AIPexAgent.create({
        instructions: "Test",
        model: mockModel,
        conversationManager: manager,
      });

      let sessionId: string | undefined;
      for await (const event of agent.executeStream("First")) {
        if (event.type === "session_created") {
          sessionId = event.sessionId;
        }
      }

      vi.mocked(run).mockResolvedValue(
        createMockRunResult({
          finalOutput: "Response 2",
          usage: { promptTokens: 20, completionTokens: 20 },
        }),
      );

      const events: AgentEvent[] = [];
      for await (const event of agent.continueConversation(
        sessionId!,
        "Second",
      )) {
        events.push(event);
      }

      const metricsEvent = events.find((e) => e.type === "metrics_update");
      expect(metricsEvent).toBeDefined();
      if (metricsEvent && metricsEvent.type === "metrics_update") {
        expect(metricsEvent.metrics.turnCount).toBe(2);
        expect(metricsEvent.metrics.tokensUsed).toBe(40);
      }

      const session = await manager.getSession(sessionId!);
      const stats = session!.getStats();
      expect(stats.totalTokens).toBe(60);
    });
  });
});
