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
  UITextPart,
  UIToolPart,
} from "../types";

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

  private pendingToolCalls = new Map<string, string[]>();
  private fileObjectUrls = new Map<string, string[]>();
  private toolsAddedSinceLastText = false;

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
    this.reconcileFileObjectUrls(messages);
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
    const fileUrls: string[] = [];

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
        const objectUrl = URL.createObjectURL(file);
        parts.push({
          type: "file",
          mediaType: file.type,
          filename: file.name,
          url: objectUrl,
        } as UIFilePart);
        fileUrls.push(objectUrl);
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

    if (fileUrls.length > 0) {
      this.fileObjectUrls.set(userMessage.id, fileUrls);
    }

    return userMessage;
  }

  /**
   * Process an AgentEvent and update the UI state accordingly
   */
  processEvent(event: AgentEvent): void {
    switch (event.type) {
      case "session_created":
      case "session_resumed":
      case "metrics_update":
        break;

      case "content_delta":
        this.ensureAssistantMessage();
        this.updateStatus("streaming");
        this.appendContentDelta(event.delta);
        break;

      case "tool_call_args_streaming_start":
        this.ensureAssistantMessage();
        this.ensurePendingToolCall(event.toolName, {});
        this.updateStatus("streaming");
        break;

      case "tool_call_args_streaming_complete":
        this.ensureAssistantMessage();
        this.ensurePendingToolCall(event.toolName, event.params);
        break;

      case "tool_call_start":
        this.ensureAssistantMessage();
        if (!this.startExistingToolCall(event.toolName, event.params)) {
          this.addToolCall(event.toolName, event.params);
        }
        this.updateStatus("executing_tools");
        break;

      case "tool_call_complete":
        this.updateToolComplete(event.toolName, event.result);
        this.updateStatus("streaming");
        break;

      case "tool_call_error":
        this.updateToolError(event.toolName, event.error);
        this.updateStatus("error");
        break;

      case "execution_complete":
        this.updateStatus("idle");
        this.state.currentAssistantMessageId = null;
        break;

      case "error":
        this.updateStatus("error");
        this.state.currentAssistantMessageId = null;
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
    this.pendingToolCalls.clear();
    this.toolsAddedSinceLastText = false;
    this.clearFileObjectUrls();
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
      const message = messages[i];
      if (message && message.role === "assistant") {
        removed = message;
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

  public setStatus(status: ChatStatus): void {
    this.updateStatus(status);
  }

  private updateStatus(status: ChatStatus): void {
    if (this.state.status !== status) {
      this.state.status = status;
      this.options.onStatusChange?.(status);
    }
  }

  private ensureAssistantMessage(): void {
    if (this.state.currentAssistantMessageId) {
      return;
    }

    const assistantMessage: UIMessage = {
      id: generateId(),
      role: "assistant",
      parts: [],
      timestamp: Date.now(),
    };

    this.state.messages = [...this.state.messages, assistantMessage];
    this.state.currentAssistantMessageId = assistantMessage.id;
    this.toolsAddedSinceLastText = false;
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

      // If tools were added since last text, create a new text part for interleaving
      if (this.toolsAddedSinceLastText) {
        parts.push({ type: "text", text: delta });
        this.toolsAddedSinceLastText = false;
      } else {
        // Find the last text part (not the first) to append to it
        let textPartIndex = -1;
        for (let i = parts.length - 1; i >= 0; i--) {
          if (parts[i]?.type === "text") {
            textPartIndex = i;
            break;
          }
        }

        if (textPartIndex >= 0) {
          const textPart = parts[textPartIndex] as UITextPart;
          parts[textPartIndex] = { ...textPart, text: textPart.text + delta };
        } else {
          parts.push({ type: "text", text: delta });
        }
      }

      return { ...message, parts };
    });
  }

  private addToolCall(toolName: string, params: unknown): void {
    const callId = this.queueToolCall(toolName);

    this.updateCurrentAssistantMessage((message) => {
      const parts = [...message.parts];

      const toolPart: UIToolPart = {
        type: "tool",
        toolCallId: callId,
        toolName,
        input: params,
        state: "executing",
      };

      parts.push(toolPart);

      return { ...message, parts };
    });

    // Mark that tools were added, so next text creates a new part
    this.toolsAddedSinceLastText = true;
  }

  private ensurePendingToolCall(toolName: string, params: unknown): void {
    const existingCallId = this.findPendingToolCallId(toolName);
    if (existingCallId) {
      this.updateToolPart(existingCallId, (toolPart) => ({
        ...toolPart,
        toolName,
        input: params,
      }));
      return;
    }

    const callId = this.queueToolCall(toolName);
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

    this.toolsAddedSinceLastText = true;
  }

  private startExistingToolCall(toolName: string, params: unknown): boolean {
    const callId = this.findPendingToolCallId(toolName);
    if (!callId) {
      return false;
    }

    this.updateToolPart(callId, (toolPart) => ({
      ...toolPart,
      toolName,
      input: params,
      state: "executing",
    }));
    this.toolsAddedSinceLastText = true;
    return true;
  }

  private findPendingToolCallId(toolName: string): string | undefined {
    const queue = this.pendingToolCalls.get(toolName);
    if (!queue || queue.length === 0) {
      return undefined;
    }

    const currentId = this.state.currentAssistantMessageId;
    if (!currentId) {
      return undefined;
    }
    const message = this.state.messages.find((m) => m.id === currentId);
    if (!message) {
      return undefined;
    }

    for (const callId of queue) {
      const toolPart = message.parts.find(
        (part): part is UIToolPart =>
          part.type === "tool" && part.toolCallId === callId,
      );
      if (toolPart?.state === "pending") {
        return callId;
      }
    }

    return undefined;
  }

  private updateToolComplete(toolName: string, result: unknown): void {
    const callId = this.dequeueToolCall(toolName);
    if (!callId) {
      return;
    }
    this.updateToolPart(callId, (toolPart) => ({
      ...toolPart,
      state: "completed",
      output: result,
    }));
  }

  private updateToolError(toolName: string, error: Error): void {
    const callId = this.dequeueToolCall(toolName);
    if (!callId) {
      return;
    }
    this.updateToolPart(callId, (toolPart) => ({
      ...toolPart,
      state: "error",
      errorText: error.message,
    }));
  }

  private updateToolPart(
    callId: string,
    updater: (part: UIToolPart) => UIToolPart,
  ): void {
    this.updateCurrentAssistantMessage((message) => {
      const parts = message.parts.map((part) => {
        if (part.type === "tool" && part.toolCallId === callId) {
          return updater(part);
        }
        return part;
      });

      return { ...message, parts };
    });
  }

  private queueToolCall(toolName: string): string {
    const callId = generateId();
    const queue = this.pendingToolCalls.get(toolName) ?? [];
    queue.push(callId);
    this.pendingToolCalls.set(toolName, queue);
    return callId;
  }

  private dequeueToolCall(toolName: string): string | undefined {
    const queue = this.pendingToolCalls.get(toolName);
    if (!queue || queue.length === 0) {
      return undefined;
    }
    const callId = queue.shift();
    if (!queue.length) {
      this.pendingToolCalls.delete(toolName);
    } else {
      this.pendingToolCalls.set(toolName, queue);
    }
    return callId;
  }

  private clearFileObjectUrls(): void {
    for (const urls of this.fileObjectUrls.values()) {
      this.revokeUrls(urls);
    }
    this.fileObjectUrls.clear();
  }

  private reconcileFileObjectUrls(nextMessages: UIMessage[]): void {
    const nextIds = new Set(nextMessages.map((message) => message.id));
    for (const [messageId, urls] of this.fileObjectUrls.entries()) {
      if (!nextIds.has(messageId)) {
        this.revokeUrls(urls);
        this.fileObjectUrls.delete(messageId);
      }
    }
  }

  private revokeUrls(urls: string[]): void {
    for (const url of urls) {
      if (
        typeof URL !== "undefined" &&
        typeof URL.revokeObjectURL === "function"
      ) {
        URL.revokeObjectURL(url);
      }
    }
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
