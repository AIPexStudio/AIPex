import { browserMcpClient } from "~/mcp/client";
import { CancellationError, CancellationToken } from "./cancellation-token";
import type { UIMessage, UITextPart, UIToolPart, UIFilePart, UIContextPart } from "./types";
import type { AITool } from "~/lib/services/tool-registry";
import type { FileUIPart } from "ai";
import type { ContextItem } from "@/components/ai-elements/prompt-input";

export type ChatStatus = "idle" | "submitted" | "streaming" | "error";
export type EventType = "messages_updated" | "status_changed" | "queue_changed";
type Subscriber = (data: any) => void;

export interface MessageHandlerConfig {
  // Initial state
  initialMessages?: UIMessage[];
  initialModel?: string;
  initialTools?: AITool[];
  initialAiHost?: string;
  initialAiToken?: string;
}

export class MessageHandler {
  // Core state
  private initialMessages: UIMessage[] = [];
  private messages: UIMessage[] = [];
  private messageQueue: UIMessage[] = [];
  private status: ChatStatus = "idle";
  private isProcessing = false;
  private processingToken: CancellationToken | null = null;

  // Config
  private model: string;
  private tools: AITool[];
  private aiHost: string;
  private aiToken: string;
  // Pub/Sub
  private subscribers: Map<EventType, Set<Subscriber>> = new Map();

  // Streaming helpers
  private pendingCharsRef: { current: string[] } = { current: [] };
  private rafIdRef: { current: number | null } = { current: null };

  constructor(config: MessageHandlerConfig) {
    this.initialMessages = config.initialMessages || [];
    this.messages = config.initialMessages || [];
    this.model = config.initialModel || "deepseek-chat";
    this.tools = config.initialTools || [];
    this.aiHost = config.initialAiHost || "https://api.deepseek.com/chat/completions";
    this.aiToken = config.initialAiToken || "";
  }

  // --- Pub/Sub Methods ---
  public subscribe(event: EventType, callback: Subscriber): () => void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    const eventSubscribers = this.subscribers.get(event);
    if (eventSubscribers) {
      eventSubscribers.add(callback);
    }

