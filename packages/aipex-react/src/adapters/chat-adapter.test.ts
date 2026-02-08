import type * as AIPexCore from "@aipexstudio/aipex-core";
import { AgentError, ErrorCode } from "@aipexstudio/aipex-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatStatus, ContextItem, UIMessage, UIToolPart } from "../types";
import { ChatAdapter, createChatAdapter } from "./chat-adapter";

// Mock generateId to return predictable IDs
vi.mock("@aipexstudio/aipex-core", async (importOriginal) => {
  const actual = await importOriginal<typeof AIPexCore>();
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
      expect(message.parts[0]?.type).toBe("context");
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
      expect(message.parts[0]?.type).toBe("context");
      expect(message.parts[1]?.type).toBe("context");
      expect(message.parts[2]?.type).toBe("text");
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
      expect(contextPart?.type).toBe("context");
      if (contextPart?.type === "context") {
        expect(contextPart.metadata).toEqual({
          url: "https://example.com",
        });
      }
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
    const metrics = {
      tokensUsed: 0,
      promptTokens: 0,
      completionTokens: 0,
      itemCount: 0,
      maxTurns: 10,
      duration: 0,
      startTime: Date.now(),
    };

    it("should create assistant message and set streaming status on content delta", () => {
      adapter.processEvent({ type: "content_delta", delta: "Hello" });

      const messages = adapter.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatchObject({ role: "assistant" });

      const textPart = messages[0]?.parts[0];
      expect(textPart).toMatchObject({ type: "text", text: "Hello" });
      expect(adapter.getStatus()).toBe("streaming");
    });

    it("should create a pending tool call on tool_call_args_streaming_start", () => {
      adapter.processEvent({
        type: "tool_call_args_streaming_start",
        toolName: "search",
      });

      const messages = adapter.getMessages();
      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatchObject({ role: "assistant" });

      const toolPart = messages[0]?.parts.find((p) => p.type === "tool");
      expect(toolPart).toMatchObject({
        toolName: "search",
        state: "pending",
        input: {},
      });
      expect(adapter.getStatus()).toBe("streaming");
    });

    it("should update pending tool params on tool_call_args_streaming_complete", () => {
      adapter.processEvent({
        type: "tool_call_args_streaming_start",
        toolName: "search",
      });
      adapter.processEvent({
        type: "tool_call_args_streaming_complete",
        toolName: "search",
        params: { q: "ts" },
      });

      const toolPart = adapter
        .getMessages()[0]
        ?.parts.find((p) => p.type === "tool");
      expect(toolPart).toMatchObject({
        toolName: "search",
        state: "pending",
        input: { q: "ts" },
      });
    });

    it("should not duplicate tool parts when tool_call_start follows tool args streaming events", () => {
      adapter.processEvent({
        type: "tool_call_args_streaming_start",
        toolName: "search",
      });
      adapter.processEvent({
        type: "tool_call_args_streaming_complete",
        toolName: "search",
        params: { q: "ts" },
      });
      adapter.processEvent({
        type: "tool_call_start",
        toolName: "search",
        params: { q: "ts" },
      });

      const toolParts =
        adapter.getMessages()[0]?.parts.filter((p) => p.type === "tool") ?? [];
      expect(toolParts).toHaveLength(1);
      expect(toolParts[0]).toMatchObject({
        toolName: "search",
        state: "executing",
        input: { q: "ts" },
      });
      expect(adapter.getStatus()).toBe("executing_tools");
    });

    it("should append to existing assistant message", () => {
      adapter.processEvent({ type: "content_delta", delta: "Hello" });
      adapter.processEvent({ type: "content_delta", delta: " world" });

      const messages = adapter.getMessages();
      const textPart = messages[0]?.parts[0];
      expect(textPart).toMatchObject({ text: "Hello world" });
    });

    it("should ignore session events for status", () => {
      adapter.processEvent({ type: "session_created", sessionId: "session-1" });
      adapter.processEvent({
        type: "session_resumed",
        sessionId: "session-1",
        itemCount: 2,
      });
      adapter.processEvent({ type: "metrics_update", metrics });

      expect(adapter.getStatus()).toBe("idle");
    });

    it("should set idle status on execution_complete", () => {
      adapter.processEvent({ type: "content_delta", delta: "Hi" });
      adapter.processEvent({
        type: "execution_complete",
        finalOutput: "Hi",
        metrics,
      });

      expect(adapter.getStatus()).toBe("idle");
      expect(onStatusChange).toHaveBeenCalledWith("idle");
    });

    it("should set error status on error event", () => {
      adapter.processEvent({
        type: "error",
        error: new AgentError("Test failure", ErrorCode.LLM_API_ERROR, false),
      });

      expect(adapter.getStatus()).toBe("error");
    });

    it("should not duplicate status notifications", () => {
      adapter.processEvent({ type: "content_delta", delta: "Hi" });
      (onStatusChange as ReturnType<typeof vi.fn>).mockClear();

      adapter.processEvent({ type: "content_delta", delta: " again" });

      expect(onStatusChange).toHaveBeenCalledTimes(0);
    });
  });

  describe("tool call handling", () => {
    beforeEach(() => {
      adapter.processEvent({ type: "content_delta", delta: "Thinking" });
    });

    it("should add tool call on tool_call_start", () => {
      adapter.processEvent({
        type: "tool_call_start",
        toolName: "search",
        params: { query: "test" },
      });

      const messages = adapter.getMessages();
      const toolPart = messages[0]?.parts.find((p) => p.type === "tool");
      expect(toolPart).toMatchObject({
        toolName: "search",
        input: { query: "test" },
        state: "executing",
      });
      expect(adapter.getStatus()).toBe("executing_tools");
    });

    it("should update tool call on completion", () => {
      adapter.processEvent({
        type: "tool_call_start",
        toolName: "search",
        params: { query: "test" },
      });
      adapter.processEvent({
        type: "tool_call_complete",
        toolName: "search",
        result: { data: [1, 2, 3] },
      });

      const toolPart = adapter
        .getMessages()[0]
        ?.parts.find((p) => p.type === "tool");
      expect(toolPart).toMatchObject({
        toolName: "search",
        state: "completed",
        output: { data: [1, 2, 3] },
      });
      expect(adapter.getStatus()).toBe("streaming");
    });

    it("should mark tool call as error when tool_call_error arrives", () => {
      adapter.processEvent({
        type: "tool_call_start",
        toolName: "search",
        params: {},
      });
      adapter.processEvent({
        type: "tool_call_error",
        toolName: "search",
        error: new Error("failed"),
      });

      const toolPart = adapter
        .getMessages()[0]
        ?.parts.find((p) => p.type === "tool");
      expect(toolPart).toMatchObject({
        state: "error",
        errorText: "failed",
      });
      // Status should be streaming, not error - agent may continue after tool error
      expect(adapter.getStatus()).toBe("streaming");
    });

    it("should handle multiple calls for same tool sequentially", () => {
      adapter.processEvent({
        type: "tool_call_start",
        toolName: "search",
        params: { query: "first" },
      });
      adapter.processEvent({
        type: "tool_call_start",
        toolName: "search",
        params: { query: "second" },
      });

      adapter.processEvent({
        type: "tool_call_complete",
        toolName: "search",
        result: { query: "first" },
      });
      adapter.processEvent({
        type: "tool_call_complete",
        toolName: "search",
        result: { query: "second" },
      });

      const toolParts =
        adapter
          .getMessages()[0]
          ?.parts.filter((p): p is UIToolPart => p.type === "tool") ?? [];
      expect(toolParts).toHaveLength(2);
      expect(toolParts[0]).toMatchObject({
        toolName: "search",
        state: "completed",
        output: { query: "first" },
      });
      expect(toolParts[1]).toMatchObject({
        toolName: "search",
        state: "completed",
        output: { query: "second" },
      });
    });

    it("should ignore completion when no pending call", () => {
      adapter.processEvent({
        type: "tool_call_complete",
        toolName: "search",
        result: { orphan: true },
      });

      const toolParts =
        adapter.getMessages()[0]?.parts.filter((p) => p.type === "tool") ?? [];
      expect(toolParts).toHaveLength(0);
    });

    it("should mark tool as error when result has success: false", () => {
      adapter.processEvent({
        type: "tool_call_start",
        toolName: "organize_tabs",
        params: {},
      });
      adapter.processEvent({
        type: "tool_call_complete",
        toolName: "organize_tabs",
        result: {
          success: false,
          error: "Cannot organize tabs in incognito window",
        },
      });

      const toolPart = adapter
        .getMessages()[0]
        ?.parts.find((p) => p.type === "tool");
      expect(toolPart).toMatchObject({
        toolName: "organize_tabs",
        state: "error",
        errorText: "Cannot organize tabs in incognito window",
      });
      // Status should remain streaming (not error) since this is a business failure
      expect(adapter.getStatus()).toBe("streaming");
    });

    it("should use message field when error field is missing in success: false result", () => {
      adapter.processEvent({
        type: "tool_call_start",
        toolName: "screenshot",
        params: {},
      });
      adapter.processEvent({
        type: "tool_call_complete",
        toolName: "screenshot",
        result: { success: false, message: "No active tab found" },
      });

      const toolPart = adapter
        .getMessages()[0]
        ?.parts.find((p) => p.type === "tool");
      expect(toolPart).toMatchObject({
        state: "error",
        errorText: "No active tab found",
      });
    });

    it("should show generic error message when success: false has no error/message", () => {
      adapter.processEvent({
        type: "tool_call_start",
        toolName: "failing_tool",
        params: {},
      });
      adapter.processEvent({
        type: "tool_call_complete",
        toolName: "failing_tool",
        result: { success: false },
      });

      const toolPart = adapter
        .getMessages()[0]
        ?.parts.find((p) => p.type === "tool");
      expect(toolPart).toMatchObject({
        state: "error",
        errorText: "Operation failed",
      });
    });

    it("should keep output in tool part when marking as error for debugging", () => {
      adapter.processEvent({
        type: "tool_call_start",
        toolName: "api_call",
        params: {},
      });
      adapter.processEvent({
        type: "tool_call_complete",
        toolName: "api_call",
        result: {
          success: false,
          error: "API rate limit exceeded",
          details: { remaining: 0 },
        },
      });

      const toolPart = adapter
        .getMessages()[0]
        ?.parts.find((p) => p.type === "tool") as UIToolPart | undefined;
      expect(toolPart?.state).toBe("error");
      expect(toolPart?.errorText).toBe("API rate limit exceeded");
      expect(toolPart?.output).toEqual({
        success: false,
        error: "API rate limit exceeded",
        details: { remaining: 0 },
      });
    });

    it("should not set overall status to error on tool_call_error", () => {
      adapter.processEvent({
        type: "tool_call_start",
        toolName: "search",
        params: {},
      });
      adapter.processEvent({
        type: "tool_call_error",
        toolName: "search",
        error: new Error("Tool execution failed"),
      });

      // Status should be streaming, not error - agent may continue
      expect(adapter.getStatus()).toBe("streaming");
    });
  });

  describe("reset", () => {
    it("should reset to empty state", () => {
      adapter.addUserMessage("Hello");
      adapter.processEvent({ type: "content_delta", delta: "Working" });

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
      adapter.processEvent({ type: "content_delta", delta: "Hi there!" });

      const removed = adapter.removeLastAssistantMessage();

      expect(removed).not.toBeNull();
      expect(removed?.role).toBe("assistant");
      expect(adapter.getMessages()).toHaveLength(1);
      expect(adapter.getMessages()[0]?.role).toBe("user");
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
    const metrics = {
      tokensUsed: 0,
      promptTokens: 0,
      completionTokens: 0,
      itemCount: 0,
      maxTurns: 10,
      duration: 0,
      startTime: Date.now(),
    };

    it("should handle a conversation with tool usage", () => {
      adapter.addUserMessage("Search for TypeScript tutorials");

      adapter.processEvent({ type: "content_delta", delta: "Let me check" });
      adapter.processEvent({
        type: "tool_call_start",
        toolName: "search",
        params: { query: "TypeScript tutorials" },
      });
      adapter.processEvent({
        type: "tool_call_complete",
        toolName: "search",
        result: { results: ["result1", "result2"] },
      });
      adapter.processEvent({
        type: "execution_complete",
        finalOutput: "Found tutorials",
        metrics,
      });

      adapter.addUserMessage("Thanks!");
      adapter.processEvent({
        type: "content_delta",
        delta: "You're welcome",
      });
      adapter.processEvent({
        type: "execution_complete",
        finalOutput: "You're welcome",
        metrics,
      });

      const messages = adapter.getMessages();
      expect(messages).toHaveLength(4);

      const firstAssistant = messages[1];
      const toolPart = firstAssistant?.parts.find((p) => p.type === "tool");
      expect(toolPart).toMatchObject({
        toolName: "search",
        state: "completed",
        output: { results: ["result1", "result2"] },
      });

      const secondAssistant = messages[3];
      expect(secondAssistant?.parts[0]).toMatchObject({
        type: "text",
        text: "You're welcome",
      });
    });

    it("should handle error events", () => {
      adapter.addUserMessage("Test");
      adapter.processEvent({ type: "content_delta", delta: "Starting" });
      adapter.processEvent({
        type: "error",
        error: new AgentError(
          "Connection failed",
          ErrorCode.LLM_API_ERROR,
          false,
        ),
      });

      expect(adapter.getStatus()).toBe("error");
      expect(adapter.getMessages()).toHaveLength(2);
    });

    it("should support regeneration flow", () => {
      adapter.addUserMessage("Hello");
      adapter.processEvent({ type: "content_delta", delta: "Hi there!" });
      adapter.processEvent({
        type: "execution_complete",
        finalOutput: "Hi there!",
        metrics,
      });

      expect(adapter.getMessages()).toHaveLength(2);

      const removed = adapter.removeLastAssistantMessage();
      expect(removed?.role).toBe("assistant");

      adapter.processEvent({
        type: "content_delta",
        delta: "Hello! How can I help?",
      });
      adapter.processEvent({
        type: "execution_complete",
        finalOutput: "Hello! How can I help?",
        metrics,
      });

      const messages = adapter.getMessages();
      expect(messages).toHaveLength(2);
      const textPart = messages[1]?.parts.find((p) => p.type === "text");
      expect(textPart).toMatchObject({ text: "Hello! How can I help?" });
    });
  });

  describe("callback behavior", () => {
    it("should not fail without callbacks", () => {
      const adapterNoCallbacks = createChatAdapter();

      expect(() => {
        adapterNoCallbacks.addUserMessage("Test");
        adapterNoCallbacks.processEvent({ type: "content_delta", delta: "Hi" });
        adapterNoCallbacks.reset();
      }).not.toThrow();
    });

    it("should call onMessagesUpdate for each message change", () => {
      adapter.addUserMessage("First");
      adapter.addUserMessage("Second");

      expect(onMessagesUpdate).toHaveBeenCalledTimes(2);
    });

    it("should call onStatusChange on reset", () => {
      adapter.processEvent({ type: "content_delta", delta: "Hi" });
      (onStatusChange as ReturnType<typeof vi.fn>).mockClear();

      adapter.reset();

      expect(onStatusChange).toHaveBeenCalledWith("idle");
    });
  });
});
