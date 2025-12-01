import type { AgentEvent, AIPex } from "@aipexstudio/aipex-core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatAdapter } from "../adapters/chat-adapter";
import type { ChatConfig, ChatStatus, ContextItem, UIMessage } from "../types";

export interface UseChatOptions {
  /** Chat configuration */
  config?: ChatConfig;
  /** Event handlers */
  handlers?: ChatbotEventHandlers;
}

export interface ChatbotEventHandlers {
  /** Called when a message is sent */
  onMessageSent?: (message: UIMessage) => void;
  /** Called when a response is received */
  onResponseReceived?: (message: UIMessage) => void;
  /** Called when an error occurs */
  onError?: (error: Error) => void;
  /** Called when status changes */
  onStatusChange?: (status: ChatStatus) => void;
  /** Called when a tool is executed */
  onToolExecute?: (toolName: string, input: unknown) => void;
  /** Called when a tool completes */
  onToolComplete?: (toolName: string, result: unknown) => void;
}

export interface UseChatReturn {
  /** Current messages */
  messages: UIMessage[];
  /** Current chat status */
  status: ChatStatus;
  /** Current session ID */
  sessionId: string | null;
  /** Send a new message */
  sendMessage: (
    text: string,
    files?: File[],
    contexts?: ContextItem[],
  ) => Promise<void>;
  /** Continue the conversation */
  continueConversation: (text: string) => Promise<void>;
  /** Interrupt current operation */
  interrupt: () => Promise<void>;
  /** Reset the chat */
  reset: () => void;
  /** Regenerate last response */
  regenerate: () => Promise<void>;
  /** Set messages directly */
  setMessages: (messages: UIMessage[]) => void;
}

