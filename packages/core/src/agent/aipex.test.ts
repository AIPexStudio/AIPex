import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConversationManager } from "../conversation/manager.js";
import { SessionStorage } from "../conversation/storage.js";
import { InMemoryStorage } from "../storage/memory.js";
import type { AgentEvent, AiSdkModel, SerializedSession } from "../types.js";
import { AIPex } from "./aipex.js";

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
    /** Multiple raw responses (for testing multi-turn within single execution) */
    rawResponses?: Array<{
      usage?: { inputTokens?: number; outputTokens?: number };
    }>;
    streamEvents?: any[];
  } = {},
): StreamedRunResult<unknown, any> {
  const events = overrides.streamEvents ?? [];

  // Build rawResponses: if explicit rawResponses provided, use it; otherwise use usage shorthand
  let rawResponses: Array<{ usage?: { inputTokens?: number; outputTokens?: number } }> = [];
  if (overrides.rawResponses) {
    rawResponses = overrides.rawResponses;
  } else if (overrides.usage) {
    rawResponses = [
      {
        usage: {
          inputTokens: overrides.usage.promptTokens ?? 0,
          outputTokens: overrides.usage.completionTokens ?? 0,
        },
      },
    ];
  }

  return {
    finalOutput: overrides.finalOutput ?? "",
    rawResponses,
    async *[Symbol.asyncIterator]() {
      for (const event of events) {
        yield event;
      }
    },
  } as unknown as StreamedRunResult<unknown, any>;
}

