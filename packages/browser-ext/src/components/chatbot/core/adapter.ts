import type { AgentEvent } from "@aipexstudio/aipex-core";
import { generateId } from "@aipexstudio/aipex-core";
import type {
  ChatAdapterOptions,
  ChatAdapterState,
  ChatStatus,
  ContextItem,
  UIContextPart,
  UIFilePart,
  UIMessage,
  UIPart,
  UIReasoningPart,
  UITextPart,
  UIToolPart,
} from "./types";

/**
 * ChatAdapter converts AgentEvents from @aipexstudio/aipex-core into UIMessages
 * for rendering in the chat UI.
 *
 * This adapter bridges the gap between the core agent's event-based streaming
 * and the UI's message-based rendering model.
 */
export class ChatAdapter {
  private state: ChatAdapterState = {
    messages: [],
    currentAssistantMessageId: null,
    status: "idle",
  };

  private options: ChatAdapterOptions;

  constructor(options: ChatAdapterOptions = {}) {
    this.options = options;
  }

  /**
   * Get the current messages
   */
  getMessages(): UIMessage[] {
    return [...this.state.messages];
  }

  /**
   * Get the current status
   */
  getStatus(): ChatStatus {
    return this.state.status;
  }

  /**
   * Set messages directly (for initialization or reset)
   */
  setMessages(messages: UIMessage[]): void {
    this.state.messages = [...messages];
    this.options.onMessagesUpdate?.(this.state.messages);
  }

  /**
   * Add a user message to the conversation
   */
  addUserMessage(
    text: string,
    files?: File[],
    contexts?: ContextItem[],
  ): UIMessage {
    const parts: UIPart[] = [];

    // Add context parts first
    if (contexts && contexts.length > 0) {
      for (const ctx of contexts) {
        parts.push({
          type: "context",
          contextType: ctx.type,
          label: ctx.label,
          value: ctx.value,
          metadata: ctx.metadata,
        } as UIContextPart);
      }
    }

    // Add text part
    if (text.trim()) {
      parts.push({
        type: "text",
        text: text.trim(),
      } as UITextPart);
    }

    // Add file parts
    if (files && files.length > 0) {
      for (const file of files) {
        parts.push({
          type: "file",
          mediaType: file.type,
          filename: file.name,
          url: URL.createObjectURL(file),
        } as UIFilePart);
      }
    }

    const userMessage: UIMessage = {
      id: generateId(),
      role: "user",
      parts,
      timestamp: Date.now(),
    };

    this.state.messages = [...this.state.messages, userMessage];
    this.options.onMessagesUpdate?.(this.state.messages);

    return userMessage;
  }

  /**
   * Process an AgentEvent and update the UI state accordingly
   */
  processEvent(event: AgentEvent): void {
    switch (event.type) {
      case "session_created":
        // Session created, nothing to do for UI
        break;

      case "execution_start":
        this.setStatus("submitted");
        break;

      case "turn_start":
        // Create a new assistant message for this turn
        this.createAssistantMessage();
        break;

      case "llm_stream_start":
        this.setStatus("streaming");
        break;

      case "content_delta":
        this.appendContentDelta(event.delta);
        break;

      case "thinking_delta":
        this.appendThinkingDelta(event.delta);
        break;

      case "llm_stream_end":
        // LLM streaming complete, but might have tools to execute
        break;

      case "tool_call_pending":
        this.addToolCall(event.callId, event.toolName, event.params);
        this.setStatus("executing_tools");
        break;

      case "tool_call_start":
        this.updateToolState(event.callId, "executing");
        break;

      case "tool_output_stream":
        // Tool streaming output - could be used for progress updates
        break;

      case "tool_call_complete":
        this.updateToolComplete(event.callId, event.result, event.duration);
        break;

      case "tool_call_error":
        this.updateToolError(event.callId, event.error);
        break;

      case "turn_complete":
        // Turn complete, check if we should continue
        if (!event.shouldContinue) {
          this.setStatus("idle");
        }
        this.state.currentAssistantMessageId = null;
        break;

      case "execution_complete":
        this.setStatus("idle");
        this.state.currentAssistantMessageId = null;
        break;

      case "execution_error":
        this.setStatus("error");
        this.state.currentAssistantMessageId = null;
        break;

      case "rate_limit":
        // Rate limit info - could show a warning to user
        break;
    }
  }

  /**
   * Reset the adapter state
   */
  reset(initialMessages: UIMessage[] = []): void {
    this.state = {
      messages: [...initialMessages],
      currentAssistantMessageId: null,
      status: "idle",
    };
    this.options.onMessagesUpdate?.(this.state.messages);
    this.options.onStatusChange?.(this.state.status);
  }

