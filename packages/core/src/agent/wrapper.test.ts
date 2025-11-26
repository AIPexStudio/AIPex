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

function createMockRunResult(
  overrides: {
    finalOutput?: string;
    usage?: { promptTokens?: number; completionTokens?: number };
    streamEvents?: any[];
  } = {},
): StreamedRunResult<unknown, any> {
  const events = overrides.streamEvents ?? [];
  return {
    finalOutput: overrides.finalOutput ?? "",
    rawResponses: overrides.usage
      ? [
          {
            usage: {
              inputTokens: overrides.usage.promptTokens ?? 0,
              outputTokens: overrides.usage.completionTokens ?? 0,
            },
          },
        ]
      : [],
    async *[Symbol.asyncIterator]() {
      for (const event of events) {
        yield event;
      }
    },
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
        createMockRunResult({
          finalOutput: "Hello!",
          streamEvents: [
            {
              type: "raw_model_stream_event",
              data: { type: "output_text_delta", delta: "Hello!" },
            },
          ],
        }),
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
      expect(events[3].type).toBe("execution_complete");
      if (events[3].type === "execution_complete") {
        expect(events[3].finalOutput).toBe("Hello!");
        expect(events[3].metrics).toBeDefined();
      }
    });

    it("should work without conversation manager", async () => {
      vi.mocked(run).mockResolvedValue(
        createMockRunResult({
          finalOutput: "Reply",
          streamEvents: [
            {
              type: "raw_model_stream_event",
              data: { type: "output_text_delta", delta: "Reply" },
            },
          ],
        }),
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

    it("should resume existing session", async () => {
      vi.mocked(run).mockResolvedValue(
        createMockRunResult({
          finalOutput: "Response 1",
          streamEvents: [
            {
              type: "raw_model_stream_event",
              data: { type: "output_text_delta", delta: "Response 1" },
            },
          ],
        }),
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
        createMockRunResult({
          finalOutput: "Response 2",
          streamEvents: [
            {
              type: "raw_model_stream_event",
              data: { type: "output_text_delta", delta: "Response 2" },
            },
          ],
        }),
      );

      const events: AgentEvent[] = [];
      for await (const event of agent.continueConversation(
        sessionId!,
        "Second message",
      )) {
        events.push(event);
      }

      expect(events[0].type).toBe("session_resumed");
      if (events[0].type === "session_resumed") {
        expect(events[0].sessionId).toBe(sessionId);
      }
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
          streamEvents: [
            {
              type: "raw_model_stream_event",
              data: { type: "output_text_delta", delta: "Response" },
            },
          ],
        }),
      );

      const agent = AIPexAgent.create({
        instructions: "Test",
        model: mockModel,
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
        expect(metricsEvent.metrics.maxTurns).toBe(5);
        expect(metricsEvent.metrics.startTime).toBeGreaterThan(0);
        expect(metricsEvent.metrics.duration).toBeGreaterThanOrEqual(0);
      }
    });

    it("should handle missing usage data gracefully", async () => {
      vi.mocked(run).mockResolvedValue(
        createMockRunResult({
          finalOutput: "Response",
          streamEvents: [
            {
              type: "raw_model_stream_event",
              data: { type: "output_text_delta", delta: "Response" },
            },
          ],
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
          streamEvents: [
            {
              type: "raw_model_stream_event",
              data: { type: "output_text_delta", delta: "Done" },
            },
          ],
        }),
      );

      const agent = AIPexAgent.create({
        instructions: "Test",
        model: mockModel,
      });

      const events: AgentEvent[] = [];
      for await (const event of agent.executeStream("Input")) {
        events.push(event);
      }

      const completeEvent = events.find((e) => e.type === "execution_complete");
      expect(completeEvent).toBeDefined();
      if (completeEvent && completeEvent.type === "execution_complete") {
        expect(completeEvent.metrics.tokensUsed).toBe(40);
      }
    });
  });

  describe("tools and errors", () => {
    it("should emit tool lifecycle events", async () => {
      vi.mocked(run).mockResolvedValue(
        createMockRunResult({
          finalOutput: "",
          streamEvents: [
            {
              type: "run_item_stream_event",
              name: "tool_called",
              item: { rawItem: { name: "calculator", arguments: '{"a":1}' } },
            },
            {
              type: "run_item_stream_event",
              name: "tool_output",
              item: {
                rawItem: { name: "calculator", status: "completed" },
                output: '{"result":2}',
              },
            },
          ],
        }),
      );

      const agent = AIPexAgent.create({
        instructions: "Tools",
        model: mockModel,
      });

      const events: AgentEvent[] = [];
      for await (const event of agent.executeStream("use tool")) {
        events.push(event);
      }

      const start = events.find((event) => event.type === "tool_call_start");
      const complete = events.find(
        (event) => event.type === "tool_call_complete",
      );
      expect(start).toBeDefined();
      expect(complete).toBeDefined();
      if (complete?.type === "tool_call_complete") {
        expect(complete.result).toEqual({ result: 2 });
      }
    });

    it("should emit error event when run fails", async () => {
      vi.mocked(run).mockRejectedValue(new Error("LLM failed"));

      const agent = AIPexAgent.create({
        instructions: "Error",
        model: mockModel,
      });

      const events: AgentEvent[] = [];
      const runPromise = (async () => {
        for await (const event of agent.executeStream("boom")) {
          events.push(event);
        }
      })();

      await expect(runPromise).resolves.toBeUndefined();
      expect(events.some((event) => event.type === "error")).toBe(true);
    });
  });
});
