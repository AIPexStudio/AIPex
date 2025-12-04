import type { AgentEvent, AIPex } from "@aipexstudio/aipex-core";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useChat } from "./use-chat";

const baseMetrics = {
  tokensUsed: 0,
  promptTokens: 0,
  completionTokens: 0,
  itemCount: 0,
  maxTurns: 10,
  duration: 0,
  startTime: 0,
};

function createExecutionCompleteEvent(): AgentEvent {
  return {
    type: "execution_complete",
    finalOutput: "",
    metrics: { ...baseMetrics, startTime: Date.now() },
  };
}

function createEventGenerator(
  events: AgentEvent[],
): AsyncGenerator<AgentEvent> & { return: ReturnType<typeof vi.fn> } {
  let index = 0;
  const generator: AsyncGenerator<AgentEvent> & {
    return: ReturnType<typeof vi.fn>;
  } = {
    async next() {
      if (index < events.length) {
        return { value: events[index++]!, done: false };
      }
      return { value: undefined, done: true } as IteratorReturnResult<any>;
    },
    return: vi.fn(
      async () =>
        ({ value: undefined, done: true }) as IteratorReturnResult<any>,
    ),
    async throw(error) {
      throw error;
    },
    [Symbol.asyncIterator]() {
      return this;
    },
    async [Symbol.asyncDispose]() {
      // No-op for test
    },
  };

  return generator;
}

function createThrowingGenerator(
  error: Error,
): AsyncGenerator<AgentEvent> & { return: ReturnType<typeof vi.fn> } {
  const generator: AsyncGenerator<AgentEvent> & {
    return: ReturnType<typeof vi.fn>;
  } = {
    async next() {
      throw error;
    },
    return: vi.fn(
      async () =>
        ({ value: undefined, done: true }) as IteratorReturnResult<any>,
    ),
    async throw(err) {
      throw err;
    },
    [Symbol.asyncIterator]() {
      return this;
    },
    async [Symbol.asyncDispose]() {
      // No-op for test
    },
  };

  return generator;
}

function createStreamingGenerator(): AsyncGenerator<AgentEvent> & {
  return: ReturnType<typeof vi.fn>;
} {
  let yieldedSession = false;
  let resolvePending: ((value: IteratorResult<AgentEvent>) => void) | null =
    null;
  const generator: AsyncGenerator<AgentEvent> & {
    return: ReturnType<typeof vi.fn>;
  } = {
    async next() {
      if (!yieldedSession) {
        yieldedSession = true;
        return {
          value: { type: "session_created", sessionId: "session-1" },
          done: false,
        };
      }
      return new Promise<IteratorResult<AgentEvent>>((resolve) => {
        resolvePending = resolve;
      });
    },
    return: vi.fn(
      async () =>
        ({ value: undefined, done: true }) as IteratorReturnResult<any>,
    ),
    async throw(error) {
      throw error;
    },
    [Symbol.asyncIterator]() {
      return this;
    },
    async [Symbol.asyncDispose]() {
      // No-op for test
    },
  };

  generator.return.mockImplementation(async () => {
    if (resolvePending) {
      resolvePending({
        value: undefined,
        done: true,
      } as IteratorReturnResult<any>);
      resolvePending = null;
    }
    return { value: undefined, done: true };
  });

  return generator;
}

function setupMockAgent(): {
  agent: AIPex;
  conversationManager: { deleteSession: ReturnType<typeof vi.fn> };
} {
  const conversationManager = {
    deleteSession: vi.fn(),
  };

  const agent = {
    chat: vi.fn(),
    getConversationManager: vi.fn(() => conversationManager),
  } as unknown as AIPex;

  return { agent, conversationManager };
}

const defaultEvents: AgentEvent[] = [
  { type: "session_created", sessionId: "session-1" },
  { type: "content_delta", delta: "Hello" },
  createExecutionCompleteEvent(),
];

function setupDefaultAgent() {
  const setup = setupMockAgent();
  (setup.agent.chat as ReturnType<typeof vi.fn>).mockReturnValue(
    createEventGenerator(defaultEvents),
  );
  return setup;
}

