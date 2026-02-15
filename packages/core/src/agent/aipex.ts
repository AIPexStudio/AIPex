import {
  Agent as OpenAIAgent,
  type RunItemStreamEvent,
  run,
} from "@openai/agents";
import type { ContextManager } from "../context/manager.js";
import type { Context } from "../context/types.js";
import { formatContextsForPrompt, resolveContexts } from "../context/utils.js";
import { ConversationCompressor } from "../conversation/compressor.js";
import { EphemeralSession } from "../conversation/ephemeral-session.js";
import { ConversationManager } from "../conversation/manager.js";
import type { Session } from "../conversation/session.js";
import { SessionStorage } from "../conversation/storage.js";
import { InMemoryStorage } from "../storage/memory.js";
import { shapeScreenshotItems } from "../utils/screenshot-shaping.js";
import type {
  AfterResponsePayload,
  AgentEvent,
  AgentMetrics,
  AgentPlugin,
  AgentPluginContext,
  AIPexOptions,
  BeforeChatPayload,
  ChatOptions,
  MetricsPayload,
  SessionStorageAdapter,
  ToolEventPayload,
} from "../types.js";
import { AgentError, ErrorCode } from "../utils/errors.js";
import { safeJsonParse } from "../utils/json.js";

export class AIPex {
  private agent: OpenAIAgent;
  private conversationManager?: ConversationManager;
  private contextManager?: ContextManager;
  private maxTurns: number;
  private plugins: AgentPlugin[];
  private pluginContext: AgentPluginContext;

  private constructor(
    agent: OpenAIAgent,
    conversationManager?: ConversationManager,
    contextManager?: ContextManager,
    maxTurns?: number,
    plugins: AgentPlugin[] = [],
  ) {
    this.agent = agent;
    this.conversationManager = conversationManager;
    this.contextManager = contextManager;
    this.maxTurns = maxTurns ?? 2000;
    this.plugins = plugins;
    this.pluginContext = { agent: this };
    this.initializePlugins();
  }

  static create(options: AIPexOptions): AIPex {
    const agent = new OpenAIAgent({
      name: options.name ?? "Assistant",
      instructions: options.instructions,
      model: options.model,
      tools: options.tools ?? [],
    });

    const conversationManager = AIPex.buildConversationManager(options);
    return new AIPex(
      agent,
      conversationManager,
      options.contextManager,
      options.maxTurns,
      options.plugins ?? [],
    );
  }

  private static buildConversationManager(
    options: AIPexOptions,
  ): ConversationManager | undefined {
    // If conversationManager is provided, use it directly
    if (options.conversationManager) {
      return options.conversationManager;
    }

    // If conversation is explicitly disabled
    if (options.conversation === false) {
      return undefined;
    }

    // Build storage (default to in-memory storage)
    const storage: SessionStorageAdapter =
      options.storage ?? new SessionStorage(new InMemoryStorage());

    // Build compressor if compression config is provided
    const compressor = options.compression
      ? new ConversationCompressor(options.compression.model, {
          summarizeAfterItems: options.compression.summarizeAfterItems,
          keepRecentItems: options.compression.keepRecentItems,
          maxSummaryLength: options.compression.maxSummaryLength,
        })
      : undefined;

    return new ConversationManager(storage, { compressor });
  }

  private initMetrics(
    startTime: number,
    session: Session | null,
  ): AgentMetrics {
    return {
      tokensUsed: 0,
      promptTokens: 0,
      completionTokens: 0,
      itemCount: session?.getItemCount() ?? 0,
      maxTurns: this.maxTurns,
      duration: 0,
      startTime,
    };
  }