/**
 * useChat - A headless hook for managing chat state with an AIPex agent
 *
 * This hook provides all the state and actions needed to build a chat UI,
 * without any rendering logic. It uses the ChatAdapter to convert
 * AgentEvents into UIMessages.
 *
 * @example
 * ```tsx
 * const agent = AIPex.create({ model, tools });
 *
 * function MyChatUI() {
 *   const {
 *     messages,
 *     status,
 *     sendMessage,
 *     interrupt,
 *     reset
 *   } = useChat(agent);
 *
 *   return (
 *     <div>
 *       {messages.map(m => <Message key={m.id} message={m} />)}
 *       <Input onSubmit={sendMessage} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useChat(
  agent: AIPex | undefined,
  options: UseChatOptions = {},
): UseChatReturn {
  const { config, handlers } = options;

  // State
  const [messages, setMessages] = useState<UIMessage[]>(
    config?.initialMessages ?? [],
  );
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Refs for stable callbacks
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const configRef = useRef(config);
  configRef.current = config;

  const activeGeneratorRef = useRef<AsyncGenerator<AgentEvent> | null>(null);

  // Create adapter with callbacks
  const adapter = useMemo(() => {
    return new ChatAdapter({
      onMessagesUpdate: (newMessages) => {
        setMessages(newMessages);
        // Find the last assistant message for the callback
        const lastAssistant = newMessages
          .filter((m) => m.role === "assistant")
          .pop();
        if (lastAssistant) {
          handlersRef.current?.onResponseReceived?.(lastAssistant);
        }
      },
      onStatusChange: (newStatus) => {
        setStatus(newStatus);
        handlersRef.current?.onStatusChange?.(newStatus);
      },
    });
  }, []);

  // Initialize adapter with initial messages
  useEffect(() => {
    if (config?.initialMessages) {
      adapter.setMessages(config.initialMessages);
    }
  }, [adapter, config?.initialMessages]);

  // Process agent events
  const processAgentEvents = useCallback(
    async (eventGenerator: AsyncGenerator<AgentEvent>) => {
      activeGeneratorRef.current = eventGenerator;
      try {
        for await (const event of eventGenerator) {
          // Handle session creation
          if (
            event.type === "session_created" ||
            event.type === "session_resumed"
          ) {
            setSessionId(event.sessionId);
          }

          if (event.type === "tool_call_start") {
            handlersRef.current?.onToolExecute?.(event.toolName, event.params);
          }

          if (event.type === "tool_call_complete") {
            handlersRef.current?.onToolComplete?.(event.toolName, event.result);
          }

          if (event.type === "tool_call_error" || event.type === "error") {
            handlersRef.current?.onError?.(event.error);
          }

          // Process the event through adapter
          adapter.processEvent(event);
        }
      } catch (error) {
        handlersRef.current?.onError?.(error as Error);
        adapter.setStatus("error");
      } finally {
        if (activeGeneratorRef.current === eventGenerator) {
          activeGeneratorRef.current = null;
        }
      }
    },
    [adapter],
  );

  // Send a new message
  const sendMessage = useCallback(
    async (
      text: string,
      files?: File[],
      contexts?: ContextItem[],
    ): Promise<void> => {
      if (!agent) {
        console.warn("useChat: agent is not initialized");
        return;
      }

      if (!text.trim() && !files?.length && !contexts?.length) {
        return;
      }

      // Add user message to adapter
      const userMessage = adapter.addUserMessage(text, files, contexts);
      handlersRef.current?.onMessageSent?.(userMessage);
      adapter.setStatus("submitted");

      // Build the input text with context
      let inputText = text;
      if (contexts && contexts.length > 0) {
        const contextText = contexts
          .map((ctx) => `[${ctx.type}: ${ctx.label}]\n${ctx.value}`)
          .join("\n\n");
        inputText = `${contextText}\n\n${text}`;
      }

      const events = agent.chat(
        inputText,
        sessionId ? { sessionId } : undefined,
      );
      await processAgentEvents(events);
    },
    [adapter, agent, sessionId, processAgentEvents],
  );

  // Continue conversation (for multi-turn without creating new user message)
  const continueConversation = useCallback(
    async (text: string): Promise<void> => {
      if (!agent) {
        console.warn("useChat: agent is not initialized");
        return;
      }

      if (!sessionId) {
        // No session, start new
        await sendMessage(text);
        return;
      }

      // Add user message
      const userMessage = adapter.addUserMessage(text);
      handlersRef.current?.onMessageSent?.(userMessage);

      adapter.setStatus("submitted");

      // Continue conversation
      const events = agent.chat(text, { sessionId });
      await processAgentEvents(events);
    },
    [adapter, agent, sessionId, processAgentEvents, sendMessage],
  );

  // Interrupt current operation
  const interrupt = useCallback(async (): Promise<void> => {
    const generator = activeGeneratorRef.current;
    if (generator && typeof generator.return === "function") {
      await generator.return(undefined);
    }
    activeGeneratorRef.current = null;
    adapter.setStatus("idle");
  }, [adapter]);

  // Reset chat
  const reset = useCallback((): void => {
    if (sessionId && agent) {
      void agent.getConversationManager()?.deleteSession(sessionId);
    }
    activeGeneratorRef.current = null;
    setSessionId(null);
    adapter.reset(configRef.current?.initialMessages ?? []);
  }, [adapter, agent, sessionId]);

  // Regenerate last response
  const regenerate = useCallback(async (): Promise<void> => {
    if (!agent) {
      console.warn("useChat: agent is not initialized");
      return;
    }

    // Remove last assistant message
    const removed = adapter.removeLastAssistantMessage();
    if (!removed) return;

    // Find the last user message
    const currentMessages = adapter.getMessages();
    const lastUserMessage = currentMessages
      .filter((m) => m.role === "user")
      .pop();

    if (!lastUserMessage) return;

    // Get the text from the last user message
    const textPart = lastUserMessage.parts.find((p) => p.type === "text");
    const text = textPart?.type === "text" ? textPart.text : "";

    if (sessionId && text) {
      adapter.setStatus("submitted");
      const events = agent.chat(text, { sessionId });
      await processAgentEvents(events);
    }
  }, [adapter, agent, sessionId, processAgentEvents]);

  // Set messages directly
  const setMessagesDirectly = useCallback(
    (newMessages: UIMessage[]): void => {
      adapter.setMessages(newMessages);
    },
    [adapter],
  );

  return {
    messages,
    status,
    sessionId,
    sendMessage,
    continueConversation,
    interrupt,
    reset,
    regenerate,
    setMessages: setMessagesDirectly,
  };
}