describe("useChat", () => {
  async function renderUseChat(
    agent: AIPex,
    options?: Parameters<typeof useChat>[1],
  ) {
    const rendered = renderHook(() => useChat(agent, options));
    await waitFor(() => {
      expect(rendered.result.current).not.toBeNull();
    });
    return rendered;
  }

  it("should send a message and update session id", async () => {
    const { agent } = setupDefaultAgent();
    const { result } = await renderUseChat(agent);

    await act(async () => {
      await result.current.sendMessage("Hi there");
    });

    expect(agent.chat).toHaveBeenCalledWith("Hi there", {
      sessionId: undefined,
      contexts: undefined,
    });
    expect(result.current.sessionId).toBe("session-1");
    expect(result.current.messages[0].role).toBe("user");
  });

  it("should not send empty messages", async () => {
    const { agent } = setupDefaultAgent();
    const { result } = await renderUseChat(agent);

    await act(async () => {
      await result.current.sendMessage("   ");
    });

    expect(agent.chat).not.toHaveBeenCalled();
  });

  it("should continue an existing conversation with session id", async () => {
    const { agent } = setupDefaultAgent();
    (agent.chat as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(
        createEventGenerator([
          { type: "session_created", sessionId: "session-1" },
          createExecutionCompleteEvent(),
        ]),
      )
      .mockReturnValueOnce(
        createEventGenerator([
          { type: "session_resumed", sessionId: "session-1", itemCount: 2 },
          createExecutionCompleteEvent(),
        ]),
      );

    const { result } = await renderUseChat(agent);

    await act(async () => {
      await result.current.sendMessage("Hello");
    });

    await act(async () => {
      await result.current.continueConversation("Follow up");
    });

    expect(agent.chat).toHaveBeenLastCalledWith("Follow up", {
      sessionId: "session-1",
    });
  });

  it("should interrupt an active stream", async () => {
    const { agent } = setupDefaultAgent();
    const streamingGenerator = createStreamingGenerator();
    (agent.chat as ReturnType<typeof vi.fn>).mockReturnValue(
      streamingGenerator,
    );

    const { result } = await renderUseChat(agent);
    let sendPromise: Promise<void> | null = null;

    await act(async () => {
      sendPromise = result.current.sendMessage("Processing");
    });

    await act(async () => {
      await result.current.interrupt();
    });

    expect(sendPromise).not.toBeNull();

    await act(async () => {
      await sendPromise!;
    });

    expect(streamingGenerator.return).toHaveBeenCalled();
    expect(result.current.status).toBe("idle");
  });

  it("should reset chat state and delete the session", async () => {
    const { agent, conversationManager } = setupDefaultAgent();
    const { result } = await renderUseChat(agent);

    await act(async () => {
      await result.current.sendMessage("Hello");
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.sessionId).toBeNull();
    expect(conversationManager.deleteSession).toHaveBeenCalledWith("session-1");
  });

  it("should call message handlers", async () => {
    const onMessageSent = vi.fn();
    const onResponseReceived = vi.fn();
    const { agent } = setupDefaultAgent();
    const { result } = await renderUseChat(agent, {
      handlers: { onMessageSent, onResponseReceived },
    });

    await act(async () => {
      await result.current.sendMessage("Hello");
    });

    expect(onMessageSent).toHaveBeenCalled();
    expect(onResponseReceived).toHaveBeenCalled();
  });

  it("should notify tool handlers for tool events", async () => {
    const { agent } = setupDefaultAgent();
    (agent.chat as ReturnType<typeof vi.fn>).mockReturnValue(
      createEventGenerator([
        { type: "session_created", sessionId: "session-1" },
        { type: "tool_call_start", toolName: "search", params: { q: "ts" } },
        {
          type: "tool_call_complete",
          toolName: "search",
          result: { success: true },
        },
        createExecutionCompleteEvent(),
      ]),
    );

    const onToolExecute = vi.fn();
    const onToolComplete = vi.fn();

    const { result } = await renderUseChat(agent, {
      handlers: { onToolExecute, onToolComplete },
    });

    await act(async () => {
      await result.current.sendMessage("Search something");
    });

    expect(onToolExecute).toHaveBeenCalledWith("search", { q: "ts" });
    expect(onToolComplete).toHaveBeenCalledWith("search", { success: true });
  });

  it("should regenerate the last response", async () => {
    const { agent } = setupDefaultAgent();
    (agent.chat as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(
        createEventGenerator([
          { type: "session_created", sessionId: "session-1" },
          { type: "content_delta", delta: "First response" },
          createExecutionCompleteEvent(),
        ]),
      )
      .mockReturnValueOnce(
        createEventGenerator([
          { type: "session_resumed", sessionId: "session-1", itemCount: 2 },
          { type: "content_delta", delta: "Regenerated response" },
          createExecutionCompleteEvent(),
        ]),
      );

    const { result } = await renderUseChat(agent);

    await act(async () => {
      await result.current.sendMessage("Hello");
    });

    await act(async () => {
      await result.current.regenerate();
    });

    expect(agent.chat).toHaveBeenNthCalledWith(2, "Hello", {
      sessionId: "session-1",
    });
  });

  it("should include context items in user message", async () => {
    const { agent } = setupDefaultAgent();
    const { result } = await renderUseChat(agent);
    const contexts = [
      { id: "ctx-1", type: "page" as const, label: "Page", value: "Content" },
    ];

    await act(async () => {
      await result.current.sendMessage("Summarize", undefined, contexts);
    });

    expect(result.current.messages[0].parts[0].type).toBe("context");
  });

  it("should call onError when the generator throws", async () => {
    const testError = new Error("boom");
    const { agent } = setupDefaultAgent();
    (agent.chat as ReturnType<typeof vi.fn>).mockImplementationOnce(() =>
      createThrowingGenerator(testError),
    );

    const onError = vi.fn();
    const { result } = await renderUseChat(agent, { handlers: { onError } });

    await act(async () => {
      await result.current.sendMessage("Hello");
    });

    expect(onError).toHaveBeenCalledWith(testError);
    expect(result.current.status).toBe("error");
  });

  it("should add tool call parts to assistant messages", async () => {
    const { agent } = setupDefaultAgent();
    (agent.chat as ReturnType<typeof vi.fn>).mockReturnValue(
      createEventGenerator([
        { type: "session_created", sessionId: "session-1" },
        { type: "tool_call_start", toolName: "fetch", params: { url: "x" } },
        {
          type: "tool_call_complete",
          toolName: "fetch",
          result: { ok: true },
        },
        createExecutionCompleteEvent(),
      ]),
    );

    const { result } = await renderUseChat(agent);

    await act(async () => {
      await result.current.sendMessage("Fetch data");
    });

    const assistantMessage = result.current.messages.find(
      (message) => message.role === "assistant",
    );
    const toolPart = assistantMessage?.parts.find(
      (part) => part.type === "tool",
    );
    expect(toolPart).toMatchObject({
      type: "tool",
      toolName: "fetch",
      state: "completed",
    });
  });
});
