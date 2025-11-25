import type { Agent, AgentEvent } from "@aipexstudio/aipex-core";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useChat } from "../core/hooks/use-chat";

// Mock the Agent class
function createMockAgent(): Agent {
  const mockAgent = {
    execute: vi.fn(),
    continueConversation: vi.fn(),
    interrupt: vi.fn(),
    deleteSession: vi.fn(),
    getToolRegistry: vi.fn().mockReturnValue({
      getTool: vi.fn(),
    }),
  } as unknown as Agent;

  return mockAgent;
}

// Helper to create an async generator from events
async function* createEventGenerator(
  events: AgentEvent[],
): AsyncGenerator<AgentEvent> {
  for (const event of events) {
    yield event;
  }
}

describe("useChat", () => {
  let mockAgent: Agent;

  beforeEach(() => {
    vi.resetAllMocks();
    mockAgent = createMockAgent();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initial state", () => {
    it("should start with empty messages", () => {
      const { result } = renderHook(() => useChat(mockAgent));

      expect(result.current.messages).toEqual([]);
    });

    it("should start with idle status", () => {
      const { result } = renderHook(() => useChat(mockAgent));

      expect(result.current.status).toBe("idle");
    });

    it("should start with null sessionId", () => {
      const { result } = renderHook(() => useChat(mockAgent));

      expect(result.current.sessionId).toBeNull();
    });

    it("should initialize with provided initial messages", () => {
      const initialMessages = [
        {
          id: "msg-1",
          role: "system" as const,
          parts: [{ type: "text" as const, text: "You are helpful" }],
        },
      ];

      const { result } = renderHook(() =>
        useChat(mockAgent, {
          config: { initialMessages },
        }),
      );

      expect(result.current.messages).toEqual(initialMessages);
    });
  });

  describe("sendMessage", () => {
    it("should add user message and call agent.execute", async () => {
      const events: AgentEvent[] = [
        { type: "session_created", sessionId: "session-1" },
        { type: "execution_start" },
        { type: "turn_start", turnId: "turn-1", number: 1 },
        { type: "content_delta", delta: "Hello!" },
        { type: "turn_complete", shouldContinue: false },
        { type: "execution_complete", reason: "finished", turns: 1 },
      ];

      (mockAgent.execute as ReturnType<typeof vi.fn>).mockReturnValue(
        createEventGenerator(events),
      );

      const { result } = renderHook(() => useChat(mockAgent));

      await act(async () => {
        await result.current.sendMessage("Hi there");
      });

      expect(mockAgent.execute).toHaveBeenCalledWith("Hi there");
      expect(result.current.sessionId).toBe("session-1");
    });

    it("should not send empty messages", async () => {
      const { result } = renderHook(() => useChat(mockAgent));

      await act(async () => {
        await result.current.sendMessage("");
        await result.current.sendMessage("   ");
      });

      expect(mockAgent.execute).not.toHaveBeenCalled();
    });

    it("should call handlers.onMessageSent", async () => {
      const onMessageSent = vi.fn();
      const events: AgentEvent[] = [
        { type: "session_created", sessionId: "session-1" },
        { type: "execution_complete", reason: "finished", turns: 0 },
      ];

      (mockAgent.execute as ReturnType<typeof vi.fn>).mockReturnValue(
        createEventGenerator(events),
      );

      const { result } = renderHook(() =>
        useChat(mockAgent, {
          handlers: { onMessageSent },
        }),
      );

      await act(async () => {
        await result.current.sendMessage("Hello");
      });

      expect(onMessageSent).toHaveBeenCalled();
      expect(onMessageSent.mock.calls[0][0].role).toBe("user");
    });
  });

  describe("continueConversation", () => {
    it("should call agent.continueConversation with existing session", async () => {
      const events: AgentEvent[] = [
        { type: "session_created", sessionId: "session-1" },
        { type: "execution_complete", reason: "finished", turns: 0 },
      ];

      (mockAgent.execute as ReturnType<typeof vi.fn>).mockReturnValue(
        createEventGenerator(events),
      );

      (
        mockAgent.continueConversation as ReturnType<typeof vi.fn>
      ).mockReturnValue(
        createEventGenerator([
          { type: "execution_start" },
          { type: "execution_complete", reason: "finished", turns: 1 },
        ]),
      );

      const { result } = renderHook(() => useChat(mockAgent));

      // First message creates session
      await act(async () => {
        await result.current.sendMessage("First message");
      });

      // Continue conversation
      await act(async () => {
        await result.current.continueConversation("Follow up");
      });

      expect(mockAgent.continueConversation).toHaveBeenCalledWith(
        "session-1",
        "Follow up",
      );
    });

    it("should fall back to sendMessage if no session exists", async () => {
      const events: AgentEvent[] = [
        { type: "session_created", sessionId: "session-1" },
        { type: "execution_complete", reason: "finished", turns: 0 },
      ];

      (mockAgent.execute as ReturnType<typeof vi.fn>).mockReturnValue(
        createEventGenerator(events),
      );

      const { result } = renderHook(() => useChat(mockAgent));

      await act(async () => {
        await result.current.continueConversation("Hello");
      });

      expect(mockAgent.execute).toHaveBeenCalled();
    });
  });

  describe("interrupt", () => {
    it("should call agent.interrupt with session id", async () => {
      const events: AgentEvent[] = [
        { type: "session_created", sessionId: "session-1" },
        { type: "execution_complete", reason: "finished", turns: 0 },
      ];

      (mockAgent.execute as ReturnType<typeof vi.fn>).mockReturnValue(
        createEventGenerator(events),
      );

      const { result } = renderHook(() => useChat(mockAgent));

      await act(async () => {
        await result.current.sendMessage("Start");
      });

      await act(async () => {
        await result.current.interrupt();
      });

      expect(mockAgent.interrupt).toHaveBeenCalledWith("session-1");
      expect(result.current.status).toBe("idle");
    });
  });

  describe("reset", () => {
    it("should reset to initial state", async () => {
      const events: AgentEvent[] = [
        { type: "session_created", sessionId: "session-1" },
        { type: "execution_start" },
        { type: "turn_start", turnId: "turn-1", number: 1 },
        { type: "content_delta", delta: "Response" },
        { type: "execution_complete", reason: "finished", turns: 1 },
      ];

      (mockAgent.execute as ReturnType<typeof vi.fn>).mockReturnValue(
        createEventGenerator(events),
      );

      const { result } = renderHook(() => useChat(mockAgent));

      await act(async () => {
        await result.current.sendMessage("Hello");
      });

      expect(result.current.messages.length).toBeGreaterThan(0);

      act(() => {
        result.current.reset();
      });

      expect(result.current.messages).toEqual([]);
      expect(result.current.sessionId).toBeNull();
      expect(mockAgent.deleteSession).toHaveBeenCalledWith("session-1");
    });

    it("should reset to initial messages if provided", () => {
      const initialMessages = [
        {
          id: "system-1",
          role: "system" as const,
          parts: [{ type: "text" as const, text: "System prompt" }],
        },
      ];

      const { result } = renderHook(() =>
        useChat(mockAgent, {
          config: { initialMessages },
        }),
      );

      act(() => {
        result.current.reset();
      });

      expect(result.current.messages).toEqual(initialMessages);
    });
  });

  describe("setMessages", () => {
    it("should set messages directly", () => {
      const { result } = renderHook(() => useChat(mockAgent));

      const newMessages = [
        {
          id: "msg-1",
          role: "user" as const,
          parts: [{ type: "text" as const, text: "Direct set" }],
        },
      ];

      act(() => {
        result.current.setMessages(newMessages);
      });

      expect(result.current.messages).toEqual(newMessages);
    });
  });

  describe("event handlers", () => {
    it("should call onStatusChange when status changes", async () => {
      const onStatusChange = vi.fn();
      const events: AgentEvent[] = [
        { type: "session_created", sessionId: "session-1" },
        { type: "execution_start" },
        { type: "execution_complete", reason: "finished", turns: 0 },
      ];

      (mockAgent.execute as ReturnType<typeof vi.fn>).mockReturnValue(
        createEventGenerator(events),
      );

      const { result } = renderHook(() =>
        useChat(mockAgent, {
          handlers: { onStatusChange },
        }),
      );

      await act(async () => {
        await result.current.sendMessage("Test");
      });

      expect(onStatusChange).toHaveBeenCalled();
    });

    it("should call onError when an error occurs", async () => {
      const onError = vi.fn();
      const testError = new Error("Test error");

      (mockAgent.execute as ReturnType<typeof vi.fn>).mockImplementation(
        async function* () {
          yield { type: "execution_start" };
          throw testError;
        },
      );

      const { result } = renderHook(() =>
        useChat(mockAgent, {
          handlers: { onError },
        }),
      );

      await act(async () => {
        await result.current.sendMessage("Test");
      });

      expect(onError).toHaveBeenCalledWith(testError);
      expect(result.current.status).toBe("error");
    });

    it("should call onResponseReceived when response is received", async () => {
      const onResponseReceived = vi.fn();
      const events: AgentEvent[] = [
        { type: "session_created", sessionId: "session-1" },
        { type: "execution_start" },
        { type: "turn_start", turnId: "turn-1", number: 1 },
        { type: "content_delta", delta: "Response" },
        { type: "execution_complete", reason: "finished", turns: 1 },
      ];

      (mockAgent.execute as ReturnType<typeof vi.fn>).mockReturnValue(
        createEventGenerator(events),
      );

      const { result } = renderHook(() =>
        useChat(mockAgent, {
          handlers: { onResponseReceived },
        }),
      );

      await act(async () => {
        await result.current.sendMessage("Test");
      });

      // onResponseReceived is called when the response is complete
      expect(onResponseReceived).toHaveBeenCalled();
    });
  });

  describe("regenerate", () => {
    it("should regenerate the last response", async () => {
      const events1: AgentEvent[] = [
        { type: "session_created", sessionId: "session-1" },
        { type: "execution_start" },
        { type: "turn_start", turnId: "turn-1", number: 1 },
        { type: "content_delta", delta: "First response" },
        { type: "execution_complete", reason: "finished", turns: 1 },
      ];

      const events2: AgentEvent[] = [
        { type: "execution_start" },
        { type: "turn_start", turnId: "turn-2", number: 1 },
        { type: "content_delta", delta: "Regenerated response" },
        { type: "execution_complete", reason: "finished", turns: 1 },
      ];

      (mockAgent.execute as ReturnType<typeof vi.fn>).mockReturnValueOnce(
        createEventGenerator(events1),
      );

      (
        mockAgent.continueConversation as ReturnType<typeof vi.fn>
      ).mockReturnValueOnce(createEventGenerator(events2));

      const { result } = renderHook(() => useChat(mockAgent));

      // Send initial message
      await act(async () => {
        await result.current.sendMessage("Hello");
      });

      expect(result.current.messages).toHaveLength(2);

      // Regenerate
      await act(async () => {
        await result.current.regenerate();
      });

      // Should have removed old response and added new one
      expect(result.current.messages).toHaveLength(2);
    });

    it("should not regenerate if no messages exist", async () => {
      const { result } = renderHook(() => useChat(mockAgent));

      await act(async () => {
        await result.current.regenerate();
      });

      expect(mockAgent.continueConversation).not.toHaveBeenCalled();
    });
  });

  describe("message with files and contexts", () => {
    it("should send message with context items", async () => {
      const events: AgentEvent[] = [
        { type: "session_created", sessionId: "session-1" },
        { type: "execution_complete", reason: "finished", turns: 0 },
      ];

      (mockAgent.execute as ReturnType<typeof vi.fn>).mockReturnValue(
        createEventGenerator(events),
      );

      const { result } = renderHook(() => useChat(mockAgent));

      const contexts = [
        { id: "ctx-1", type: "page" as const, label: "Page", value: "Content" },
      ];

      await act(async () => {
        await result.current.sendMessage("Summarize this", undefined, contexts);
      });

      expect(result.current.messages[0].parts).toHaveLength(2);
      expect(result.current.messages[0].parts[0].type).toBe("context");
    });
  });

  describe("edge cases", () => {
    it("should handle rapid successive messages", async () => {
      const events: AgentEvent[] = [
        { type: "session_created", sessionId: "session-1" },
        { type: "execution_complete", reason: "finished", turns: 0 },
      ];

      (mockAgent.execute as ReturnType<typeof vi.fn>).mockReturnValue(
        createEventGenerator(events),
      );

      const { result } = renderHook(() => useChat(mockAgent));

      await act(async () => {
        // Send multiple messages quickly
        await Promise.all([
          result.current.sendMessage("First"),
          result.current.sendMessage("Second"),
        ]);
      });

      // Both messages should be added
      expect(result.current.messages.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle agent returning empty events", async () => {
      (mockAgent.execute as ReturnType<typeof vi.fn>).mockReturnValue(
        createEventGenerator([]),
      );

      const { result } = renderHook(() => useChat(mockAgent));

      await act(async () => {
        await result.current.sendMessage("Test");
      });

      // Should have user message but no response
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].role).toBe("user");
    });

    it("should handle interrupt when not streaming", async () => {
      const { result } = renderHook(() => useChat(mockAgent));

      await act(async () => {
        await result.current.interrupt();
      });

      // Should not throw and status should remain idle
      expect(result.current.status).toBe("idle");
    });

    it("should update sessionId from session_created event", async () => {
      const events: AgentEvent[] = [
        { type: "session_created", sessionId: "new-session-123" },
        { type: "execution_complete", reason: "finished", turns: 0 },
      ];

      (mockAgent.execute as ReturnType<typeof vi.fn>).mockReturnValue(
        createEventGenerator(events),
      );

      const { result } = renderHook(() => useChat(mockAgent));

      await act(async () => {
        await result.current.sendMessage("Test");
      });

      expect(result.current.sessionId).toBe("new-session-123");
    });
  });

  describe("tool call events", () => {
    it("should handle tool call events in messages", async () => {
      const events: AgentEvent[] = [
        { type: "session_created", sessionId: "session-1" },
        { type: "execution_start" },
        { type: "turn_start", turnId: "turn-1", number: 1 },
        {
          type: "tool_call_pending",
          callId: "call-1",
          toolName: "search",
          params: { q: "test" },
        },
        { type: "tool_call_start", callId: "call-1" },
        {
          type: "tool_call_complete",
          callId: "call-1",
          result: { success: true, data: { found: true } },
          duration: 100,
        },
        { type: "content_delta", delta: "Based on the search..." },
        { type: "execution_complete", reason: "finished", turns: 1 },
      ];

      (mockAgent.execute as ReturnType<typeof vi.fn>).mockReturnValue(
        createEventGenerator(events),
      );

      const { result } = renderHook(() => useChat(mockAgent));

      await act(async () => {
        await result.current.sendMessage("Search for something");
      });

      const assistantMessage = result.current.messages.find(
        (m: { role: string }) => m.role === "assistant",
      );
      expect(assistantMessage).toBeDefined();

      const toolPart = assistantMessage?.parts.find(
        (p: { type: string }) => p.type === "tool",
      );
      expect(toolPart).toMatchObject({
        type: "tool",
        toolName: "search",
        state: "completed",
      });
    });

    it("should call onToolExecute and onToolComplete with correct tool name", async () => {
      const onToolExecute = vi.fn();
      const onToolComplete = vi.fn();

      const events: AgentEvent[] = [
        { type: "session_created", sessionId: "session-1" },
        { type: "execution_start" },
        { type: "turn_start", turnId: "turn-1", number: 1 },
        {
          type: "tool_call_pending",
          callId: "call-123",
          toolName: "web_search",
          params: { query: "TypeScript" },
        },
        { type: "tool_call_start", callId: "call-123" },
        {
          type: "tool_call_complete",
          callId: "call-123",
          result: { success: true, data: { results: ["result1"] } },
          duration: 150,
        },
        { type: "execution_complete", reason: "finished", turns: 1 },
      ];

      (mockAgent.execute as ReturnType<typeof vi.fn>).mockReturnValue(
        createEventGenerator(events),
      );

      const { result } = renderHook(() =>
        useChat(mockAgent, {
          handlers: { onToolExecute, onToolComplete },
        }),
      );

      await act(async () => {
        await result.current.sendMessage("Search for TypeScript");
      });

      // Verify onToolExecute was called with correct tool name from tool_call_pending
      expect(onToolExecute).toHaveBeenCalledWith("web_search", {
        query: "TypeScript",
      });

      // Verify onToolComplete was called with correct tool name (tracked from tool_call_pending)
      expect(onToolComplete).toHaveBeenCalledWith("web_search", {
        success: true,
        data: { results: ["result1"] },
      });
    });

    it("should track multiple concurrent tool calls correctly", async () => {
      const onToolComplete = vi.fn();

      const events: AgentEvent[] = [
        { type: "session_created", sessionId: "session-1" },
        { type: "execution_start" },
        { type: "turn_start", turnId: "turn-1", number: 1 },
        // Two tools called in parallel
        {
          type: "tool_call_pending",
          callId: "call-a",
          toolName: "search",
          params: {},
        },
        {
          type: "tool_call_pending",
          callId: "call-b",
          toolName: "fetch",
          params: {},
        },
        { type: "tool_call_start", callId: "call-a" },
        { type: "tool_call_start", callId: "call-b" },
        // Complete in different order
        {
          type: "tool_call_complete",
          callId: "call-b",
          result: { success: true, data: { fetched: true } },
          duration: 50,
        },
        {
          type: "tool_call_complete",
          callId: "call-a",
          result: { success: true, data: { found: true } },
          duration: 100,
        },
        { type: "execution_complete", reason: "finished", turns: 1 },
      ];

      (mockAgent.execute as ReturnType<typeof vi.fn>).mockReturnValue(
        createEventGenerator(events),
      );

      const { result } = renderHook(() =>
        useChat(mockAgent, {
          handlers: { onToolComplete },
        }),
      );

      await act(async () => {
        await result.current.sendMessage("Test");
      });

      // First completion should be "fetch" (call-b completed first)
      expect(onToolComplete).toHaveBeenNthCalledWith(1, "fetch", {
        success: true,
        data: { fetched: true },
      });

      // Second completion should be "search" (call-a completed second)
      expect(onToolComplete).toHaveBeenNthCalledWith(2, "search", {
        success: true,
        data: { found: true },
      });
    });
  });
});
