import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LLMProvider } from "../llm/provider.js";
import type { ToolRegistry } from "../tools/registry.js";
import { AgentExecutor } from "./executor.js";

describe("AgentExecutor", () => {
  let mockLLMProvider: LLMProvider;
  let mockToolRegistry: ToolRegistry;
  let executor: AgentExecutor;

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
      register: vi.fn(),
      has: vi.fn(),
    } as any;

    executor = new AgentExecutor(
      "session-123",
      mockLLMProvider,
      mockToolRegistry,
      {
        maxTurns: 5,
        systemPrompt: "You are a helpful assistant",
        temperature: 0.7,
        maxTokens: 1000,
      },
    );
  });

  describe("constructor", () => {
    it("should initialize with default maxTurns if not provided", () => {
      const defaultExecutor = new AgentExecutor(
        "session-123",
        mockLLMProvider,
        mockToolRegistry,
        {},
      );
      expect(defaultExecutor).toBeDefined();
    });

    it("should use provided maxTurns", () => {
      expect(executor).toBeDefined();
    });
  });

  describe("run - basic execution", () => {
    it("should execute single turn without tools", async () => {
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
      for await (const event of executor.run("Say hello")) {
        events.push(event);
      }

      expect(events).toContainEqual({ type: "execution_start" });
      expect(events).toContainEqual(
        expect.objectContaining({
          type: "turn_start",
          number: 1,
        }),
      );
      expect(events).toContainEqual({ type: "content_delta", delta: "Hello" });
      expect(events).toContainEqual({ type: "content_delta", delta: " world" });
      expect(events).toContainEqual(
        expect.objectContaining({
          type: "execution_complete",
          reason: "finished",
          turns: 1,
        }),
      );
    });

    it("should add user input to history", async () => {
      async function* mockStream() {
        yield { type: "content" as const, delta: "Response" };
        yield {
          type: "done" as const,
          finishReason: "STOP",
          usage: { totalTokens: 10, promptTokens: 5, completionTokens: 5 },
        };
      }

      vi.mocked(mockLLMProvider.generateStream).mockReturnValue(mockStream());

      for await (const _ of executor.run("Test input")) {
        // consume events
      }

      const history = executor.getHistory();
      expect(history[0]).toEqual({
        role: "user",
        content: "Test input",
      });
    });

    it("should build LLM request with system prompt", async () => {
      async function* mockStream() {
        yield { type: "content" as const, delta: "Response" };
        yield {
          type: "done" as const,
          finishReason: "STOP",
          usage: { totalTokens: 10, promptTokens: 5, completionTokens: 5 },
        };
      }

      vi.mocked(mockLLMProvider.generateStream).mockReturnValue(mockStream());

      for await (const _ of executor.run("Test")) {
        // consume events
      }

      expect(mockLLMProvider.generateStream).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: "system",
              content: "You are a helpful assistant",
            }),
          ]),
          temperature: 0.7,
          maxTokens: 1000,
        }),
      );
    });

    it("should handle executor without system prompt", async () => {
      const noPromptExecutor = new AgentExecutor(
        "session-123",
        mockLLMProvider,
        mockToolRegistry,
        { maxTurns: 3 },
      );

      async function* mockStream() {
        yield { type: "content" as const, delta: "Response" };
        yield {
          type: "done" as const,
          finishReason: "STOP",
          usage: { totalTokens: 10, promptTokens: 5, completionTokens: 5 },
        };
      }

      vi.mocked(mockLLMProvider.generateStream).mockReturnValue(mockStream());

      for await (const _ of noPromptExecutor.run("Test")) {
        // consume events
      }

      const calls = vi.mocked(mockLLMProvider.generateStream).mock.calls;
      const messages = calls[0][0].messages;
      const hasSystemPrompt = messages.some((m) => m.role === "system");
      expect(hasSystemPrompt).toBe(false);
    });
  });

  describe("run - tool execution", () => {
    it("should execute tools and continue", async () => {
      let callCount = 0;

      async function* firstStream() {
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

      async function* secondStream() {
        yield { type: "content" as const, delta: "Tool result processed" };
        yield {
          type: "done" as const,
          finishReason: "STOP",
          usage: { totalTokens: 10, promptTokens: 5, completionTokens: 5 },
        };
      }

      vi.mocked(mockLLMProvider.generateStream).mockImplementation(() => {
        callCount++;
        return callCount === 1 ? firstStream() : secondStream();
      });

      vi.mocked(mockToolRegistry.execute).mockResolvedValue({
        success: true,
        data: { result: "tool output" },
      });

      const events = [];
      for await (const event of executor.run("Use a tool")) {
        events.push(event);
      }

      expect(events.filter((e) => e.type === "turn_start")).toHaveLength(2);
      expect(events).toContainEqual(
        expect.objectContaining({
          type: "tool_call_pending",
          toolName: "test_tool",
        }),
      );
      expect(mockToolRegistry.execute).toHaveBeenCalledWith(
        "test_tool",
        { arg: "value" },
        expect.any(Object),
      );
    });

    it("should add function calls to conversation history", async () => {
      async function* firstStream() {
        yield { type: "content" as const, delta: "Let me check" };
        yield {
          type: "function_call" as const,
          call: {
            id: "call-1",
            name: "get_data",
            params: {},
          },
        };
        yield {
          type: "done" as const,
          finishReason: "STOP",
          usage: { totalTokens: 10, promptTokens: 5, completionTokens: 5 },
        };
      }

      async function* secondStream() {
        yield { type: "content" as const, delta: "Done" };
        yield {
          type: "done" as const,
          finishReason: "STOP",
          usage: { totalTokens: 10, promptTokens: 5, completionTokens: 5 },
        };
      }

      let callCount = 0;
      vi.mocked(mockLLMProvider.generateStream).mockImplementation(() => {
        callCount++;
        return callCount === 1 ? firstStream() : secondStream();
      });

      vi.mocked(mockToolRegistry.execute).mockResolvedValue({
        success: true,
        data: { value: 42 },
      });

      for await (const _ of executor.run("Test")) {
        // consume events
      }

      const history = executor.getHistory();

      const assistantMessage = history.find(
        (m) => m.role === "assistant" && m.content === "Let me check",
      );
      expect(assistantMessage).toBeDefined();

      const functionCallMessage = history.find(
        (m) => m.role === "assistant" && m.functionCall,
      );
      expect(functionCallMessage).toBeDefined();
      expect(functionCallMessage?.functionCall?.name).toBe("get_data");

      const functionResponseMessage = history.find(
        (m) => m.role === "function",
      );
      expect(functionResponseMessage).toBeDefined();
    });

    it("should handle tool execution and store function results", async () => {
      async function* firstStream() {
        yield {
          type: "function_call" as const,
          call: {
            id: "tool-call-1",
            name: "test_tool",
            params: {},
          },
        };
        yield {
          type: "done" as const,
          finishReason: "STOP",
          usage: { totalTokens: 10, promptTokens: 5, completionTokens: 5 },
        };
      }

      async function* secondStream() {
        yield { type: "content" as const, delta: "Done" };
        yield {
          type: "done" as const,
          finishReason: "STOP",
          usage: { totalTokens: 10, promptTokens: 5, completionTokens: 5 },
        };
      }

      let callCount = 0;
      vi.mocked(mockLLMProvider.generateStream).mockImplementation(() => {
        callCount++;
        return callCount === 1 ? firstStream() : secondStream();
      });

      vi.mocked(mockToolRegistry.execute).mockResolvedValue({
        success: true,
        data: { result: "success" },
      });

      for await (const _ of executor.run("Test")) {
        // consume events
      }

      const history = executor.getHistory();
      const functionResponse = history.find((m) => m.role === "function");
      expect(functionResponse?.functionResponse?.name).toBe("test_tool");
      expect(functionResponse?.functionResponse?.result).toEqual({
        result: "success",
      });
    });

    it("should handle undefined result data", async () => {
      async function* firstStream() {
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

      async function* secondStream() {
        yield { type: "content" as const, delta: "Done" };
        yield {
          type: "done" as const,
          finishReason: "STOP",
          usage: { totalTokens: 10, promptTokens: 5, completionTokens: 5 },
        };
      }

      let callCount = 0;
      vi.mocked(mockLLMProvider.generateStream).mockImplementation(() => {
        callCount++;
        return callCount === 1 ? firstStream() : secondStream();
      });

      vi.mocked(mockToolRegistry.execute).mockResolvedValue({
        success: true,
      } as any);

      for await (const _ of executor.run("Test")) {
        // consume events
      }

      const history = executor.getHistory();
      const functionResponse = history.find((m) => m.role === "function");
      expect(functionResponse?.functionResponse?.result).toEqual({});
    });
  });

  describe("run - loop detection", () => {
    it("should detect and stop on loops", async () => {
      let callCount = 0;

      vi.mocked(mockLLMProvider.generateStream).mockImplementation(() => {
        callCount++;
        async function* mockStreamWithLoop() {
          yield {
            type: "function_call" as const,
            call: {
              id: `call-${callCount}`,
              name: "same_tool",
              params: { value: 1 },
            },
          };
          yield {
            type: "done" as const,
            finishReason: "STOP",
            usage: { totalTokens: 10, promptTokens: 5, completionTokens: 5 },
          };
        }
        return mockStreamWithLoop();
      });

      vi.mocked(mockToolRegistry.execute).mockResolvedValue({
        success: true,
        data: {},
      });

      const events = [];
      for await (const event of executor.run("Test")) {
        events.push(event);
      }

      const loopDetected = events.some(
        (e) =>
          e.type === "execution_complete" &&
          (e as any).reason === "loop_detected",
      );

      expect(loopDetected).toBe(true);
    });
  });

  describe("run - max turns", () => {
    it("should stop at max turns", async () => {
      let turnCount = 0;

      async function* mockStreamWithTools() {
        yield {
          type: "function_call" as const,
          call: {
            id: `call-${turnCount}`,
            name: `tool-${turnCount}`,
            params: { turn: turnCount },
          },
        };
        yield {
          type: "done" as const,
          finishReason: "STOP",
          usage: { totalTokens: 10, promptTokens: 5, completionTokens: 5 },
        };
        turnCount++;
      }

      vi.mocked(mockLLMProvider.generateStream).mockImplementation(() =>
        mockStreamWithTools(),
      );

      vi.mocked(mockToolRegistry.execute).mockResolvedValue({
        success: true,
        data: {},
      });

      const events = [];
      for await (const event of executor.run("Keep going")) {
        events.push(event);
      }

      const completionEvent = events.find(
        (e) => e.type === "execution_complete",
      ) as any;

      expect(completionEvent).toBeDefined();
      expect(completionEvent.reason).toBe("max_turns");
      expect(completionEvent.turns).toBe(5);
    });
  });

  describe("interrupt", () => {
    it("should interrupt active turn", async () => {
      async function* mockSlowStream() {
        yield { type: "content" as const, delta: "Starting..." };
        await new Promise((resolve) => setTimeout(resolve, 1000));
        yield { type: "content" as const, delta: "Should not see this" };
        yield {
          type: "done" as const,
          finishReason: "STOP",
          usage: { totalTokens: 10, promptTokens: 5, completionTokens: 5 },
        };
      }

      vi.mocked(mockLLMProvider.generateStream).mockReturnValue(
        mockSlowStream(),
      );

      const runPromise = (async () => {
        const events = [];
        try {
          for await (const event of executor.run("Test")) {
            events.push(event);
          }
        } catch (error) {
          events.push({ type: "error", error });
        }
        return events;
      })();

      await new Promise((resolve) => setTimeout(resolve, 50));
      await executor.interrupt();

      const events = await runPromise;
      expect(events.some((e) => e.type === "error")).toBe(true);
    });

    it("should not throw if no active turn", async () => {
      await expect(executor.interrupt()).resolves.not.toThrow();
    });
  });

  describe("getHistory", () => {
    it("should return copy of conversation history", async () => {
      async function* mockStream() {
        yield { type: "content" as const, delta: "Response" };
        yield {
          type: "done" as const,
          finishReason: "STOP",
          usage: { totalTokens: 10, promptTokens: 5, completionTokens: 5 },
        };
      }

      vi.mocked(mockLLMProvider.generateStream).mockReturnValue(mockStream());

      for await (const _ of executor.run("Test")) {
        // consume events
      }

      const history1 = executor.getHistory();
      const history2 = executor.getHistory();

      expect(history1).toEqual(history2);
      expect(history1).not.toBe(history2);

      history1.push({ role: "user", content: "Modified" });
      expect(history1.length).not.toBe(history2.length);
    });

    it("should include all messages in order", async () => {
      async function* mockStream() {
        yield { type: "content" as const, delta: "Response" };
        yield {
          type: "done" as const,
          finishReason: "STOP",
          usage: { totalTokens: 10, promptTokens: 5, completionTokens: 5 },
        };
      }

      vi.mocked(mockLLMProvider.generateStream).mockReturnValue(mockStream());

      for await (const _ of executor.run("First message")) {
        // consume events
      }

      const history = executor.getHistory();

      expect(history).toHaveLength(2);
      expect(history[0]).toEqual({
        role: "user",
        content: "First message",
      });
      expect(history[1]).toMatchObject({
        role: "assistant",
        content: "Response",
      });
    });
  });

  describe("complex scenarios", () => {
    it("should handle empty assistant content with function calls", async () => {
      let callCount = 0;

      async function* firstStream() {
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

      async function* secondStream() {
        yield { type: "content" as const, delta: "Done" };
        yield {
          type: "done" as const,
          finishReason: "STOP",
          usage: { totalTokens: 10, promptTokens: 5, completionTokens: 5 },
        };
      }

      vi.mocked(mockLLMProvider.generateStream).mockImplementation(() => {
        callCount++;
        return callCount === 1 ? firstStream() : secondStream();
      });

      vi.mocked(mockToolRegistry.execute).mockResolvedValue({
        success: true,
        data: {},
      });

      for await (const _ of executor.run("Test")) {
        // consume events
      }

      const history = executor.getHistory();

      const assistantWithEmptyContent = history.find(
        (m) => m.role === "assistant" && m.content === "",
      );
      expect(assistantWithEmptyContent).toBeDefined();
    });

    it("should forward all turn events", async () => {
      async function* mockStream() {
        yield { type: "thinking" as const, thought: "Thinking..." };
        yield { type: "content" as const, delta: "Response" };
        yield {
          type: "done" as const,
          finishReason: "STOP",
          usage: { totalTokens: 10, promptTokens: 5, completionTokens: 5 },
        };
      }

      vi.mocked(mockLLMProvider.generateStream).mockReturnValue(mockStream());

      const events = [];
      for await (const event of executor.run("Test")) {
        events.push(event);
      }

      expect(events).toContainEqual({
        type: "thinking_delta",
        delta: "Thinking...",
      });
      expect(events).toContainEqual({
        type: "content_delta",
        delta: "Response",
      });
    });
  });
});
