import {
  Agent as OpenAIAgent,
  type RunItemStreamEvent,
  run,
} from "@openai/agents";
import type { ContextManager } from "../context/manager.js";
import { formatContextsForPrompt, resolveContexts } from "../context/utils.js";
import { ConversationCompressor } from "../conversation/compressor.js";
import { ConversationManager } from "../conversation/manager.js";
import type { Session } from "../conversation/session.js";
import { SessionStorage } from "../conversation/storage.js";
import { InMemoryStorage } from "../storage/memory.js";
import type {
  AgentEvent,
  AgentMetrics,
  AIPexOptions,
  ChatOptions,
  SessionStorageAdapter,
} from "../types.js";
import { AgentError, ErrorCode } from "../utils/errors.js";

export class AIPex {
  private agent: OpenAIAgent;
  private conversationManager?: ConversationManager;
  private contextManager?: ContextManager;
  private maxTurns: number;

  private constructor(
    agent: OpenAIAgent,
    conversationManager?: ConversationManager,
    contextManager?: ContextManager,
    maxTurns?: number,
  ) {
    this.agent = agent;
    this.conversationManager = conversationManager;
    this.contextManager = contextManager;
    this.maxTurns = maxTurns ?? 10;
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

    try {
      const result = await run(this.agent, input, {
        maxTurns: this.maxTurns,
        session: session ?? undefined,
        stream: true,
      });

      let streamedOutput = "";
      for await (const streamEvent of result) {
        if (streamEvent.type === "raw_model_stream_event") {
          if (streamEvent.data.type === "output_text_delta") {
            streamedOutput += streamEvent.data.delta;
            yield { type: "content_delta", delta: streamEvent.data.delta };
          }
          continue;
        }

        if (streamEvent.type === "run_item_stream_event") {
          const toolEvent = this.transformToolEvent(streamEvent);
          if (toolEvent) {
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

      yield { type: "metrics_update", metrics: { ...metrics } };

      if (session) {
        session.addMetrics(metrics);
        if (this.conversationManager) {
          await this.conversationManager.saveSession(session);
        }
      }

      yield {
        type: "execution_complete",
        finalOutput,
        metrics,
      };
    } catch (error) {
      const agentError = this.normalizeError(error);
      metrics.duration = Date.now() - startTime;
      yield { type: "metrics_update", metrics: { ...metrics } };
      yield { type: "error", error: agentError };
      if (session) {
        session.addMetrics(metrics);
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

    // Handle contexts if provided
    if (options?.contexts && options.contexts.length > 0) {
      try {
        // Resolve context IDs to Context objects if needed
        const contextObjs =
          this.contextManager &&
          options.contexts.some((c) => typeof c === "string")
            ? await resolveContexts(
                options.contexts,
                this.contextManager.getContext.bind(this.contextManager),
              )
            : (options.contexts.filter(
                (c) => typeof c !== "string",
              ) as import("../context/types.js").Context[]);

        if (contextObjs.length > 0) {
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

    // If sessionId is provided, continue existing conversation
    if (options?.sessionId) {
      yield* this.continueConversation(options.sessionId, finalInput);
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

  /**
   * @deprecated Use chat() instead
   */
  async *executeStream(input: string): AsyncGenerator<AgentEvent> {
    yield* this.chat(input);
  }

  /**
   * @deprecated Use chat(input, { sessionId }) instead
   */
  async *continueConversation(
    sessionId: string,
    input: string,
  ): AsyncGenerator<AgentEvent> {
    if (!this.conversationManager) {
      throw new Error(
        "ConversationManager is required for continuing conversations",
      );
    }

    const session = await this.conversationManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    yield {
      type: "session_resumed",
      sessionId,
      itemCount: session.getItemCount(),
    };

    yield* this.runExecution(input, session);
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
      return {
        type: "tool_call_error",
        toolName: this.extractToolName(event.item),
        error: new Error(`Tool call ${status}`),
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
      try {
        return JSON.parse(args);
      } catch {
        return args;
      }
    }
    return args;
  }

  private extractToolOutput(item: RunItemStreamEvent["item"]): unknown {
    const outputCarrier = item as unknown as { output?: unknown };
    if (typeof outputCarrier.output === "string") {
      try {
        return JSON.parse(outputCarrier.output);
      } catch {
        return outputCarrier.output;
      }
    }
    if (outputCarrier.output !== undefined) {
      return outputCarrier.output;
    }

    const rawOutput = (item as unknown as { rawItem?: { output?: unknown } })
      .rawItem?.output;
    if (typeof rawOutput === "string") {
      try {
        return JSON.parse(rawOutput);
      } catch {
        return rawOutput;
      }
    }
    return rawOutput;
  }

  private applyUsageMetrics(
    metrics: AgentMetrics,
    result: { rawResponses?: Array<{ usage?: UsageShape }> },
  ): void {
    const responses = result.rawResponses ?? [];
    let promptTokens = 0;
    let completionTokens = 0;

    for (const response of responses) {
      if (!response.usage) continue;
      promptTokens += response.usage.inputTokens ?? 0;
      completionTokens += response.usage.outputTokens ?? 0;
    }

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
}

interface UsageShape {
  inputTokens?: number;
  outputTokens?: number;
}