describe("AIPex", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("chat - new conversation", () => {
    it("should create session and yield events in correct order (default storage)", async () => {
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

      const agent = AIPex.create({
        instructions: "Test agent",
        model: mockModel,
      });

      const events: AgentEvent[] = [];
      for await (const event of agent.chat("Hi")) {
        events.push(event);
      }

      expect(events[0]?.type).toBe("session_created");
      expect(events[1]).toEqual({ type: "content_delta", delta: "Hello!" });
      expect(events[2]?.type).toBe("metrics_update");
      const executionComplete = events[3];
      expect(executionComplete?.type).toBe("execution_complete");
      if (executionComplete?.type === "execution_complete") {
        expect(executionComplete.finalOutput).toBe("Hello!");
        expect(executionComplete.metrics).toBeDefined();
      }
    });

    it("should work with custom storage", async () => {
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

      const customStorage = new SessionStorage(
        new InMemoryStorage<SerializedSession>(),
      );
      const agent = AIPex.create({
        instructions: "Test",
        model: mockModel,
        storage: customStorage,
      });

      const events: AgentEvent[] = [];
      for await (const event of agent.chat("Hi")) {
        events.push(event);
      }

      expect(events[0]?.type).toBe("session_created");
    });

    it("should work with conversation disabled (stateless)", async () => {
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

      const agent = AIPex.create({
        instructions: "Test",
        model: mockModel,
        conversation: false,
      });

      const events: AgentEvent[] = [];
      for await (const event of agent.chat("Hi")) {
        events.push(event);
      }

      expect(events.find((e) => e.type === "session_created")).toBeUndefined();
      expect(events[0]?.type).toBe("content_delta");
    });

    it("should work with custom conversationManager", async () => {
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

      const storage = new SessionStorage(
        new InMemoryStorage<SerializedSession>(),
      );
      const customManager = new ConversationManager(storage);

      const agent = AIPex.create({
        instructions: "Test",
        model: mockModel,
        conversationManager: customManager,
      });

      const events: AgentEvent[] = [];
      for await (const event of agent.chat("Hi")) {
        events.push(event);
      }

      expect(events[0]?.type).toBe("session_created");
      expect(agent.getConversationManager()).toBe(customManager);
    });
  });

  describe("chat - continue conversation", () => {
    it("should throw error when conversation is disabled", async () => {
      const agent = AIPex.create({
        instructions: "Test",
        model: mockModel,
        conversation: false,
      });

      await expect(async () => {
        for await (const _ of agent.chat("Hi", { sessionId: "session-1" })) {
          // consume generator
        }
      }).rejects.toThrow("ConversationManager is required");
    });

    it("should throw error for non-existent session", async () => {
      const agent = AIPex.create({
        instructions: "Test",
        model: mockModel,
      });

      await expect(async () => {
        for await (const _ of agent.chat("Hi", { sessionId: "non-existent" })) {
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

      const agent = AIPex.create({
        instructions: "Test",
        model: mockModel,
      });

      let sessionId: string | undefined;
      for await (const event of agent.chat("First message")) {
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
      for await (const event of agent.chat("Second message", {
        sessionId: sessionId!,
      })) {
        events.push(event);
      }

      const sessionResumed = events[0];
      expect(sessionResumed?.type).toBe("session_resumed");
      if (sessionResumed?.type === "session_resumed") {
        expect(sessionResumed.sessionId).toBe(sessionId);
      }
    });
  });

  describe("create", () => {
    it("should use default values when options not provided", () => {
      const agent = AIPex.create({
        instructions: "Test",
        model: mockModel,
      });

      expect(agent).toBeDefined();
      expect(agent.getConversationManager()).toBeDefined();
    });

    it("should expose conversationManager via getConversationManager", () => {
      const agent = AIPex.create({
        instructions: "Test",
        model: mockModel,
      });

      const manager = agent.getConversationManager();
      expect(manager).toBeInstanceOf(ConversationManager);
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

      const agent = AIPex.create({
        instructions: "Test",
        model: mockModel,
        maxTurns: 5,
      });

      const events: AgentEvent[] = [];
      for await (const event of agent.chat("Test input")) {
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

      const agent = AIPex.create({
        instructions: "Test",
        model: mockModel,
      });

      const events: AgentEvent[] = [];
      for await (const event of agent.chat("Test")) {
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

      const agent = AIPex.create({
        instructions: "Test",
        model: mockModel,
      });

      const events: AgentEvent[] = [];
      for await (const event of agent.chat("Input")) {
        events.push(event);
      }

      const completeEvent = events.find((e) => e.type === "execution_complete");
      expect(completeEvent).toBeDefined();
      if (completeEvent && completeEvent.type === "execution_complete") {
        expect(completeEvent.metrics.tokensUsed).toBe(40);
      }
    });

    it("should use last rawResponse usage when multiple responses exist", async () => {
      // Simulate a multi-turn execution where multiple model responses occur
      // (e.g., tool calls triggering additional model calls)
      vi.mocked(run).mockResolvedValue(
        createMockRunResult({
          finalOutput: "Final response",
          rawResponses: [
            // First response (e.g., tool call)
            { usage: { inputTokens: 100, outputTokens: 50 } },
            // Second response (e.g., another tool call)
            { usage: { inputTokens: 200, outputTokens: 100 } },
            // Final response - this should be used
            { usage: { inputTokens: 500, outputTokens: 250 } },
          ],
          streamEvents: [
            {
              type: "raw_model_stream_event",
              data: { type: "output_text_delta", delta: "Final response" },
            },
          ],
        }),
      );

      const agent = AIPex.create({
        instructions: "Test",
        model: mockModel,
      });

      const events: AgentEvent[] = [];
      for await (const event of agent.chat("Input")) {
        events.push(event);
      }

      const metricsEvent = events.find((e) => e.type === "metrics_update");
      expect(metricsEvent).toBeDefined();
      if (metricsEvent && metricsEvent.type === "metrics_update") {
        // Should use the LAST response's usage, not the sum
        expect(metricsEvent.metrics.promptTokens).toBe(500);
        expect(metricsEvent.metrics.completionTokens).toBe(250);
        expect(metricsEvent.metrics.tokensUsed).toBe(750);
      }

      const completeEvent = events.find((e) => e.type === "execution_complete");
      expect(completeEvent).toBeDefined();
      if (completeEvent && completeEvent.type === "execution_complete") {
        expect(completeEvent.metrics.tokensUsed).toBe(750);
      }
    });

    it("should handle rawResponses with some entries missing usage", async () => {
      vi.mocked(run).mockResolvedValue(
        createMockRunResult({
          finalOutput: "Response",
          rawResponses: [
            { usage: { inputTokens: 100, outputTokens: 50 } },
            {}, // No usage
            { usage: undefined },
            { usage: { inputTokens: 300, outputTokens: 150 } }, // Last with usage
          ],
          streamEvents: [
            {
              type: "raw_model_stream_event",
              data: { type: "output_text_delta", delta: "Response" },
            },
          ],
        }),
      );

      const agent = AIPex.create({
        instructions: "Test",
        model: mockModel,
      });

      const events: AgentEvent[] = [];
      for await (const event of agent.chat("Input")) {
        events.push(event);
      }

      const metricsEvent = events.find((e) => e.type === "metrics_update");
      expect(metricsEvent).toBeDefined();
      if (metricsEvent && metricsEvent.type === "metrics_update") {
        // Should find the last response WITH usage data
        expect(metricsEvent.metrics.promptTokens).toBe(300);
        expect(metricsEvent.metrics.completionTokens).toBe(150);
        expect(metricsEvent.metrics.tokensUsed).toBe(450);
      }
    });

    it("should accumulate session metrics across multiple conversations", async () => {
      vi.mocked(run).mockResolvedValue(
        createMockRunResult({
          finalOutput: "Response 1",
          usage: { promptTokens: 10, completionTokens: 20 },
          streamEvents: [
            {
              type: "raw_model_stream_event",
              data: { type: "output_text_delta", delta: "Response 1" },
            },
          ],
        }),
      );

      const agent = AIPex.create({
        instructions: "Test",
        model: mockModel,
      });

      let sessionId: string | undefined;
      for await (const event of agent.chat("First message")) {
        if (event.type === "session_created") {
          sessionId = event.sessionId;
        }
      }

      vi.mocked(run).mockResolvedValue(
        createMockRunResult({
          finalOutput: "Response 2",
          usage: { promptTokens: 15, completionTokens: 25 },
          streamEvents: [
            {
              type: "raw_model_stream_event",
              data: { type: "output_text_delta", delta: "Response 2" },
            },
          ],
        }),
      );

      for await (const _ of agent.chat("Second", { sessionId: sessionId! })) {
        // consume
      }

      vi.mocked(run).mockResolvedValue(
        createMockRunResult({
          finalOutput: "Response 3",
          usage: { promptTokens: 20, completionTokens: 30 },
          streamEvents: [
            {
              type: "raw_model_stream_event",
              data: { type: "output_text_delta", delta: "Response 3" },
            },
          ],
        }),
      );

      for await (const _ of agent.chat("Third", { sessionId: sessionId! })) {
        // consume
      }

      const manager = agent.getConversationManager()!;
      const session = await manager.getSession(sessionId!);
      const sessionMetrics = session?.getSessionMetrics();

      expect(sessionMetrics?.totalTokensUsed).toBe(120);
      expect(sessionMetrics?.totalPromptTokens).toBe(45);
      expect(sessionMetrics?.totalCompletionTokens).toBe(75);
      expect(sessionMetrics?.executionCount).toBe(3);
    });

    it("should persist accumulated metrics after reload", async () => {
      vi.mocked(run).mockResolvedValue(
        createMockRunResult({
          finalOutput: "Response 1",
          usage: { promptTokens: 50, completionTokens: 100 },
          streamEvents: [
            {
              type: "raw_model_stream_event",
              data: { type: "output_text_delta", delta: "Response 1" },
            },
          ],
        }),
      );

      const agent = AIPex.create({
        instructions: "Test",
        model: mockModel,
      });

      let sessionId: string | undefined;
      for await (const event of agent.chat("Message")) {
        if (event.type === "session_created") {
          sessionId = event.sessionId;
        }
      }

      vi.mocked(run).mockResolvedValue(
        createMockRunResult({
          finalOutput: "Response 2",
          usage: { promptTokens: 60, completionTokens: 120 },
          streamEvents: [
            {
              type: "raw_model_stream_event",
              data: { type: "output_text_delta", delta: "Response 2" },
            },
          ],
        }),
      );

      for await (const _ of agent.chat("Continue", { sessionId: sessionId! })) {
        // consume
      }

      const manager = agent.getConversationManager()!;
      manager.clearCache();

      const reloadedSession = await manager.getSession(sessionId!);
      const metrics = reloadedSession?.getSessionMetrics();

      expect(metrics?.totalTokensUsed).toBe(330);
      expect(metrics?.totalPromptTokens).toBe(110);
      expect(metrics?.totalCompletionTokens).toBe(220);
      expect(metrics?.executionCount).toBe(2);
    });

    it("should accumulate metrics even on error", async () => {
      vi.mocked(run).mockResolvedValue(
        createMockRunResult({
          finalOutput: "Success",
          usage: { promptTokens: 30, completionTokens: 40 },
          streamEvents: [
            {
              type: "raw_model_stream_event",
              data: { type: "output_text_delta", delta: "Success" },
            },
          ],
        }),
      );

      const agent = AIPex.create({
        instructions: "Test",
        model: mockModel,
      });

      let sessionId: string | undefined;
      for await (const event of agent.chat("First")) {
        if (event.type === "session_created") {
          sessionId = event.sessionId;
        }
      }

      vi.mocked(run).mockRejectedValue(new Error("LLM failed"));

      for await (const _ of agent.chat("Failing", { sessionId: sessionId! })) {
        // consume
      }

      const manager = agent.getConversationManager()!;
      const session = await manager.getSession(sessionId!);
      const metrics = session?.getSessionMetrics();

      expect(metrics?.executionCount).toBe(2);
      expect(metrics?.totalTokensUsed).toBe(70);
    });
  });

  describe("tools and errors", () => {
    it("should emit tool_call_args_streaming_complete before tool_call_start", async () => {
      vi.mocked(run).mockResolvedValue(
        createMockRunResult({
          finalOutput: "",
          streamEvents: [
            {
              type: "run_item_stream_event",
              name: "tool_called",
              item: { rawItem: { name: "calculator", arguments: '{"a":1}' } },
            },
          ],
        }),
      );

      const agent = AIPex.create({
        instructions: "Tools",
        model: mockModel,
      });

      const events: AgentEvent[] = [];
      for await (const event of agent.chat("use tool")) {
        events.push(event);
      }

      const argsCompleteIndex = events.findIndex(
        (event) => event.type === "tool_call_args_streaming_complete",
      );
      const toolStartIndex = events.findIndex(
        (event) => event.type === "tool_call_start",
      );

      expect(argsCompleteIndex).toBeGreaterThanOrEqual(0);
      expect(toolStartIndex).toBeGreaterThanOrEqual(0);
      expect(argsCompleteIndex).toBeLessThan(toolStartIndex);

      const argsComplete = events[argsCompleteIndex];
      const toolStart = events[toolStartIndex];

      expect(argsComplete?.type).toBe("tool_call_args_streaming_complete");
      if (argsComplete?.type === "tool_call_args_streaming_complete") {
        expect(argsComplete.toolName).toBe("calculator");
        expect(argsComplete.params).toEqual({ a: 1 });
      }

      expect(toolStart?.type).toBe("tool_call_start");
      if (toolStart?.type === "tool_call_start") {
        expect(toolStart.toolName).toBe("calculator");
        expect(toolStart.params).toEqual({ a: 1 });
      }
    });

    it("should emit tool_call_args_streaming_start when tool args are streamed by the model", async () => {
      vi.mocked(run).mockResolvedValue(
        createMockRunResult({
          finalOutput: "",
          streamEvents: [
            {
              type: "raw_model_stream_event",
              data: {
                type: "model",
                event: {
                  choices: [
                    {
                      delta: {
                        tool_calls: [
                          {
                            index: 0,
                            id: "call_1",
                            function: {
                              name: "calculator",
                              arguments: '{"a":',
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            },
            {
              type: "run_item_stream_event",
              name: "tool_called",
              item: { rawItem: { name: "calculator", arguments: '{"a":1}' } },
            },
          ],
        }),
      );

      const agent = AIPex.create({
        instructions: "Tools",
        model: mockModel,
      });

      const events: AgentEvent[] = [];
      for await (const event of agent.chat("use tool")) {
        events.push(event);
      }

      const argsStart = events.find(
        (event) => event.type === "tool_call_args_streaming_start",
      );
      expect(argsStart).toBeDefined();
      if (argsStart?.type === "tool_call_args_streaming_start") {
        expect(argsStart.toolName).toBe("calculator");
      }
    });

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

      const agent = AIPex.create({
        instructions: "Tools",
        model: mockModel,
      });

      const events: AgentEvent[] = [];
      for await (const event of agent.chat("use tool")) {
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

      const agent = AIPex.create({
        instructions: "Error",
        model: mockModel,
      });

      const events: AgentEvent[] = [];
      const runPromise = (async () => {
        for await (const event of agent.chat("boom")) {
          events.push(event);
        }
      })();

      await expect(runPromise).resolves.toBeUndefined();
      expect(events.some((event) => event.type === "error")).toBe(true);
    });

    it("should extract real error message from tool failure", async () => {
      vi.mocked(run).mockResolvedValue(
        createMockRunResult({
          finalOutput: "",
          streamEvents: [
            {
              type: "run_item_stream_event",
              name: "tool_called",
              item: { rawItem: { name: "screenshot", arguments: "{}" } },
            },
            {
              type: "run_item_stream_event",
              name: "tool_output",
              item: {
                rawItem: {
                  name: "screenshot",
                  status: "failed",
                  error: { message: "No active tab found" },
                },
                output: undefined,
              },
            },
          ],
        }),
      );

      const agent = AIPex.create({
        instructions: "Tools",
        model: mockModel,
      });

      const events: AgentEvent[] = [];
      for await (const event of agent.chat("take screenshot")) {
        events.push(event);
      }

      const errorEvent = events.find(
        (event) => event.type === "tool_call_error",
      );
      expect(errorEvent).toBeDefined();
      if (errorEvent?.type === "tool_call_error") {
        expect(errorEvent.error.message).toBe("No active tab found");
      }
    });

    it("should extract error message from JSON output on failure", async () => {
      vi.mocked(run).mockResolvedValue(
        createMockRunResult({
          finalOutput: "",
          streamEvents: [
            {
              type: "run_item_stream_event",
              name: "tool_called",
              item: { rawItem: { name: "organize_tabs", arguments: "{}" } },
            },
            {
              type: "run_item_stream_event",
              name: "tool_output",
              item: {
                rawItem: { name: "organize_tabs", status: "failed" },
                output: JSON.stringify({
                  success: false,
                  error: "Cannot organize tabs in incognito window",
                }),
              },
            },
          ],
        }),
      );

      const agent = AIPex.create({
        instructions: "Tools",
        model: mockModel,
      });

      const events: AgentEvent[] = [];
      for await (const event of agent.chat("organize tabs")) {
        events.push(event);
      }

      const errorEvent = events.find(
        (event) => event.type === "tool_call_error",
      );
      expect(errorEvent).toBeDefined();
      if (errorEvent?.type === "tool_call_error") {
        expect(errorEvent.error.message).toBe(
          "Cannot organize tabs in incognito window",
        );
      }
    });

    it("should sanitize sensitive data from error messages", async () => {
      vi.mocked(run).mockResolvedValue(
        createMockRunResult({
          finalOutput: "",
          streamEvents: [
            {
              type: "run_item_stream_event",
              name: "tool_called",
              item: { rawItem: { name: "api_call", arguments: "{}" } },
            },
            {
              type: "run_item_stream_event",
              name: "tool_output",
              item: {
                rawItem: { name: "api_call", status: "failed" },
                output:
                  'Error: Request failed with Authorization: Bearer sk-1234567890abcdef',
              },
            },
          ],
        }),
      );

      const agent = AIPex.create({
        instructions: "Tools",
        model: mockModel,
      });

      const events: AgentEvent[] = [];
      for await (const event of agent.chat("make api call")) {
        events.push(event);
      }

      const errorEvent = events.find(
        (event) => event.type === "tool_call_error",
      );
      expect(errorEvent).toBeDefined();
      if (errorEvent?.type === "tool_call_error") {
        expect(errorEvent.error.message).toContain("[REDACTED]");
        expect(errorEvent.error.message).not.toContain("sk-1234567890abcdef");
      }
    });

    it("should truncate long error messages", async () => {
      const longMessage = "x".repeat(1000);
      vi.mocked(run).mockResolvedValue(
        createMockRunResult({
          finalOutput: "",
          streamEvents: [
            {
              type: "run_item_stream_event",
              name: "tool_called",
              item: { rawItem: { name: "failing_tool", arguments: "{}" } },
            },
            {
              type: "run_item_stream_event",
              name: "tool_output",
              item: {
                rawItem: { name: "failing_tool", status: "failed" },
                output: longMessage,
              },
            },
          ],
        }),
      );

      const agent = AIPex.create({
        instructions: "Tools",
        model: mockModel,
      });

      const events: AgentEvent[] = [];
      for await (const event of agent.chat("run failing tool")) {
        events.push(event);
      }

      const errorEvent = events.find(
        (event) => event.type === "tool_call_error",
      );
      expect(errorEvent).toBeDefined();
      if (errorEvent?.type === "tool_call_error") {
        expect(errorEvent.error.message.length).toBeLessThanOrEqual(500);
        expect(errorEvent.error.message.endsWith("...")).toBe(true);
      }
    });
  });
});
