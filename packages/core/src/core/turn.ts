import type { LLMProvider } from "../llm/provider.js";
import type { FunctionCall, LLMRequest } from "../llm/types.js";
import type { ToolRegistry } from "../tools/registry.js";
import { TurnCancelledError } from "../utils/errors.js";
import { generateId } from "../utils/id-generator.js";
import { StreamBuffer } from "../utils/stream-buffer.js";
import type { TurnEvent } from "./events.js";
import { TurnState } from "./types.js";

export class Turn {
  private state: TurnState = TurnState.INIT;
  readonly id: string;
  private cancelToken = new AbortController();
  private cleanupCallbacks: Array<() => void | Promise<void>> = [];
  private contentBuffer: StreamBuffer;
  private thinkingBuffer: StreamBuffer;

  constructor(
    private llmProvider: LLMProvider,
    private toolRegistry: ToolRegistry,
    private request: LLMRequest,
    private sessionId: string,
  ) {
    this.id = generateId();
    this.contentBuffer = new StreamBuffer(50, 1024);
    this.thinkingBuffer = new StreamBuffer(100, 512);
  }

  async *execute(): AsyncGenerator<TurnEvent> {
    try {
      // 1. Call LLM (streaming)
      this.state = TurnState.LLM_CALLING;
      yield { type: "llm_stream_start" };

      const pendingCalls: FunctionCall[] = [];
      for await (const chunk of this.llmProvider.generateStream(this.request)) {
        // Check cancellation
        if (this.cancelToken.signal.aborted) {
          throw new TurnCancelledError("Turn was cancelled");
        }

        if (chunk.type === "content") {
          this.contentBuffer.add(chunk.delta, (_buffered) => {
            // Note: We need to yield in the generator context
          });
          yield { type: "content_delta", delta: chunk.delta };
        } else if (chunk.type === "function_call") {
          pendingCalls.push(chunk.call);
          yield {
            type: "tool_call_pending",
            callId: chunk.call.id,
            toolName: chunk.call.name,
            params: chunk.call.params,
          };
        } else if (chunk.type === "thinking") {
          this.thinkingBuffer.add(chunk.thought, (_buffered) => {
            // Buffered thinking output
          });
          yield { type: "thinking_delta", delta: chunk.thought };
        } else if (chunk.type === "done") {
          yield { type: "llm_stream_end", usage: chunk.usage };
        }
      }

      // Flush any remaining buffered content
      this.contentBuffer.flush((_buffered) => {
        // Already emitted through deltas
      });
      this.thinkingBuffer.flush((_buffered) => {
        // Already emitted through deltas
      });

      // 2. Execute all tool calls
      if (pendingCalls.length > 0) {
        this.state = TurnState.TOOL_EXECUTING;

        for (const call of pendingCalls) {
          yield { type: "tool_call_start", callId: call.id };

          const startTime = Date.now();

          try {
            const result = await this.toolRegistry.execute(
              call.name,
              call.params,
              {
                callId: call.id,
                turnId: this.id,
                sessionId: this.sessionId,
                signal: this.cancelToken.signal,
              },
            );

            const duration = Date.now() - startTime;
            yield {
              type: "tool_call_complete",
              callId: call.id,
              result,
              duration,
            };
          } catch (error) {
            yield {
              type: "tool_call_error",
              callId: call.id,
              error: error instanceof Error ? error : new Error(String(error)),
            };
          }
        }
      }

      // 3. Determine if should continue
      this.state = TurnState.COMPLETED;
      yield {
        type: "turn_complete",
        shouldContinue: pendingCalls.length > 0,
      };
    } catch (error) {
      this.state = TurnState.FAILED;
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  async cancel(): Promise<void> {
    if (this.state === TurnState.COMPLETED) return;

    this.state = TurnState.CANCELLED;
    this.cancelToken.abort();
    await this.cleanup();
  }

  onCleanup(callback: () => void | Promise<void>): void {
    this.cleanupCallbacks.push(callback);
  }

  private async cleanup(): Promise<void> {
    this.contentBuffer.dispose();
    this.thinkingBuffer.dispose();

    for (const cleanup of this.cleanupCallbacks) {
      await cleanup();
    }
  }

  getState(): TurnState {
    return this.state;
  }
}