  private async *runExecution(
    input: string,
    session: Session | null,
  ): AsyncGenerator<AgentEvent> {
    const startTime = Date.now();
    const metrics = this.initMetrics(startTime, session);

    // Always provide a session to the runner so that screenshot shaping
    // (strip base64 imageData, inject transient user image message) runs
    // even in stateless mode.  The EphemeralSession is in-memory only and
    // never persisted.
    const runSession: Session | EphemeralSession =
      session ?? new EphemeralSession();

    // Track tool-call argument streaming during a single model response.
    // This is best-effort and provider-dependent (e.g. OpenAI ChatCompletions tool_calls deltas).
    const toolArgsStreamByIndex = new Map<
      number,
      { toolName: string; startEmitted: boolean }
    >();

    try {
      const result = await run(this.agent, input, {
        maxTurns: this.maxTurns,
        session: runSession,
        stream: true,
        // Shape screenshot tool results before every model call:
        // strip base64 imageData from tool results and inject a transient
        // user image message so the model can consume images via the vision path.
        callModelInputFilter: async ({ modelData }) => ({
          input: shapeScreenshotItems(modelData.input),
          instructions: modelData.instructions,
        }),
      });

      let streamedOutput = "";
      for await (const streamEvent of result) {
        if (streamEvent.type === "raw_model_stream_event") {
          // New response boundary: reset per-response tool args tracking.
          if (
            (streamEvent.data as unknown as { type?: string })?.type ===
            "response_started"
          ) {
            toolArgsStreamByIndex.clear();
            continue;
          }

          // Best-effort: detect tool call argument streaming from raw provider events.
          // For OpenAI ChatCompletions streaming, the raw chunk is available under
          // streamEvent.data.type === "model" with a shape like:
          //   event.choices[0].delta.tool_calls[].function.{name,arguments}
          if (
            (streamEvent.data as unknown as { type?: string })?.type === "model"
          ) {
            const raw = (streamEvent.data as unknown as { event?: unknown })
              ?.event as unknown;
            const choices = (raw as any)?.choices;
            const delta = Array.isArray(choices) ? choices?.[0]?.delta : null;
            const toolCalls = delta?.tool_calls;
            if (Array.isArray(toolCalls)) {
              for (const tcDelta of toolCalls) {
                const index = tcDelta?.index;
                if (typeof index !== "number") continue;

                const state = toolArgsStreamByIndex.get(index) ?? {
                  toolName: "",
                  startEmitted: false,
                };

                const nameDelta = tcDelta?.function?.name;
                if (typeof nameDelta === "string" && nameDelta.length > 0) {
                  state.toolName += nameDelta;
                }

                // If we can identify the tool name, emit args streaming start once.
                if (!state.startEmitted && state.toolName.length > 0) {
                  state.startEmitted = true;
                  await this.emitToolEventHooks({
                    event: {
                      type: "tool_call_args_streaming_start",
                      toolName: state.toolName,
                    },
                  });
                  yield {
                    type: "tool_call_args_streaming_start",
                    toolName: state.toolName,
                  };
                }

                toolArgsStreamByIndex.set(index, state);
              }
            }
          }

          if (streamEvent.data.type === "output_text_delta") {
            streamedOutput += streamEvent.data.delta;
            yield { type: "content_delta", delta: streamEvent.data.delta };
          }
          continue;
        }

        if (streamEvent.type === "run_item_stream_event") {
          // Emit tool args "complete" right before the tool call starts, so UIs can
          // show a "parameters ready" transition even if they couldn't observe args streaming.
          if (streamEvent.name === "tool_called") {
            const toolName = this.extractToolName(streamEvent.item);
            const params = this.extractToolArguments(streamEvent.item);
            const argsCompleteEvent: AgentEvent = {
              type: "tool_call_args_streaming_complete",
              toolName,
              params,
            };
            await this.emitToolEventHooks({ event: argsCompleteEvent });
            yield argsCompleteEvent;
          }

          const toolEvent = this.transformToolEvent(streamEvent);
          if (toolEvent) {
            await this.emitToolEventHooks({ event: toolEvent });
            yield toolEvent;
          }
        }
      }

      const finalOutput =
        typeof result.finalOutput === "string" && result.finalOutput.length > 0
          ? result.finalOutput
          : streamedOutput;

      metrics.itemCount = session?.getItemCount() ?? 0;
      metrics.duration = Date.now() - startTime;
      this.applyUsageMetrics(metrics, result);

      const metricsSnapshot = { ...metrics };
      await this.emitMetricsHooks({
        metrics: metricsSnapshot,
        sessionId: session?.id ?? undefined,
      });
      yield {
        type: "metrics_update",
        metrics: metricsSnapshot,
        sessionId: session?.id,
      };

      if (session) {
        session.addMetrics(metrics);
        session.setMetadata("lastPromptTokens", metrics.promptTokens);
        if (this.conversationManager) {
          await this.conversationManager.saveSession(session);
        }
      }

      await this.runAfterResponseHooks({
        input,
        finalOutput,
        metrics: { ...metrics },
        sessionId: session?.id ?? undefined,
      });

      yield {
        type: "execution_complete",
        finalOutput,
        metrics,
      };
    } catch (error) {
      const agentError = this.normalizeError(error);
      metrics.duration = Date.now() - startTime;
      const metricsSnapshot = { ...metrics };
      await this.emitMetricsHooks({
        metrics: metricsSnapshot,
        sessionId: session?.id ?? undefined,
      });
      yield {
        type: "metrics_update",
        metrics: { ...metrics },
        sessionId: session?.id,
      };
      yield { type: "error", error: agentError };
      if (session) {
        session.addMetrics(metrics);
        session.setMetadata("lastPromptTokens", metrics.promptTokens);
        if (this.conversationManager) {
          await this.conversationManager.saveSession(session);
        }
      }
      return;
    }
  }

