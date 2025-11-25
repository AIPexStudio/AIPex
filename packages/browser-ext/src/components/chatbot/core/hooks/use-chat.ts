import type { Agent, AgentEvent } from "@aipexstudio/aipex-core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatAdapter } from "../adapter";
import type {
  ChatStatus,
  ContextItem,
  UIMessage,
  UseChatOptions,
  UseChatReturn,
} from "../types";

/**
 * useChat - A headless hook for managing chat state with an Agent
 *
 * This hook provides all the state and actions needed to build a chat UI,
 * without any rendering logic. It uses the ChatAdapter to convert
 * AgentEvents into UIMessages.
 *
 * @example
 * ```tsx
 * const agent = Agent.create({ llm, tools });
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
  agent: Agent,
  options: UseChatOptions = {},
): UseChatReturn {
  const { config, handlers } = options;

  // State
  const [messages, setMessages] = useState<UIMessage[]>(
    config?.initialMessages || [],
  );
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Refs for stable callbacks
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const configRef = useRef(config);
  configRef.current = config;

  // Track tool names by callId for tool_call_complete events
  const toolCallNamesRef = useRef<Map<string, string>>(new Map());

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
      try {
        for await (const event of eventGenerator) {
          // Handle session creation
          if (event.type === "session_created") {
            setSessionId(event.sessionId);
          }

          // Handle tool events for callbacks
          if (event.type === "tool_call_pending") {
            // Store tool name by callId for later use in tool_call_complete
            toolCallNamesRef.current.set(event.callId, event.toolName);
            handlersRef.current?.onToolExecute?.(event.toolName, event.params);
          }

          if (event.type === "tool_call_complete") {
            // Retrieve tool name from our tracking map (stored during tool_call_pending)
            const toolName = toolCallNamesRef.current.get(event.callId) || "";
            handlersRef.current?.onToolComplete?.(toolName, event.result);
            // Clean up the tracking entry
            toolCallNamesRef.current.delete(event.callId);
          }

          // Process the event through adapter
          adapter.processEvent(event);
        }
      } catch (error) {
        handlersRef.current?.onError?.(error as Error);
        setStatus("error");
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
      if (!text.trim() && !files?.length && !contexts?.length) {
        return;
      }

      // Add user message to adapter
      const userMessage = adapter.addUserMessage(text, files, contexts);
      handlersRef.current?.onMessageSent?.(userMessage);

      // Build the input text with context
      let inputText = text;
      if (contexts && contexts.length > 0) {
        const contextText = contexts
          .map((ctx) => `[${ctx.type}: ${ctx.label}]\n${ctx.value}`)
          .join("\n\n");
        inputText = `${contextText}\n\n${text}`;
      }

      // Execute agent
      if (sessionId) {
        // Continue existing conversation
        const events = agent.continueConversation(sessionId, inputText);
        await processAgentEvents(events);
      } else {
        // Start new conversation
        const events = agent.execute(inputText);
        await processAgentEvents(events);
      }
    },
    [adapter, agent, sessionId, processAgentEvents],
  );

  // Continue conversation (for multi-turn without creating new user message)
  const continueConversation = useCallback(
    async (text: string): Promise<void> => {
      if (!sessionId) {
        // No session, start new
        await sendMessage(text);
        return;
      }

      // Add user message
      const userMessage = adapter.addUserMessage(text);
      handlersRef.current?.onMessageSent?.(userMessage);

      // Continue conversation
      const events = agent.continueConversation(sessionId, text);
      await processAgentEvents(events);
    },
    [adapter, agent, sessionId, processAgentEvents, sendMessage],
  );

  // Interrupt current operation
  const interrupt = useCallback(async (): Promise<void> => {
    if (sessionId) {
      await agent.interrupt(sessionId);
    }
    setStatus("idle");
  }, [agent, sessionId]);

  // Reset chat
  const reset = useCallback((): void => {
    if (sessionId) {
      agent.deleteSession(sessionId);
    }
    setSessionId(null);
    adapter.reset(configRef.current?.initialMessages || []);
    // Clear tool name tracking
    toolCallNamesRef.current.clear();
  }, [adapter, agent, sessionId]);

  // Regenerate last response
  const regenerate = useCallback(async (): Promise<void> => {
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
      const events = agent.continueConversation(sessionId, text);
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
