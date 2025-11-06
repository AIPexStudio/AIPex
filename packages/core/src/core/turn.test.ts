import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LLMProvider } from "../llm/provider.js";
import type { ToolRegistry } from "../tools/registry.js";
import { TurnCancelledError } from "../utils/errors.js";
import { Turn } from "./turn.js";
import { TurnState } from "./types.js";

describe("Turn", () => {
  let mockLLMProvider: LLMProvider;
  let mockToolRegistry: ToolRegistry;
  let turn: Turn;

  beforeEach(() => {
    mockLLMProvider = {
      name: "test-provider",
      capabilities: {
        streaming: true,
        functionCalling: true,
      },
      generateContent: vi.fn(),
      generateStream: vi.fn(),
      countTokens: vi.fn(),
    } as any;

    mockToolRegistry = {
      execute: vi.fn(),
      getAllDeclarations: vi.fn().mockReturnValue([]),
    } as any;

    turn = new Turn(
      mockLLMProvider,
      mockToolRegistry,
      {
        messages: [{ role: "user", content: "Hello" }],
      },
      "session-123",
    );
  });

  describe("constructor", () => {
    it("should initialize with INIT state", () => {
      expect(turn.getState()).toBe(TurnState.INIT);
    });

    it("should generate unique ID", () => {
      const turn2 = new Turn(
        mockLLMProvider,
        mockToolRegistry,
        { messages: [] },
        "session-123",
      );
      expect(turn.id).toBeTruthy();
      expect(turn2.id).toBeTruthy();
      expect(turn.id).not.toBe(turn2.id);
    });
  });

  describe("execute - content streaming", () => {
    it("should yield content deltas", async () => {
      async function* mockStream() {
        yield { type: "content" as const, delta: "Hello" };
        yield { type: "content" as const, delta: " world" };
        yield {
          type: "done" as const,
          finishReason: "STOP",
          usage: { totalTokens: 10, promptTokens: 5, completionTokens: 5 },
        };
      }

      vi.mocked(mockLLMProvider.generateStream).mockReturnValue(mockStream());

      const events = [];
      for await (const event of turn.execute()) {
        events.push(event);
      }

      expect(events).toContainEqual({ type: "llm_stream_start" });
      expect(events).toContainEqual({ type: "content_delta", delta: "Hello" });
      expect(events).toContainEqual({ type: "content_delta", delta: " world" });
      expect(events).toContainEqual(
        expect.objectContaining({ type: "llm_stream_end" }),
      );
      expect(events).toContainEqual(
        expect.objectContaining({
          type: "turn_complete",
          shouldContinue: false,
        }),
      );
    });

    it("should transition to LLM_CALLING state", async () => {
      async function* mockStream() {
        yield { type: "content" as const, delta: "test" };
        yield {
          type: "done" as const,
          finishReason: "STOP",
          usage: { totalTokens: 10, promptTokens: 5, completionTokens: 5 },
        };
      }

      vi.mocked(mockLLMProvider.generateStream).mockReturnValue(mockStream());

      const generator = turn.execute();
      await generator.next();

      expect(turn.getState()).toBe(TurnState.LLM_CALLING);

      for await (const _ of generator) {
        // consume rest
      }
    });

    it("should handle thinking deltas", async () => {
      async function* mockStream() {
        yield { type: "thinking" as const, thought: "Let me think..." };
        yield {
          type: "thinking" as const,
          thought: "I should respond with...",
        };
        yield { type: "content" as const, delta: "Response" };
        yield {
          type: "done" as const,
          finishReason: "STOP",
          usage: { totalTokens: 10, promptTokens: 5, completionTokens: 5 },
        };
      }

      vi.mocked(mockLLMProvider.generateStream).mockReturnValue(mockStream());

      const events = [];
      for await (const event of turn.execute()) {
        events.push(event);
      }

      expect(events).toContainEqual({
        type: "thinking_delta",
        delta: "Let me think...",
      });
      expect(events).toContainEqual({
        type: "thinking_delta",
        delta: "I should respond with...",
      });
    });
  });

  describe("execute - function calls", () => {
    it("should handle function calls", async () => {
      async function* mockStream() {
        yield {
          type: "function_call" as const,
          call: {
            id: "call-1",
            name: "test_tool",
            params: { arg: "value" },
          },
        };
        yield {
          type: "done" as const,
          finishReason: "STOP",
          usage: { totalTokens: 10, promptTokens: 5, completionTokens: 5 },
        };
      }

      vi.mocked(mockLLMProvider.generateStream).mockReturnValue(mockStream());
      vi.mocked(mockToolRegistry.execute).mockResolvedValue({
        success: true,
        data: { result: "executed" },
      });

      const events = [];
      for await (const event of turn.execute()) {
        events.push(event);
      }

      expect(events).toContainEqual({
        type: "tool_call_pending",
        callId: "call-1",
        toolName: "test_tool",
        params: { arg: "value" },
      });
      expect(events).toContainEqual({
        type: "tool_call_start",
        callId: "call-1",
      });
      expect(events).toContainEqual(
        expect.objectContaining({
          type: "tool_call_complete",
          callId: "call-1",
        }),
      );
      expect(events).toContainEqual(
        expect.objectContaining({
          type: "turn_complete",
          shouldContinue: true,
        }),
      );
    });

    it("should execute multiple function calls sequentially", async () => {
      async function* mockStream() {
        yield {
          type: "function_call" as const,
          call: {
            id: "call-1",
            name: "tool1",
            params: {},
          },
        };
        yield {
          type: "function_call" as const,
          call: {
            id: "call-2",
            name: "tool2",
            params: {},
          },
        };
        yield {
          type: "done" as const,
          finishReason: "STOP",
          usage: { totalTokens: 10, promptTokens: 5, completionTokens: 5 },
        };
      }

      vi.mocked(mockLLMProvider.generateStream).mockReturnValue(mockStream());
      vi.mocked(mockToolRegistry.execute).mockResolvedValue({
        success: true,
        data: {},
      });

      const events = [];
      for await (const event of turn.execute()) {
        events.push(event);
      }

      expect(mockToolRegistry.execute).toHaveBeenCalledTimes(2);

      const toolStartEvents = events.filter(
        (e) => e.type === "tool_call_start",
      );
      expect(toolStartEvents).toHaveLength(2);
    });

    it("should transition to TOOL_EXECUTING state when calling tools", async () => {
      async function* mockStream() {
        yield {
          type: "function_call" as const,
          call: {
            id: "call-1",
            name: "tool1",
            params: {},
          },
        };
        yield {
          type: "done" as const,
          finishReason: "STOP",
          usage: { totalTokens: 10, promptTokens: 5, completionTokens: 5 },
        };
      }

      vi.mocked(mockLLMProvider.generateStream).mockReturnValue(mockStream());
      vi.mocked(mockToolRegistry.execute).mockImplementation(async () => {
        expect(turn.getState()).toBe(TurnState.TOOL_EXECUTING);
        return { success: true, data: {} };
      });

      for await (const _ of turn.execute()) {
        // consume all events
      }
    });

    it("should handle tool execution errors", async () => {
      async function* mockStream() {
        yield {
          type: "function_call" as const,
          call: {
            id: "call-1",
            name: "failing_tool",
            params: {},
          },
        };
        yield {
          type: "done" as const,
          finishReason: "STOP",
          usage: { totalTokens: 10, promptTokens: 5, completionTokens: 5 },
        };
      }

      vi.mocked(mockLLMProvider.generateStream).mockReturnValue(mockStream());
      vi.mocked(mockToolRegistry.execute).mockRejectedValue(
        new Error("Tool execution failed"),
      );

      const events = [];
      for await (const event of turn.execute()) {
        events.push(event);
      }

      const errorEvent = events.find((e) => e.type === "tool_call_error");
      expect(errorEvent).toBeDefined();
      expect(errorEvent).toMatchObject({
        type: "tool_call_error",
        callId: "call-1",
      });
      expect((errorEvent as any).error.message).toBe("Tool execution failed");
    });

    it("should handle non-Error tool failures", async () => {
      async function* mockStream() {
        yield {
          type: "function_call" as const,
          call: {
            id: "call-1",
            name: "tool",
            params: {},
          },
        };
        yield {
          type: "done" as const,
          finishReason: "STOP",
          usage: { totalTokens: 10, promptTokens: 5, completionTokens: 5 },
        };
      }

      vi.mocked(mockLLMProvider.generateStream).mockReturnValue(mockStream());
      vi.mocked(mockToolRegistry.execute).mockRejectedValue(
        "String error message",
      );

      const events = [];
      for await (const event of turn.execute()) {
        events.push(event);
      }

      const errorEvent = events.find((e) => e.type === "tool_call_error");
      expect(errorEvent).toBeDefined();
      expect((errorEvent as any).error).toBeInstanceOf(Error);
    });

    it("should pass context to tool execution", async () => {
      async function* mockStream() {
        yield {
          type: "function_call" as const,
          call: {
            id: "call-1",
            name: "tool",
            params: { test: "param" },
          },
        };
        yield {
          type: "done" as const,
          finishReason: "STOP",
          usage: { totalTokens: 10, promptTokens: 5, completionTokens: 5 },
        };
      }

      vi.mocked(mockLLMProvider.generateStream).mockReturnValue(mockStream());
      vi.mocked(mockToolRegistry.execute).mockResolvedValue({
        success: true,
        data: {},
      });

      for await (const _ of turn.execute()) {
        // consume all events
      }

      expect(mockToolRegistry.execute).toHaveBeenCalledWith(
        "tool",
        { test: "param" },
        expect.objectContaining({
          callId: "call-1",
          turnId: turn.id,
          sessionId: "session-123",
          signal: expect.any(AbortSignal),
        }),
      );
    });

    it("should measure tool execution duration", async () => {
      async function* mockStream() {
        yield {
          type: "function_call" as const,
          call: {
            id: "call-1",
            name: "slow_tool",
            params: {},
          },
        };
        yield {
          type: "done" as const,
          finishReason: "STOP",
          usage: { totalTokens: 10, promptTokens: 5, completionTokens: 5 },
        };
      }

      vi.mocked(mockLLMProvider.generateStream).mockReturnValue(mockStream());
      vi.mocked(mockToolRegistry.execute).mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { success: true, data: {} };
      });

      const events = [];
      for await (const event of turn.execute()) {
        events.push(event);
      }

      const completeEvent = events.find(
        (e) => e.type === "tool_call_complete",
      ) as any;
      expect(completeEvent).toBeDefined();
      expect(completeEvent.duration).toBeGreaterThanOrEqual(45);
    });
  });

  describe("cancel", () => {
    it("should cancel ongoing turn", async () => {
      async function* mockStream() {
        yield { type: "content" as const, delta: "Start" };
        await new Promise((resolve) => setTimeout(resolve, 100));
        yield { type: "content" as const, delta: "Should not see this" };
        yield {
          type: "done" as const,
          finishReason: "STOP",
          usage: { totalTokens: 10, promptTokens: 5, completionTokens: 5 },
        };
      }

      vi.mocked(mockLLMProvider.generateStream).mockReturnValue(mockStream());

      const executionPromise = (async () => {
        try {
          for await (const _ of turn.execute()) {
            // consume events
          }
        } catch (error) {
          return error;
        }
      })();

      await new Promise((resolve) => setTimeout(resolve, 10));
      await turn.cancel();

      const error = await executionPromise;
      expect(error).toBeInstanceOf(TurnCancelledError);
      expect(turn.getState()).toBe(TurnState.CANCELLED);
    });

    it("should not cancel if already completed", async () => {
      async function* mockStream() {
        yield { type: "content" as const, delta: "Done" };
        yield {
          type: "done" as const,
          finishReason: "STOP",
          usage: { totalTokens: 10, promptTokens: 5, completionTokens: 5 },
        };
      }

      vi.mocked(mockLLMProvider.generateStream).mockReturnValue(mockStream());

      for await (const _ of turn.execute()) {
        // consume events
      }

      expect(turn.getState()).toBe(TurnState.COMPLETED);

      await turn.cancel();

      expect(turn.getState()).toBe(TurnState.COMPLETED);
    });
  });

  describe("cleanup", () => {
    it("should call cleanup callbacks", async () => {
      const cleanup1 = vi.fn();
      const cleanup2 = vi.fn();

      turn.onCleanup(cleanup1);
      turn.onCleanup(cleanup2);

      async function* mockStream() {
        yield { type: "content" as const, delta: "Test" };
        yield {
          type: "done" as const,
          finishReason: "STOP",
          usage: { totalTokens: 10, promptTokens: 5, completionTokens: 5 },
        };
      }

      vi.mocked(mockLLMProvider.generateStream).mockReturnValue(mockStream());

      for await (const _ of turn.execute()) {
        // consume events
      }

      expect(cleanup1).toHaveBeenCalled();
      expect(cleanup2).toHaveBeenCalled();
    });

    it("should call cleanup callbacks even on failure", async () => {
      const cleanup = vi.fn();
      turn.onCleanup(cleanup);

      async function* mockStream() {
        yield { type: "content" as const, delta: "Test" };
        throw new Error("Stream error");
      }

      vi.mocked(mockLLMProvider.generateStream).mockReturnValue(mockStream());

      try {
        for await (const _ of turn.execute()) {
          // consume events
        }
      } catch (_error) {
        // Expected error
      }

      expect(cleanup).toHaveBeenCalled();
      expect(turn.getState()).toBe(TurnState.FAILED);
    });

    it("should support async cleanup callbacks", async () => {
      let cleanupCompleted = false;
      turn.onCleanup(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        cleanupCompleted = true;
      });

      async function* mockStream() {
        yield { type: "content" as const, delta: "Test" };
        yield {
          type: "done" as const,
          finishReason: "STOP",
          usage: { totalTokens: 10, promptTokens: 5, completionTokens: 5 },
        };
      }

      vi.mocked(mockLLMProvider.generateStream).mockReturnValue(mockStream());

      for await (const _ of turn.execute()) {
        // consume events
      }

      expect(cleanupCompleted).toBe(true);
    });
  });

  describe("getState", () => {
    it("should return current state", () => {
      expect(turn.getState()).toBe(TurnState.INIT);
    });

    it("should update state during execution", async () => {
      async function* mockStream() {
        yield { type: "content" as const, delta: "Test" };
        yield {
          type: "done" as const,
          finishReason: "STOP",
          usage: { totalTokens: 10, promptTokens: 5, completionTokens: 5 },
        };
      }

      vi.mocked(mockLLMProvider.generateStream).mockReturnValue(mockStream());

      const generator = turn.execute();

      await generator.next();
      expect(turn.getState()).toBe(TurnState.LLM_CALLING);

      for await (const _ of generator) {
        // consume rest
      }

      expect(turn.getState()).toBe(TurnState.COMPLETED);
    });
  });
});
