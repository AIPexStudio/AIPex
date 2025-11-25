import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatAdapter, createChatAdapter } from "../core/adapter";
import type { ChatStatus, ContextItem, UIMessage } from "../core/types";

// Mock generateId to return predictable IDs
vi.mock("@aipexstudio/aipex-core", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@aipexstudio/aipex-core")>();
  let idCounter = 0;
  return {
    ...actual,
    generateId: vi.fn(() => `test-id-${++idCounter}`),
  };
});

describe("ChatAdapter", () => {
  let adapter: ChatAdapter;
  let onMessagesUpdate: (messages: UIMessage[]) => void;
  let onStatusChange: (status: ChatStatus) => void;

  beforeEach(() => {
    vi.clearAllMocks();
    onMessagesUpdate = vi.fn();
    onStatusChange = vi.fn();
    adapter = createChatAdapter({
      onMessagesUpdate,
      onStatusChange,
    });
  });

  describe("createChatAdapter factory", () => {
    it("should create a new ChatAdapter instance", () => {
      const newAdapter = createChatAdapter();
      expect(newAdapter).toBeInstanceOf(ChatAdapter);
    });

    it("should create adapter without options", () => {
      const newAdapter = createChatAdapter();
      expect(newAdapter.getMessages()).toEqual([]);
      expect(newAdapter.getStatus()).toBe("idle");
    });
  });

  describe("initial state", () => {
    it("should start with empty messages", () => {
      expect(adapter.getMessages()).toEqual([]);
    });

    it("should start with idle status", () => {
      expect(adapter.getStatus()).toBe("idle");
    });

    it("should return a copy of messages array", () => {
      const messages1 = adapter.getMessages();
      const messages2 = adapter.getMessages();
      expect(messages1).not.toBe(messages2);
      expect(messages1).toEqual(messages2);
    });
  });

  describe("addUserMessage", () => {
    it("should add a user message with text", () => {
      const message = adapter.addUserMessage("Hello, AI!");

      expect(message.role).toBe("user");
      expect(message.parts).toHaveLength(1);
      expect(message.parts[0]).toEqual({
        type: "text",
        text: "Hello, AI!",
      });
      expect(onMessagesUpdate).toHaveBeenCalledWith([message]);
    });

    it("should add a user message with contexts", () => {
      const contexts = [
        {
          id: "ctx-1",
          type: "page" as const,
          label: "Current Page",
          value: "Page content here",
        },
      ];

      const message = adapter.addUserMessage(
        "Summarize this",
        undefined,
        contexts,
      );

      expect(message.parts).toHaveLength(2);
      expect(message.parts[0]).toMatchObject({
        type: "context",
        contextType: "page",
        label: "Current Page",
      });
      expect(message.parts[1]).toEqual({
        type: "text",
        text: "Summarize this",
      });
    });

    it("should trim whitespace from text", () => {
      const message = adapter.addUserMessage("  Hello  ");

      const textPart = message.parts.find((p) => p.type === "text");
      expect(textPart?.type === "text" && textPart.text).toBe("Hello");
    });

    it("should handle empty text with contexts", () => {
      const contexts = [
        {
          id: "ctx-1",
          type: "page" as const,
          label: "Page",
          value: "Content",
        },
      ];

      const message = adapter.addUserMessage("", undefined, contexts);

      expect(message.parts).toHaveLength(1);
      expect(message.parts[0].type).toBe("context");
    });

    it("should handle whitespace-only text", () => {
      const message = adapter.addUserMessage("   ");

      expect(message.parts).toHaveLength(0);
    });

    it("should add multiple context items", () => {
      const contexts: ContextItem[] = [
        { id: "ctx-1", type: "page", label: "Page 1", value: "Content 1" },
        { id: "ctx-2", type: "tab", label: "Tab", value: "Tab content" },
      ];

      const message = adapter.addUserMessage("Test", undefined, contexts);

      expect(message.parts).toHaveLength(3);
      expect(message.parts[0].type).toBe("context");
      expect(message.parts[1].type).toBe("context");
      expect(message.parts[2].type).toBe("text");
    });

    it("should include context metadata", () => {
      const contexts = [
        {
          id: "ctx-1",
          type: "page" as const,
          label: "Page",
          value: "Content",
          metadata: { url: "https://example.com" },
        },
      ];

      const message = adapter.addUserMessage("Test", undefined, contexts);

      const contextPart = message.parts[0];
      expect(contextPart.type === "context" && contextPart.metadata).toEqual({
        url: "https://example.com",
      });
    });

    it("should generate unique message IDs", () => {
      const message1 = adapter.addUserMessage("First");
      const message2 = adapter.addUserMessage("Second");

      expect(message1.id).not.toBe(message2.id);
    });

    it("should include timestamp", () => {
      const before = Date.now();
      const message = adapter.addUserMessage("Test");
      const after = Date.now();

      expect(message.timestamp).toBeGreaterThanOrEqual(before);
      expect(message.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe("processEvent", () => {
    describe("execution lifecycle", () => {
      it("should set status to submitted on execution_start", () => {
        adapter.processEvent({ type: "execution_start" });

        expect(adapter.getStatus()).toBe("submitted");
        expect(onStatusChange).toHaveBeenCalledWith("submitted");
      });

      it("should create assistant message on turn_start", () => {
        adapter.processEvent({
          type: "turn_start",
          turnId: "turn-1",
          number: 1,
        });

        const messages = adapter.getMessages();
        expect(messages).toHaveLength(1);
        expect(messages[0].role).toBe("assistant");
        expect(messages[0].parts).toEqual([]);
      });

      it("should set status to streaming on llm_stream_start", () => {
        adapter.processEvent({ type: "llm_stream_start" });

        expect(adapter.getStatus()).toBe("streaming");
      });

      it("should set status to idle on execution_complete", () => {
        adapter.processEvent({
          type: "execution_complete",
          reason: "finished",
          turns: 1,
        });

        expect(adapter.getStatus()).toBe("idle");
      });

      it("should set status to error on execution_error", () => {
        adapter.processEvent({
          type: "execution_error",
          error: { code: "UNKNOWN", message: "Test error" } as any,
          recoverable: false,
        });

        expect(adapter.getStatus()).toBe("error");
      });

      it("should handle session_created event", () => {
        adapter.processEvent({
          type: "session_created",
          sessionId: "session-123",
        });

        // Session created should not change status
        expect(adapter.getStatus()).toBe("idle");
      });

      it("should handle turn_complete with shouldContinue=true", () => {
        adapter.processEvent({ type: "execution_start" });
        adapter.processEvent({
          type: "turn_start",
          turnId: "turn-1",
          number: 1,
        });
        adapter.processEvent({ type: "turn_complete", shouldContinue: true });

        // Status should not change to idle when shouldContinue is true
        expect(adapter.getStatus()).toBe("submitted");
      });

      it("should handle turn_complete with shouldContinue=false", () => {
        adapter.processEvent({ type: "execution_start" });
        adapter.processEvent({
          type: "turn_start",
          turnId: "turn-1",
          number: 1,
        });
        adapter.processEvent({ type: "turn_complete", shouldContinue: false });

        expect(adapter.getStatus()).toBe("idle");
      });

      it("should handle llm_stream_end event", () => {
        adapter.processEvent({ type: "execution_start" });
        adapter.processEvent({
          type: "turn_start",
          turnId: "turn-1",
          number: 1,
        });
        adapter.processEvent({ type: "llm_stream_start" });
        adapter.processEvent({
          type: "llm_stream_end",
          usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        });

        // Should maintain streaming status (tools might execute next)
        expect(adapter.getStatus()).toBe("streaming");
      });

      it("should handle rate_limit event", () => {
        adapter.processEvent({
          type: "rate_limit",
          snapshot: {
            provider: "openai",
            remaining: 0,
            limit: 100,
            resetAt: Date.now() + 60000,
          },
        });

        // Rate limit should not change status
        expect(adapter.getStatus()).toBe("idle");
      });

      it("should not call onStatusChange if status is the same", () => {
        adapter.processEvent({ type: "execution_start" });
        (onStatusChange as ReturnType<typeof vi.fn>).mockClear();

        adapter.processEvent({ type: "execution_start" });

        expect(onStatusChange).not.toHaveBeenCalled();
      });
    });

    describe("content streaming", () => {
      beforeEach(() => {
        adapter.processEvent({
          type: "turn_start",
          turnId: "turn-1",
          number: 1,
        });
      });

      it("should append content deltas to assistant message", () => {
        adapter.processEvent({ type: "content_delta", delta: "Hello" });
        adapter.processEvent({ type: "content_delta", delta: " world" });

        const messages = adapter.getMessages();
        const textPart = messages[0].parts.find((p) => p.type === "text");
        expect(textPart?.type === "text" && textPart.text).toBe("Hello world");
      });

      it("should append thinking deltas to reasoning part", () => {
        adapter.processEvent({ type: "thinking_delta", delta: "Let me think" });
        adapter.processEvent({ type: "thinking_delta", delta: "..." });

        const messages = adapter.getMessages();
        const reasoningPart = messages[0].parts.find(
          (p) => p.type === "reasoning",
        );
        expect(reasoningPart?.type === "reasoning" && reasoningPart.text).toBe(
          "Let me think...",
        );
      });

      it("should handle mixed content and thinking deltas", () => {
        adapter.processEvent({ type: "thinking_delta", delta: "Thinking..." });
        adapter.processEvent({ type: "content_delta", delta: "Response" });
        adapter.processEvent({ type: "thinking_delta", delta: " more" });
        adapter.processEvent({ type: "content_delta", delta: " continued" });

        const messages = adapter.getMessages();
        expect(messages[0].parts).toHaveLength(2);

        const reasoningPart = messages[0].parts.find(
          (p) => p.type === "reasoning",
        );
        const textPart = messages[0].parts.find((p) => p.type === "text");

        expect(reasoningPart?.type === "reasoning" && reasoningPart.text).toBe(
          "Thinking... more",
        );
        expect(textPart?.type === "text" && textPart.text).toBe(
          "Response continued",
        );
      });

      it("should place reasoning part at the beginning", () => {
        adapter.processEvent({ type: "content_delta", delta: "Text first" });
        adapter.processEvent({ type: "thinking_delta", delta: "Thinking" });

        const messages = adapter.getMessages();
        // Reasoning should be inserted at the beginning
        expect(messages[0].parts[0].type).toBe("reasoning");
      });

      it("should not update message if no current assistant message", () => {
        // Create a fresh adapter to test this scenario
        const freshAdapter = createChatAdapter();

        // Process content delta without turn_start - should not crash
        freshAdapter.processEvent({
          type: "content_delta",
          delta: "Orphan delta",
        });

        // No messages should be created since there's no assistant message to update
        const messages = freshAdapter.getMessages();
        expect(messages).toHaveLength(0);
      });
    });

    describe("tool calls", () => {
      beforeEach(() => {
        adapter.processEvent({
          type: "turn_start",
          turnId: "turn-1",
          number: 1,
        });
      });

      it("should add tool call on tool_call_pending", () => {
        adapter.processEvent({
          type: "tool_call_pending",
          callId: "call-1",
          toolName: "search",
          params: { query: "test" },
        });

        const messages = adapter.getMessages();
        const toolPart = messages[0].parts.find((p) => p.type === "tool");
        expect(toolPart).toMatchObject({
          type: "tool",
          toolCallId: "call-1",
          toolName: "search",
          input: { query: "test" },
          state: "pending",
        });
        expect(adapter.getStatus()).toBe("executing_tools");
      });

      it("should update tool state on tool_call_start", () => {
        adapter.processEvent({
          type: "tool_call_pending",
          callId: "call-1",
          toolName: "search",
          params: { query: "test" },
        });
        adapter.processEvent({
          type: "tool_call_start",
          callId: "call-1",
        });

        const messages = adapter.getMessages();
        const toolPart = messages[0].parts.find((p) => p.type === "tool");
        expect(toolPart?.type === "tool" && toolPart.state).toBe("executing");
      });

      it("should update tool with result on tool_call_complete", () => {
        adapter.processEvent({
          type: "tool_call_pending",
          callId: "call-1",
          toolName: "search",
          params: { query: "test" },
        });
        adapter.processEvent({
          type: "tool_call_complete",
          callId: "call-1",
          result: { success: true, data: { results: [] } },
          duration: 100,
        });

        const messages = adapter.getMessages();
        const toolPart = messages[0].parts.find((p) => p.type === "tool");
        expect(toolPart).toMatchObject({
          state: "completed",
          output: { results: [] },
          duration: 100,
        });
      });

      it("should update tool with error on tool_call_error", () => {
        adapter.processEvent({
          type: "tool_call_pending",
          callId: "call-1",
          toolName: "search",
          params: { query: "test" },
        });
        adapter.processEvent({
          type: "tool_call_error",
          callId: "call-1",
          error: new Error("Tool failed"),
        });

        const messages = adapter.getMessages();
        const toolPart = messages[0].parts.find((p) => p.type === "tool");
        expect(toolPart).toMatchObject({
          state: "error",
          errorText: "Tool failed",
        });
      });

      it("should handle multiple tool calls", () => {
        adapter.processEvent({
          type: "tool_call_pending",
          callId: "call-1",
          toolName: "search",
          params: { query: "first" },
        });
        adapter.processEvent({
          type: "tool_call_pending",
          callId: "call-2",
          toolName: "fetch",
          params: { url: "https://example.com" },
        });

        const messages = adapter.getMessages();
        const toolParts = messages[0].parts.filter((p) => p.type === "tool");
        expect(toolParts).toHaveLength(2);
        expect(toolParts[0]).toMatchObject({
          toolCallId: "call-1",
          toolName: "search",
        });
        expect(toolParts[1]).toMatchObject({
          toolCallId: "call-2",
          toolName: "fetch",
        });
      });

      it("should update correct tool in multiple tool calls", () => {
        adapter.processEvent({
          type: "tool_call_pending",
          callId: "call-1",
          toolName: "search",
          params: {},
        });
        adapter.processEvent({
          type: "tool_call_pending",
          callId: "call-2",
          toolName: "fetch",
          params: {},
        });
        adapter.processEvent({
          type: "tool_call_complete",
          callId: "call-2",
          result: { success: true, data: { result: "data" } },
          duration: 50,
        });

        const messages = adapter.getMessages();
        const toolParts = messages[0].parts.filter((p) => p.type === "tool");
        expect(toolParts[0]).toMatchObject({
          toolCallId: "call-1",
          state: "pending",
        });
        expect(toolParts[1]).toMatchObject({
          toolCallId: "call-2",
          state: "completed",
        });
      });

      it("should handle tool_output_stream event", () => {
        adapter.processEvent({
          type: "tool_call_pending",
          callId: "call-1",
          toolName: "search",
          params: {},
        });
        adapter.processEvent({
          type: "tool_output_stream",
          callId: "call-1",
          chunk: "partial output",
        });

        // tool_output_stream is handled but doesn't update state currently
        const messages = adapter.getMessages();
        expect(messages[0].parts).toHaveLength(1);
      });

      it("should handle tool error with complex error object", () => {
        adapter.processEvent({
          type: "tool_call_pending",
          callId: "call-1",
          toolName: "search",
          params: {},
        });
        adapter.processEvent({
          type: "tool_call_error",
          callId: "call-1",
          error: new Error("Network timeout after 30s"),
        });

        const messages = adapter.getMessages();
        const toolPart = messages[0].parts.find((p) => p.type === "tool");
        expect(toolPart?.type === "tool" && toolPart.errorText).toBe(
          "Network timeout after 30s",
        );
      });
    });
  });

  describe("reset", () => {
    it("should reset to empty state", () => {
      adapter.addUserMessage("Hello");
      adapter.processEvent({ type: "execution_start" });

      adapter.reset();

      expect(adapter.getMessages()).toEqual([]);
      expect(adapter.getStatus()).toBe("idle");
    });

    it("should reset with initial messages", () => {
      const initialMessages: UIMessage[] = [
        {
          id: "system-1",
          role: "system",
          parts: [{ type: "text", text: "You are a helpful assistant" }],
        },
      ];

      adapter.reset(initialMessages);

      expect(adapter.getMessages()).toEqual(initialMessages);
    });
  });

  describe("removeLastAssistantMessage", () => {
    it("should remove the last assistant message", () => {
      adapter.addUserMessage("Hello");
      adapter.processEvent({ type: "turn_start", turnId: "turn-1", number: 1 });
      adapter.processEvent({ type: "content_delta", delta: "Hi there!" });

      const removed = adapter.removeLastAssistantMessage();

      expect(removed).not.toBeNull();
      expect(removed?.role).toBe("assistant");
      expect(adapter.getMessages()).toHaveLength(1);
      expect(adapter.getMessages()[0].role).toBe("user");
    });

    it("should return null if no assistant message exists", () => {
      adapter.addUserMessage("Hello");

      const removed = adapter.removeLastAssistantMessage();

      expect(removed).toBeNull();
    });
  });

  describe("setMessages", () => {
    it("should set messages directly", () => {
      const messages: UIMessage[] = [
        {
          id: "msg-1",
          role: "user",
          parts: [{ type: "text", text: "Test" }],
        },
      ];

      adapter.setMessages(messages);

      expect(adapter.getMessages()).toEqual(messages);
      expect(onMessagesUpdate).toHaveBeenCalledWith(messages);
    });

    it("should create a copy of the messages array", () => {
      const messages: UIMessage[] = [
        {
          id: "msg-1",
          role: "user",
          parts: [{ type: "text", text: "Test" }],
        },
      ];

      adapter.setMessages(messages);
      messages.push({
        id: "msg-2",
        role: "assistant",
        parts: [{ type: "text", text: "Response" }],
      });

      expect(adapter.getMessages()).toHaveLength(1);
    });

    it("should clear messages when setting empty array", () => {
      adapter.addUserMessage("Hello");
      adapter.setMessages([]);

      expect(adapter.getMessages()).toEqual([]);
    });
  });

  describe("complex scenarios", () => {
    it("should handle a complete conversation flow", () => {
      // User sends a message
      adapter.addUserMessage("What is 2+2?");

      // Execution starts
      adapter.processEvent({ type: "execution_start" });
      expect(adapter.getStatus()).toBe("submitted");

      // Turn starts
      adapter.processEvent({ type: "turn_start", turnId: "turn-1", number: 1 });

      // LLM starts streaming
      adapter.processEvent({ type: "llm_stream_start" });
      expect(adapter.getStatus()).toBe("streaming");

      // Content streams in
      adapter.processEvent({ type: "content_delta", delta: "The answer is " });
      adapter.processEvent({ type: "content_delta", delta: "4." });

      // Turn completes
      adapter.processEvent({ type: "turn_complete", shouldContinue: false });

      // Execution completes
      adapter.processEvent({
        type: "execution_complete",
        reason: "finished",
        turns: 1,
      });

      expect(adapter.getStatus()).toBe("idle");
      const messages = adapter.getMessages();
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe("user");
      expect(messages[1].role).toBe("assistant");

      const textPart = messages[1].parts.find((p) => p.type === "text");
      expect(textPart?.type === "text" && textPart.text).toBe(
        "The answer is 4.",
      );
    });

    it("should handle multi-turn conversation with tools", () => {
      // User message
      adapter.addUserMessage("Search for TypeScript tutorials");

      // First turn - tool call
      adapter.processEvent({ type: "execution_start" });
      adapter.processEvent({ type: "turn_start", turnId: "turn-1", number: 1 });
      adapter.processEvent({
        type: "tool_call_pending",
        callId: "call-1",
        toolName: "search",
        params: { query: "TypeScript tutorials" },
      });
      adapter.processEvent({ type: "tool_call_start", callId: "call-1" });
      adapter.processEvent({
        type: "tool_call_complete",
        callId: "call-1",
        result: { success: true, data: { results: ["result1", "result2"] } },
        duration: 150,
      });
      adapter.processEvent({ type: "turn_complete", shouldContinue: true });

      // Second turn - response
      adapter.processEvent({ type: "turn_start", turnId: "turn-2", number: 2 });
      adapter.processEvent({ type: "llm_stream_start" });
      adapter.processEvent({
        type: "content_delta",
        delta: "Here are some tutorials...",
      });
      adapter.processEvent({ type: "turn_complete", shouldContinue: false });
      adapter.processEvent({
        type: "execution_complete",
        reason: "finished",
        turns: 2,
      });

      const messages = adapter.getMessages();
      expect(messages).toHaveLength(3); // user + 2 assistant messages

      // First assistant message has tool call
      const toolPart = messages[1].parts.find((p) => p.type === "tool");
      expect(toolPart).toMatchObject({
        toolName: "search",
        state: "completed",
        output: { results: ["result1", "result2"] },
        duration: 150,
      });

      // Second assistant message has text
      const textPart = messages[2].parts.find((p) => p.type === "text");
      expect(textPart?.type === "text" && textPart.text).toBe(
        "Here are some tutorials...",
      );
    });

    it("should handle error during execution", () => {
      adapter.addUserMessage("Test");
      adapter.processEvent({ type: "execution_start" });
      adapter.processEvent({ type: "turn_start", turnId: "turn-1", number: 1 });
      adapter.processEvent({ type: "content_delta", delta: "Starting..." });
      adapter.processEvent({
        type: "execution_error",
        error: { code: "NETWORK_ERROR", message: "Connection failed" } as any,
        recoverable: false,
      });

      expect(adapter.getStatus()).toBe("error");
      const messages = adapter.getMessages();
      expect(messages).toHaveLength(2);
    });

    it("should handle regeneration flow", () => {
      // Initial conversation
      adapter.addUserMessage("Hello");
      adapter.processEvent({ type: "turn_start", turnId: "turn-1", number: 1 });
      adapter.processEvent({ type: "content_delta", delta: "Hi there!" });
      adapter.processEvent({ type: "turn_complete", shouldContinue: false });

      expect(adapter.getMessages()).toHaveLength(2);

      // Remove last assistant message for regeneration
      const removed = adapter.removeLastAssistantMessage();
      expect(removed?.role).toBe("assistant");
      expect(adapter.getMessages()).toHaveLength(1);

      // New response
      adapter.processEvent({ type: "turn_start", turnId: "turn-2", number: 1 });
      adapter.processEvent({
        type: "content_delta",
        delta: "Hello! How can I help?",
      });
      adapter.processEvent({ type: "turn_complete", shouldContinue: false });

      const messages = adapter.getMessages();
      expect(messages).toHaveLength(2);
      const textPart = messages[1].parts.find((p) => p.type === "text");
      expect(textPart?.type === "text" && textPart.text).toBe(
        "Hello! How can I help?",
      );
    });
  });

  describe("callback behavior", () => {
    it("should not fail without callbacks", () => {
      const adapterNoCallbacks = createChatAdapter();

      expect(() => {
        adapterNoCallbacks.addUserMessage("Test");
        adapterNoCallbacks.processEvent({ type: "execution_start" });
        adapterNoCallbacks.reset();
      }).not.toThrow();
    });

    it("should call onMessagesUpdate for each message change", () => {
      adapter.addUserMessage("First");
      adapter.addUserMessage("Second");

      expect(onMessagesUpdate).toHaveBeenCalledTimes(2);
    });

    it("should call onStatusChange on reset", () => {
      adapter.processEvent({ type: "execution_start" });
      (onStatusChange as ReturnType<typeof vi.fn>).mockClear();

      adapter.reset();

      expect(onStatusChange).toHaveBeenCalledWith("idle");
    });
  });
});