    // Return an unsubscribe function
    return () => this.unsubscribe(event, callback);
  }

  public unsubscribe(event: EventType, callback: Subscriber): void {
    const eventSubscribers = this.subscribers.get(event);
    if (eventSubscribers) {
      eventSubscribers.delete(callback);
    }
  }

  private _emit(event: EventType, data: any): void {
    const eventSubscribers = this.subscribers.get(event);
    if (eventSubscribers) {
      eventSubscribers.forEach((callback) => {
        try {
          callback(data);
        } catch (e) {
          console.error(`[MessageHandler] Error in subscriber for event "${event}":`, e);
        }
      });
    }
  }

  // --- State Updaters ---
  private setStatus(newStatus: ChatStatus): void {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this._emit("status_changed", this.status);
    }
  }

  private setMessages(newMessages: UIMessage[] | ((prev: UIMessage[]) => UIMessage[])): void {
    if (typeof newMessages === "function") {
      this.messages = newMessages(this.messages);
    } else {
      this.messages = newMessages;
    }
    this._emit("messages_updated", [...this.messages]);
  }

  private setMessageQueue(newQueue: UIMessage[]): void {
    this.messageQueue = newQueue;
    this._emit("queue_changed", [...this.messageQueue]);
  }

  // --- Public Getters ---
  public getMessages(): UIMessage[] {
    return [...this.messages];
  }

  public getStatus(): ChatStatus {
    return this.status;
  }

  public getQueue(): UIMessage[] {
    return [...this.messageQueue];
  }

  // --- Configuration Updates ---
  public updateConfig(config: Partial<MessageHandlerConfig>): void {
    if (config.initialMessages) {
      this.initialMessages = config.initialMessages;
    }
    if (config.initialModel) {
      this.model = config.initialModel;
    }
    if (config.initialTools) {
      this.tools = config.initialTools;
    }
    if (config.initialAiHost) {
      this.aiHost = config.initialAiHost;
    }
    if (config.initialAiToken) {
      this.aiToken = config.initialAiToken;
    }
  }

  // --- Core Logic ---
  public sendMessage(text: string, files?: FileUIPart[], contexts?: ContextItem[]): void {
    if (!text.trim() && (!files || files.length === 0) && (!contexts || contexts.length === 0)) return;

    const parts: (UITextPart | UIFilePart | UIContextPart)[] = [];

    // Add context parts if present (add first so they appear before text)
    if (contexts && contexts.length > 0) {
      contexts.forEach(ctx => {
        parts.push({
          type: "context",
          contextType: ctx.type,
          label: ctx.label,
          value: ctx.value,
          metadata: ctx.metadata,
        });
      });
    }

    // Add text part if present
    if (text.trim()) {
      parts.push({ type: "text", text: text.trim() });
    }

    // Add file parts if present
    if (files && files.length > 0) {
      files.forEach(file => {
        parts.push({
          type: "file",
          mediaType: file.mediaType,
          filename: file.filename,
          url: file.url,
        });
      });
    }

    const userMessage: UIMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      parts,
    };

    if (this.isProcessing) {
      this.messageQueue.push(userMessage);
      this.setMessageQueue([...this.messageQueue]);
      return;
    }

    // Add message directly and start processing
    this.setMessages((prev) => [...prev, userMessage]);
    // Use setTimeout to ensure the UI has time to update before processing
    setTimeout(() => this._processNextAction(), 0);
  }

  private async _processNextAction() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    this.setStatus("submitted");

    // Create a new cancellation token for this processing cycle
    this.processingToken = new CancellationToken();

    try {
      // Safety counter to prevent infinite loops
      const MAX_ITERATIONS = 1000;
      let iterationCount = 0;

      // eslint-disable-next-line no-constant-condition
      while (true) {
        // Check cancellation
        if (this.processingToken.isCancelled) {
          console.log("[MessageHandler] Processing cancelled");
          break;
        }

        // Safety check: prevent infinite loops
        iterationCount++;
        if (iterationCount > MAX_ITERATIONS) {
          console.error(
            "[MessageHandler] Maximum iteration count exceeded, breaking to prevent infinite loop"
          );
          this.setStatus("error");
          break;
        }

        // Step 1: Drain the user message queue if there are new messages
        if (this.messageQueue.length > 0) {
          this.setMessages((prev) => [...prev, ...this.messageQueue]);
          this.setMessageQueue([]);
        }

        const lastMessage = this.messages[this.messages.length - 1];

        // Step 2: Decide what to do based on the last message
        if (!lastMessage) {
          console.log("[MessageHandler] No last message, breaking loop");
          break; // Nothing to do
        }

        console.log(
          "[MessageHandler] Processing last message:",
          lastMessage.role,
          "parts:",
          lastMessage.parts.map((p) => ({
            type: p.type,
            state: p.type === "tool" ? p.state : undefined,
          }))
        );

        // Case 1: Last message is from user or a tool result -> call LLM
        if (lastMessage.role === "user" || lastMessage.role === "tool") {
          await this._startStream(this.messages);
          // After streaming, the new assistant message is the last one.
          // The loop will continue on the next iteration to check it for tools.
          continue;
        }

        // Case 2: Last message is from assistant -> check for tools to run
        if (lastMessage.role === "assistant") {
          const pendingTools = lastMessage.parts.filter(
            (part): part is UIToolPart => part.type === "tool" && part.state === "input-available"
          );

          if (pendingTools.length > 0) {
            console.log("[MessageHandler] Executing", pendingTools.length, "pending tools");
            await this._executeTools(lastMessage.id, pendingTools);
            console.log("[MessageHandler] Tools execution completed, continuing loop");
            // After execution, new tool messages are at the end.
            // The loop will continue, and on the next iteration, it will fall into the next condition.
            continue;
          }

          // Case 3: All tools have completed -> send results back to LLM
          const allToolParts = lastMessage.parts.filter((part) => part.type === "tool");
          const completedToolParts = allToolParts.filter(
            (part) => part.state === "output-available" || part.state === "output-error"
          );

          console.log(
            "[MessageHandler] Tool completion check:",
            "allTools:",
            allToolParts.length,
            "completed:",
            completedToolParts.length,
            "states:",
            allToolParts.map((p) => p.state)
          );

          if (allToolParts.length > 0 && allToolParts.length === completedToolParts.length) {
            console.log("[MessageHandler] All tools completed, sending results back to LLM");
            // All tools are completed, send results back to LLM
            await this._startStream(this.messages);
            continue;
          }

          // Case 4: Check for empty assistant messages (no text, no tools)
          const hasContent =
            lastMessage.parts.some((part) => part.type === "text" && part.text.trim()) ||
            allToolParts.length > 0;

          if (!hasContent) {
            console.warn(
              "[MessageHandler] Empty assistant message detected, breaking to prevent infinite loop"
            );
            break;
          }
        }

        // If we reach here, it means the last message is an assistant message with no pending tools,
        // or a terminal state. The loop can end.
        break;
      }
    } catch (e) {
      console.error("[MessageHandler] Error in processing loop:", e);
      this.setStatus("error");
    } finally {
      this.isProcessing = false;
      // Clear the processing token for this cycle
      this.processingToken = null;

      // After processing is finished, check if new messages have been queued in the meantime.
      if (this.messageQueue.length > 0) {
        // Use setTimeout to avoid deep recursion. This will start a fresh processing cycle.
        setTimeout(() => this._processNextAction(), 0);
      } else {
        this.setStatus("idle");
      }
    }
  }

  // Build OpenAI-compatible message array from UI messages
  private buildOpenAIMessages(history: UIMessage[]): any[] {
    const messages: any[] = [];

    for (let msgIndex = 0; msgIndex < history.length; msgIndex++) {
      const msg = history[msgIndex];
      if (msg.role === "assistant") {
        // Handle assistant messages with potential tool calls
        const textParts = msg.parts.filter((p): p is UITextPart => p.type === "text");
        const toolParts = msg.parts.filter((p): p is UIToolPart => p.type === "tool");

        // Check if all tools are completed (either success or error)
        const allToolsCompleted = toolParts.every(
          (part) => part.state === "output-available" || part.state === "output-error"
        );

        // Only include this assistant message if:
        // 1. It has no tools, OR
        // 2. All its tools are completed
        const shouldIncludeMessage = toolParts.length === 0 || allToolsCompleted;

        if (!shouldIncludeMessage) {
          // Skip this assistant message and all subsequent messages
          // because tools are still executing
          console.log(
            `[MessageHandler] Skipping assistant message ${msg.id} - tools not yet completed`,
            toolParts.map((p) => ({ name: p.toolName, state: p.state }))
          );
          break;
        }

        // Assistant message
        const assistantMsg: any = {
          role: "assistant",
          content: textParts.map((p) => p.text).join(""),
        };

        // Add tool calls if present
        if (toolParts.length > 0) {
          assistantMsg.tool_calls = toolParts.map((part) => ({
            id: part.toolCallId || `call_${msg.id}_${part.toolName}`,
            type: "function" as const,
            function: {
              name: part.toolName,
              arguments: JSON.stringify(part.input),
            },
          }));
        }

        messages.push(assistantMsg);

        // Add tool response messages for completed tools (both success and error)
        toolParts.forEach((part) => {
          if (part.state === "output-available") {
            messages.push({
              role: "tool",
              tool_call_id: part.toolCallId || `call_${msg.id}_${part.toolName}`,
              name: part.toolName,
              content: JSON.stringify({
                success: true,
                data: part.output,
              }),
            });
          } else if (part.state === "output-error") {
            messages.push({
              role: "tool",
              tool_call_id: part.toolCallId || `call_${msg.id}_${part.toolName}`,
              name: part.toolName,
              content: JSON.stringify({
                success: false,
                error: part.errorText || "Tool execution failed",
              }),
            });
          }
        });
      } else {
        // Handle user messages
        const textParts = msg.parts.filter((p): p is UITextPart => p.type === "text");
        const fileParts = msg.parts.filter((p): p is UIFilePart => p.type === "file");
        const contextParts = msg.parts.filter((p): p is UIContextPart => p.type === "context");

        // Add system message with contexts if present
        if (contextParts.length > 0) {
          let systemContent = "# IMPORTANT: User-Provided Context\n\n";

          contextParts.forEach((ctx, index) => {
            systemContent += `## Context ${index + 1}: ${ctx.label}\n`;
            systemContent += `- **Type**: ${ctx.contextType}\n`;

            // Add metadata information
            if (ctx.metadata) {
              if (ctx.metadata.tabId) {
                systemContent += `- **Tab ID**: ${ctx.metadata.tabId}\n`;
              }
              if (ctx.metadata.url) {
                systemContent += `- **URL**: ${ctx.metadata.url}\n`;
              }
              if (ctx.metadata.title) {
                systemContent += `- **Title**: ${ctx.metadata.title}\n`;
              }
            }

            // Add context value
            systemContent += `\n**Content**:\n\`\`\`\n${ctx.value}\n\`\`\`\n\n`;
            systemContent += "---\n\n";
          });

          messages.push({
            role: "system",
            content: systemContent,
          });
        }

        // Get user text content
        const userText = textParts.map((p) => p.text).join("");

        // If no files, use simple string content
        if (fileParts.length === 0) {
          messages.push({
            role: msg.role,
            content: userText,
          });
        } else {
          // Use multimodal content format (array of content parts)
          const contentParts: any[] = [];

          // Add text content if present
          if (userText) {
            contentParts.push({
              type: "text",
              text: userText,
            });
          }

          // Add file content (images)
          fileParts.forEach((file) => {
            // For images, use image_url format
            if (file.mediaType.startsWith("image/")) {
              contentParts.push({
                type: "image_url",
                image_url: {
                  url: file.url, // Can be data URL or hosted URL
                },
              });
            } else {
              // For other file types, add as text description
              // (OpenAI chat API primarily supports images in multimodal format)
              contentParts.push({
                type: "text",
                text: `[Attached file: ${file.filename || "file"} (${file.mediaType})]`,
              });
            }
          });

          messages.push({
            role: msg.role,
            content: contentParts,
          });
        }
      }
    }

    return messages;
  }

  // Stop current streaming request
  stopStream(options?: { preserveProcessing?: boolean }): void {
    const preserveProcessing = options?.preserveProcessing ?? false;

    // Cancel the processing token
    if (this.processingToken && !preserveProcessing) {
      this.processingToken.cancel();
    }

    // Clean up streaming animation
    this.cancelRaf();
    this.pendingCharsRef.current = [];

    // Update status and processing state
    if (!preserveProcessing) {
      // Only reset processing state if we're not preserving it
      this.isProcessing = false;

      // Set status to idle only if we were streaming
      if (this.status === "streaming" || this.status === "submitted") {
        this.setStatus("idle");
      }

      // Clear the processing token
      this.processingToken = null;
    }
  }

  /**
   * Abort all operations including streaming, tool execution, and pending tasks
   */
  abort(): void {
    console.log("[MessageHandler] Aborting all operations");

    // Cancel the processing token (cascades to all operations)
    if (this.processingToken) {
      this.processingToken.cancel();
      this.processingToken = null;
    }

    // Clear queue
    this.setMessageQueue([]);

    // Clean up streaming
    this.cancelRaf();
    this.pendingCharsRef.current = [];

    // Reset state
    this.isProcessing = false;
    this.setStatus("idle");
  }

  resetMessages(): void {
    this.setMessages(this.initialMessages);
    this.setMessageQueue([]);
  }

  // Start streaming assistant response
  private async _startStream(history: UIMessage[]): Promise<void> {
    // Stop any existing stream but keep processing flag
    this.stopStream({ preserveProcessing: true });
    this.setStatus("submitted");

    // Check if cancelled before starting
    if (this.processingToken?.isCancelled) {
      return;
    }

    try {
      const resp = await fetch(this.aiHost, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "text/event-stream",
          Authorization: `Bearer ${this.aiToken}`,
        },
        body: JSON.stringify({
          model: this.model,
          stream: true,
          messages: this.buildOpenAIMessages(history),
          ...(this.tools && this.tools.length > 0 && { tools: this.tools, tool_choice: "auto" }),
        }),
        signal: this.processingToken?.signal,
      });

      if (!resp.body || resp.status >= 400) {
        // Create an error assistant message to prevent infinite loop
        const errorMessage =
          resp.status >= 400
            ? `API Error: ${resp.status} ${resp.statusText}`
            : "Failed to get response from API";

        this.setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-assistant-error`,
            role: "assistant",
            parts: [{ type: "text", text: errorMessage }],
          },
        ]);

        this.setStatus("error");
        return;
      }

      // Create assistant message (will be updated based on response type)
      const assistantMessageId = `${Date.now()}-assistant`;
      let hasTextContent = false;

      // Reset smooth queue
      this.pendingCharsRef.current = [];
      this.cancelRaf();

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;
      const pendingToolCalls: Array<{
        id: string;
        name: string;
        arguments: string;
        index: number;
      }> = [];

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

        // Split on double newlines for SSE events
        const events = buffer.split("\n\n");
        buffer = events.pop() || ""; // keep incomplete event in buffer

        for (const event of events) {
          const lines = event.split("\n");
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (!data) continue;
            if (data === "[DONE]") {
              done = true;
              break;
            }
            try {
              const json = JSON.parse(data);
              const delta = json?.choices?.[0]?.delta;
              const token: string = delta?.content || "";
              const toolCalls = delta?.tool_calls;

              if (token) {
                // Check if component is still mounted before updating state
                // This check is now handled by the pub/sub system

                // Create assistant message if this is the first text token
                if (!hasTextContent) {
                  hasTextContent = true;
                  this.setMessages((prev) => [
                    ...prev,
                    {
                      id: assistantMessageId,
                      role: "assistant",
                      parts: [{ type: "text", text: "" }],
                    },
                  ]);
                  this.setStatus("streaming");
                }

                // Enqueue characters for smooth rendering
                this.pendingCharsRef.current.push(...token.split(""));
                // Start smooth rendering (fire-and-forget, no need to await)
                await this.startRafIfNeeded(assistantMessageId);
              }

              if (toolCalls) {
                // Check if component is still mounted before updating state
                // This check is now handled by the pub/sub system

                console.log("[MessageHandler] Received tool calls:", toolCalls);

                // Process tool calls
                for (const toolCall of toolCalls) {
                  const index = toolCall.index;
                  const id = toolCall.id;
                  const name = toolCall.function?.name;
                  const args = toolCall.function?.arguments;

                  // Find or create pending tool call
                  let pendingCall = pendingToolCalls.find((call) => call.index === index);
                  if (!pendingCall) {
                    if (!id || !name) {
                      continue;
                    }
                    pendingCall = { id, name, arguments: "", index };
                    pendingToolCalls.push(pendingCall);
                  }

                  // Update arguments
                  if (args) {
                    pendingCall.arguments += args;
                  }

                  // Try to parse and execute if we have complete arguments
                  try {
                    const parsedArgs = JSON.parse(pendingCall.arguments);

                    // Create or update assistant message with tool call
                    this.setMessages((prev) => {
                      const next = [...prev];
                      let assistantMsg = next.find((msg) => msg.id === assistantMessageId);

                      if (!assistantMsg) {
                        assistantMsg = {
                          id: assistantMessageId,
                          role: "assistant",
                          parts: [],
                        };
                        next.push(assistantMsg);
                      }

                      // Find or create tool part
                      let toolPart = assistantMsg.parts.find(
                        (part): part is UIToolPart =>
                          part.type === "tool" && part.toolCallId === pendingCall.id
                      );

                      if (!toolPart) {
                        toolPart = {
                          type: "tool",
                          toolName: pendingCall.name,
                          toolCallId: pendingCall.id,
                          input: parsedArgs,
                          state: "input-available",
                        };
                        assistantMsg.parts.push(toolPart);
                      } else {
                        toolPart.input = parsedArgs;
                        toolPart.state = "input-available";
                      }

                      return next;
                    });

                    // Tool will be executed by the main loop after streaming completes
                  } catch (e) {
                    // Arguments not complete yet, continue
                  }
                }
              }
            } catch (e) {
              console.warn("Failed to parse SSE data:", data, e);
            }
          }
        }
      }

      // If stream completed without any content, create an error message
      if (!hasTextContent && pendingToolCalls.length === 0) {
        console.warn("[MessageHandler] Stream completed without any content");
        this.setMessages((prev) => [
          ...prev,
          {
            id: assistantMessageId,
            role: "assistant",
            parts: [
              {
                type: "text",
                text: "⚠️ API returned no response. The model did not generate any content.",
              },
            ],
          },
        ]);
      }

      // Wait for all tool calls to complete if we have any
      // No longer need to wait here, the main loop will handle it

      // Don't set status to idle here, let the main loop do it
    } catch (e) {
      if (e instanceof CancellationError || (e instanceof Error && e.name === "AbortError")) {
        // Request was cancelled/aborted, status already set
        return;
      }
      // Re-throw the error to be caught by the main processing loop
      throw e;
    }
  }

  private async _executeTools(assistantMessageId: string, toolsToRun: UIToolPart[]): Promise<void> {
    // Check if cancelled before executing tools
    if (this.processingToken?.isCancelled) {
      return;
    }

    const screenshotMap = new Map<string, string>();

    try {
      // First, update the UI to show all tools are running
      this.setMessages((prev) => {
        const next = [...prev];
        const assistantMsg = next.find((msg) => msg.id === assistantMessageId);
        if (assistantMsg) {
          toolsToRun.forEach((toolToRun) => {
            const toolPart = assistantMsg.parts.find(
              (part): part is UIToolPart =>
                part.type === "tool" && part.toolCallId === toolToRun.toolCallId
            );
            if (toolPart) {
              toolPart.state = "executing";
            }
          });
        }
        return next;
      });

      // Execute tools in parallel and gather results
      const toolResults = await Promise.all(
        toolsToRun.map(async (tool) => {
          try {
            // Check cancellation before each tool execution
            if (this.processingToken?.isCancelled) {
              throw new CancellationError();
            }

            const isActionTool = await browserMcpClient.checkIsActionTool(tool.toolName);
            if (isActionTool) {
              const screenshot = await browserMcpClient.captureScreenshot();
              screenshotMap.set(tool.toolCallId, screenshot);
            }

            const result = await browserMcpClient.callTool(tool.toolName, tool.input, assistantMessageId);
            if (result.success) {
              return {
                toolCallId: tool.toolCallId,
                toolName: tool.toolName,
                status: "success" as const,
                output: result.data,
                screenshot: screenshotMap.get(tool.toolCallId),
              };
            }
            if (result.success === false) {
              throw new Error(result.error);
            }
          } catch (error) {
            if (error instanceof CancellationError) {
              return {
                toolCallId: tool.toolCallId,
                toolName: tool.toolName,
                status: "cancelled" as const,
                output: "Tool execution was cancelled",
                screenshot: screenshotMap.get(tool.toolCallId),
              };
            }
            return {
              toolCallId: tool.toolCallId,
              toolName: tool.toolName,
              status: "error" as const,
              output: (error as Error)?.message ?? "Unknown error",
              screenshot: screenshotMap.get(tool.toolCallId),
            };
          }
        })
      );

      // Update the original assistant message with the tool results
      this.setMessages((prev) => {
        const next = [...prev];
        const assistantMsg = next.find((msg) => msg.id === assistantMessageId);
        if (assistantMsg) {
          toolResults.forEach((result) => {
            const toolPart = assistantMsg.parts.find(
              (part): part is UIToolPart =>
                part.type === "tool" && part.toolCallId === result?.toolCallId
            );
            if (toolPart && result) {
              if (result.status === "success") {
                toolPart.state = "output-available";
                toolPart.output = result.output;
                toolPart.screenshot = result.screenshot;
              } else {
                toolPart.state = "output-error";
                toolPart.errorText = result.output as string;
                toolPart.screenshot = result.screenshot;
              }
            }
          });
        }
        return next;
      });
    } catch (error) {
      // If an unexpected error occurs during tool execution, mark all tools as error
      console.error("[MessageHandler] Error in _executeTools:", error);

      this.setMessages((prev) => {
        const next = [...prev];
        const assistantMsg = next.find((msg) => msg.id === assistantMessageId);
        if (assistantMsg) {
          toolsToRun.forEach((toolToRun) => {
            const toolPart = assistantMsg.parts.find(
              (part): part is UIToolPart =>
                part.type === "tool" && part.toolCallId === toolToRun.toolCallId
            );
            if (toolPart && toolPart.state === "executing") {
              toolPart.state = "output-error";
              toolPart.screenshot = screenshotMap.get(toolToRun.toolCallId);
              toolPart.errorText =
                error instanceof Error ? error.message : "Tool execution failed unexpectedly";
            }
          });
        }
        return next;
      });

      // Re-throw if it's a cancellation error
      if (error instanceof CancellationError) {
        throw error;
      }
    }
  }

  // Regenerate last response
  regenerate(): void {
    const messages = this.getMessages();
    if (messages.length === 0) return;

    // If last message is assistant, remove it
    const last = messages[messages.length - 1];
    const baseHistory =
      last.role === "assistant" || last.role === "tool" ? messages.slice(0, -1) : messages;
    this.setMessages(baseHistory);
    this._processNextAction();
  }

  // Clean up resources
  destroy(): void {
    this.abort();
    this.subscribers.clear();
  }

  // --- Private Helpers for Smooth Streaming ---
  private startRafIfNeeded(assistantMessageId: string): Promise<void> {
    if (this.rafIdRef.current !== null) return Promise.resolve();

    return new Promise<void>((resolve) => {
      const tick = () => {
        // Check cancellation in RAF loop
        if (this.processingToken?.isCancelled) {
          this.cancelRaf();
          resolve();
          return;
        }

        const char = this.pendingCharsRef.current.shift();
        if (char) {
          this.setMessages((prev) => {
            const next = [...prev];
            const last = next.find((msg) => msg.id === assistantMessageId);
            if (last && last.parts[0]?.type === "text") {
              const part = last.parts[0] as UITextPart;
              last.parts[0] = { type: "text", text: part.text + char };
            }
            return next;
          });
        }
        if (this.pendingCharsRef.current.length > 0) {
          this.rafIdRef.current = requestAnimationFrame(tick);
        } else {
          this.rafIdRef.current = null;
          resolve();
        }
      };
      this.rafIdRef.current = requestAnimationFrame(tick);

      // Register cancellation callback
      if (this.processingToken) {
        this.processingToken.onCancelled(() => {
          this.cancelRaf();
          resolve();
        });
      }
    });
  }

  private cancelRaf(): void {
    if (this.rafIdRef.current !== null) {
      cancelAnimationFrame(this.rafIdRef.current);
      this.rafIdRef.current = null;
    }
  }
}