  /**
   * Remove the last assistant message (for regeneration)
   */
  removeLastAssistantMessage(): UIMessage | null {
    const messages = [...this.state.messages];
    let removed: UIMessage | null = null;

    // Find and remove the last assistant message
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") {
        removed = messages[i];
        messages.splice(i, 1);
        break;
      }
    }

    if (removed) {
      this.state.messages = messages;
      this.options.onMessagesUpdate?.(this.state.messages);
    }

    return removed;
  }

  // ============ Private Methods ============

  private setStatus(status: ChatStatus): void {
    if (this.state.status !== status) {
      this.state.status = status;
      this.options.onStatusChange?.(status);
    }
  }

  private createAssistantMessage(): void {
    const assistantMessage: UIMessage = {
      id: generateId(),
      role: "assistant",
      parts: [],
      timestamp: Date.now(),
    };

    this.state.messages = [...this.state.messages, assistantMessage];
    this.state.currentAssistantMessageId = assistantMessage.id;
    this.options.onMessagesUpdate?.(this.state.messages);
  }

  private updateCurrentAssistantMessage(
    updater: (message: UIMessage) => UIMessage,
  ): void {
    const currentId = this.state.currentAssistantMessageId;
    if (!currentId) return;

    this.state.messages = this.state.messages.map((m) =>
      m.id === currentId ? updater(m) : m,
    );
    this.options.onMessagesUpdate?.(this.state.messages);
  }

  private appendContentDelta(delta: string): void {
    this.updateCurrentAssistantMessage((message) => {
      const parts = [...message.parts];

      // Find or create text part
      let textPart = parts.find((p): p is UITextPart => p.type === "text");

      if (textPart) {
        textPart = { ...textPart, text: textPart.text + delta };
        const index = parts.findIndex((p) => p.type === "text");
        parts[index] = textPart;
      } else {
        parts.push({ type: "text", text: delta });
      }

      return { ...message, parts };
    });
  }

  private appendThinkingDelta(delta: string): void {
    this.updateCurrentAssistantMessage((message) => {
      const parts = [...message.parts];

      // Find or create reasoning part
      let reasoningPart = parts.find(
        (p): p is UIReasoningPart => p.type === "reasoning",
      );

      if (reasoningPart) {
        reasoningPart = { ...reasoningPart, text: reasoningPart.text + delta };
        const index = parts.findIndex((p) => p.type === "reasoning");
        parts[index] = reasoningPart;
      } else {
        // Insert reasoning at the beginning
        parts.unshift({ type: "reasoning", text: delta });
      }

      return { ...message, parts };
    });
  }

  private addToolCall(
    callId: string,
    toolName: string,
    params: Record<string, unknown>,
  ): void {
    this.updateCurrentAssistantMessage((message) => {
      const parts = [...message.parts];

      const toolPart: UIToolPart = {
        type: "tool",
        toolCallId: callId,
        toolName,
        input: params,
        state: "pending",
      };

      parts.push(toolPart);

      return { ...message, parts };
    });
  }

  private updateToolState(callId: string, state: UIToolPart["state"]): void {
    this.updateCurrentAssistantMessage((message) => {
      const parts = message.parts.map((p) => {
        if (p.type === "tool" && p.toolCallId === callId) {
          return { ...p, state };
        }
        return p;
      });

      return { ...message, parts };
    });
  }

  private updateToolComplete(
    callId: string,
    result: { success: boolean; data?: unknown; error?: string },
    duration: number,
  ): void {
    this.updateCurrentAssistantMessage((message) => {
      const parts = message.parts.map((p) => {
        if (p.type === "tool" && p.toolCallId === callId) {
          return {
            ...p,
            state: "completed" as const,
            output: result.data,
            duration,
          };
        }
        return p;
      });

      return { ...message, parts };
    });
  }

  private updateToolError(callId: string, error: Error): void {
    this.updateCurrentAssistantMessage((message) => {
      const parts = message.parts.map((p) => {
        if (p.type === "tool" && p.toolCallId === callId) {
          return {
            ...p,
            state: "error" as const,
            errorText: error.message,
          };
        }
        return p;
      });

      return { ...message, parts };
    });
  }
}

/**
 * Create a new ChatAdapter instance
 */
export function createChatAdapter(
  options: ChatAdapterOptions = {},
): ChatAdapter {
  return new ChatAdapter(options);
}