  async *chat(
    input: string,
    options?: ChatOptions,
  ): AsyncGenerator<AgentEvent> {
    let finalInput = input;
    let chatOptions = options;
    let resolvedContexts: Context[] | undefined;

    // Handle contexts if provided
    if (chatOptions?.contexts && chatOptions.contexts.length > 0) {
      try {
        // Resolve context IDs to Context objects if needed
        const contextObjs =
          this.contextManager &&
          chatOptions.contexts.some((c) => typeof c === "string")
            ? await resolveContexts(
                chatOptions.contexts,
                this.contextManager.getContext.bind(this.contextManager),
              )
            : (chatOptions.contexts.filter(
                (c) => typeof c !== "string",
              ) as Context[]);

        if (contextObjs.length > 0) {
          resolvedContexts = contextObjs;
          // Format contexts and prepend to input
          const contextText = formatContextsForPrompt(contextObjs);
          finalInput = `${contextText}\n\n${input}`;

          yield { type: "contexts_attached", contexts: contextObjs };
        }
      } catch (error) {
        // Emit context error but continue with original input
        yield {
          type: "context_error",
          providerId: "unknown",
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
    }

    const beforeChat = await this.runBeforeChatHooks({
      input: finalInput,
      options: chatOptions,
      contexts: resolvedContexts,
    });
    finalInput = beforeChat.input;
    if (beforeChat.options) {
      chatOptions = { ...(chatOptions ?? {}), ...beforeChat.options };
    }
    if (beforeChat.contexts) {
      resolvedContexts = beforeChat.contexts;
      chatOptions = { ...(chatOptions ?? {}), contexts: beforeChat.contexts };
    }

    // If sessionId is provided, continue existing conversation
    if (chatOptions?.sessionId) {
      if (!this.conversationManager) {
        throw new Error(
          "ConversationManager is required for continuing conversations",
        );
      }

      const session = await this.conversationManager.getSession(
        chatOptions.sessionId,
      );
      if (!session) {
        throw new Error(`Session ${chatOptions.sessionId} not found`);
      }

      yield {
        type: "session_resumed",
        sessionId: chatOptions.sessionId,
        itemCount: session.getItemCount(),
      };

      yield* this.runExecution(finalInput, session);
      return;
    }

    // Start new conversation
    let session: Session | null = null;

    if (this.conversationManager) {
      session = await this.conversationManager.createSession();
      yield { type: "session_created", sessionId: session.id };
    }

    yield* this.runExecution(finalInput, session);
  }

  getConversationManager(): ConversationManager | undefined {
    return this.conversationManager;
  }

  getContextManager(): ContextManager | undefined {
    return this.contextManager;
  }

  private transformToolEvent(
    event: RunItemStreamEvent,
  ): AgentEvent | undefined {
    if (event.name !== "tool_called" && event.name !== "tool_output") {
      return undefined;
    }

    if (event.name === "tool_called") {
      return {
        type: "tool_call_start",
        toolName: this.extractToolName(event.item),
        params: this.extractToolArguments(event.item),
      };
    }

    const status = this.getToolStatus(event.item);
    if (status !== "completed") {
      const toolName = this.extractToolName(event.item);
      const failureMessage = this.extractToolFailureMessage(event.item, status);
      return {
        type: "tool_call_error",
        toolName,
        error: new Error(failureMessage),
      };
    }

    return {
      type: "tool_call_complete",
      toolName: this.extractToolName(event.item),
      result: this.extractToolOutput(event.item),
    };
  }

  private getToolStatus(item: RunItemStreamEvent["item"]): string {
    const rawItem = (item as unknown as { rawItem?: { status?: string } })
      .rawItem;
    if (rawItem && typeof rawItem.status === "string") {
      return rawItem.status;
    }
    return "completed";
  }

  private extractToolName(item: RunItemStreamEvent["item"]): string {
    const raw = (item as unknown as { rawItem?: { name?: string } }).rawItem;
    if (raw && typeof raw.name === "string" && raw.name.length > 0) {
      return raw.name;
    }
    return "tool";
  }

  private extractToolArguments(item: RunItemStreamEvent["item"]): unknown {
    const raw = item as unknown as { rawItem?: { arguments?: unknown } };
    const args = raw.rawItem?.arguments;
    if (typeof args === "string") {
      const parsed = safeJsonParse<unknown>(args);
      if (parsed !== undefined) return parsed;
      return args;
    }
    return args;
  }

  private extractToolOutput(item: RunItemStreamEvent["item"]): unknown {
    const outputCarrier = item as unknown as { output?: unknown };
    if (typeof outputCarrier.output === "string") {
      const parsed = safeJsonParse<unknown>(outputCarrier.output);
      if (parsed !== undefined) return parsed;
      return outputCarrier.output;
    }
    if (outputCarrier.output !== undefined) {
      return outputCarrier.output;
    }

    const rawOutput = (item as unknown as { rawItem?: { output?: unknown } })
      .rawItem?.output;
    if (typeof rawOutput === "string") {
      const parsed = safeJsonParse<unknown>(rawOutput);
      if (parsed !== undefined) return parsed;
      return rawOutput;
    }
    return rawOutput;
  }

  /**
   * Extract a human-readable failure message from a tool execution.
   * Attempts to find the real error message from various locations in the item,
   * with basic truncation and sanitization.
   */
  private extractToolFailureMessage(
    item: RunItemStreamEvent["item"],
    status: string,
  ): string {
    const MAX_MESSAGE_LENGTH = 500;

    // Try to extract error message from various sources
    let message: string | undefined;

    // Check item.output for error info
    const outputCarrier = item as unknown as { output?: unknown };
    if (outputCarrier.output !== undefined) {
      message = this.extractErrorFromValue(outputCarrier.output);
    }

    // Check rawItem.output
    if (!message) {
      const rawOutput = (item as unknown as { rawItem?: { output?: unknown } })
        .rawItem?.output;
      if (rawOutput !== undefined) {
        message = this.extractErrorFromValue(rawOutput);
      }
    }

    // Check rawItem.error directly
    if (!message) {
      const rawError = (item as unknown as { rawItem?: { error?: unknown } })
        .rawItem?.error;
      if (rawError !== undefined) {
        message = this.extractErrorFromValue(rawError);
      }
    }

    // Fallback to status-based message
    if (!message) {
      message = `Tool call ${status}`;
    }

    // Truncate and sanitize
    return this.sanitizeErrorMessage(message, MAX_MESSAGE_LENGTH);
  }

  /**
   * Extract error message from a value that could be:
   * - A string (possibly JSON)
   * - An Error object
   * - An object with error/message properties
   */
  private extractErrorFromValue(value: unknown): string | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    // Handle Error objects
    if (value instanceof Error) {
      return value.message;
    }

    // Handle string values
    if (typeof value === "string") {
      // Try to parse as JSON
      const parsed = safeJsonParse<unknown>(value);
      if (parsed !== undefined) {
        return this.extractErrorFromValue(parsed);
      }
      return value;
    }

    // Handle objects with error-related properties
    if (typeof value === "object") {
      const obj = value as Record<string, unknown>;

      // Check for common error patterns
      if (typeof obj.error === "string" && obj.error.length > 0) {
        return obj.error;
      }
      if (typeof obj.message === "string" && obj.message.length > 0) {
        return obj.message;
      }
      if (
        obj.error &&
        typeof obj.error === "object" &&
        typeof (obj.error as Record<string, unknown>).message === "string"
      ) {
        return (obj.error as Record<string, unknown>).message as string;
      }

      // If it's a failure result object, try to extract useful info
      if (obj.success === false) {
        if (typeof obj.error === "string") {
          return obj.error;
        }
        // Return a stringified version as last resort
        try {
          return JSON.stringify(obj);
        } catch {
          return undefined;
        }
      }
    }

    return undefined;
  }

  /**
   * Sanitize and truncate error message for safe display.
   * - Truncates to maxLength
   * - Masks potential sensitive patterns (tokens, auth headers)
   */
  private sanitizeErrorMessage(message: string, maxLength: number): string {
    let sanitized = message;

    // Mask potential sensitive patterns
    // Authorization headers
    sanitized = sanitized.replace(
      /Authorization:\s*(Bearer\s+)?[^\s,}"\]]+/gi,
      "Authorization: [REDACTED]",
    );
    // API keys patterns
    sanitized = sanitized.replace(
      /(['"](api[_-]?key|apikey|token|secret|password)['"]\s*[=:]\s*['"])[^'"]+(['"])/gi,
      "$1[REDACTED]$3",
    );
    // Bearer tokens in JSON
    sanitized = sanitized.replace(
      /(bearer\s+)[a-zA-Z0-9._-]{20,}/gi,
      "$1[REDACTED]",
    );

    // Truncate if needed
    if (sanitized.length > maxLength) {
      sanitized = `${sanitized.substring(0, maxLength - 3)}...`;
    }

    return sanitized;
  }

  private applyUsageMetrics(
    metrics: AgentMetrics,
    result: { rawResponses?: Array<{ usage?: UsageShape }> },
  ): void {
    const responses = result.rawResponses ?? [];

    // Use the LAST response with usage data (typically the final model response)
    // This represents the total tokens for this execution, not a running sum
    let lastUsage: UsageShape | undefined;
    for (let i = responses.length - 1; i >= 0; i--) {
      const response = responses[i];
      if (response?.usage) {
        lastUsage = response.usage;
        break;
      }
    }

    const promptTokens = lastUsage?.inputTokens ?? 0;
    const completionTokens = lastUsage?.outputTokens ?? 0;

    metrics.promptTokens = promptTokens;
    metrics.completionTokens = completionTokens;
    metrics.tokensUsed = promptTokens + completionTokens;
  }

  private normalizeError(error: unknown): AgentError {
    if (error instanceof AgentError) {
      return error;
    }

    const message =
      error instanceof Error ? error.message : String(error ?? "Unknown error");

    return new AgentError(message, ErrorCode.LLM_API_ERROR, false, {
      cause: error instanceof Error ? error.stack : error,
    });
  }

  private initializePlugins(): void {
    for (const plugin of this.plugins) {
      try {
        void plugin.setup?.(this.pluginContext);
      } catch (error) {
        console.error(`[AIPex] Failed to setup plugin ${plugin.id}:`, error);
      }
    }
  }

  private async runBeforeChatHooks(
    payload: BeforeChatPayload,
  ): Promise<BeforeChatPayload> {
    let current = payload;
    for (const plugin of this.plugins) {
      const hook = plugin.hooks?.beforeChat;
      if (!hook) {
        continue;
      }
      try {
        const result = await hook(current, this.pluginContext);
        if (result) {
          current = {
            input: result.input ?? current.input,
            options: result.options ?? current.options,
            contexts: result.contexts ?? current.contexts,
          };
        }
      } catch (error) {
        console.error(`[AIPex] Plugin ${plugin.id} beforeChat failed`, error);
      }
    }
    return current;
  }

  private async runAfterResponseHooks(
    payload: AfterResponsePayload,
  ): Promise<void> {
    for (const plugin of this.plugins) {
      const hook = plugin.hooks?.afterResponse;
      if (!hook) continue;
      try {
        await hook(payload, this.pluginContext);
      } catch (error) {
        console.error(
          `[AIPex] Plugin ${plugin.id} afterResponse failed`,
          error,
        );
      }
    }
  }

  private async emitToolEventHooks(payload: ToolEventPayload): Promise<void> {
    for (const plugin of this.plugins) {
      const hook = plugin.hooks?.onToolEvent;
      if (!hook) continue;
      try {
        await hook(payload, this.pluginContext);
      } catch (error) {
        console.error(`[AIPex] Plugin ${plugin.id} onToolEvent failed`, error);
      }
    }
  }

  private async emitMetricsHooks(payload: MetricsPayload): Promise<void> {
    for (const plugin of this.plugins) {
      const hook = plugin.hooks?.onMetrics;
      if (!hook) continue;
      try {
        await hook(payload, this.pluginContext);
      } catch (error) {
        console.error(`[AIPex] Plugin ${plugin.id} onMetrics failed`, error);
      }
    }
  }
}

interface UsageShape {
  inputTokens?: number;
  outputTokens?: number;
}
