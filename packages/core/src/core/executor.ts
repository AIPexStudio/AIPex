import type { LLMProvider } from "../llm/provider.js";
import type { LLMRequest, UnifiedMessage } from "../llm/types.js";
import type { ToolRegistry } from "../tools/registry.js";
import { generateId } from "../utils/id-generator.js";
import { logger } from "../utils/logger.js";
import type { AgentEvent } from "./events.js";
import { LoopDetector } from "./loop-detector.js";
import { Turn } from "./turn.js";

export interface ExecutorConfig {
  maxTurns?: number;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export class AgentExecutor {
  private maxTurns: number;
  private currentTurn = 0;
  private loopDetector = new LoopDetector();
  private activeTurn: Turn | null = null;
  private conversationHistory: UnifiedMessage[] = [];

  constructor(
    private sessionId: string,
    private llmProvider: LLMProvider,
    private toolRegistry: ToolRegistry,
    private config: ExecutorConfig,
  ) {
    this.maxTurns = config.maxTurns || 10;
  }

  async *run(input: string): AsyncGenerator<AgentEvent> {
    yield { type: "execution_start" };

    // Add user input to conversation
    this.conversationHistory.push({
      role: "user",
      content: input,
    });

    // Agent loop
    while (this.currentTurn < this.maxTurns) {
      this.currentTurn++;
      const turnId = generateId();

      logger.debug(`Starting turn ${this.currentTurn}/${this.maxTurns}`, {
        turnId,
        sessionId: this.sessionId,
      });

      yield { type: "turn_start", turnId, number: this.currentTurn };

      // Build LLM request
      const request = this.buildLLMRequest();

      // Execute one Turn
      this.activeTurn = new Turn(
        this.llmProvider,
        this.toolRegistry,
        request,
        this.sessionId,
      );

      let shouldContinue = false;
      const toolCalls: Array<{
        id: string;
        name: string;
        params: Record<string, unknown>;
      }> = [];
      let assistantContent = "";
      const functionResults: Array<{
        id: string;
        name: string;
        result: Record<string, unknown>;
      }> = [];

      for await (const event of this.activeTurn.execute()) {
        // Forward all turn events
        yield event;

        // Collect data for conversation history
        if (event.type === "content_delta") {
          assistantContent += event.delta;
        }

        if (event.type === "tool_call_pending") {
          toolCalls.push({
            id: event.callId,
            name: event.toolName,
            params: event.params,
          });
        }

        if (event.type === "tool_call_complete") {
          functionResults.push({
            id: event.callId,
            name: toolCalls.find((c) => c.id === event.callId)?.name || "",
            result: event.result.data ?? {},
          });
        }

        if (event.type === "turn_complete") {
          shouldContinue = event.shouldContinue;
        }
      }

      // Add assistant response to history
      if (assistantContent || toolCalls.length > 0) {
        this.conversationHistory.push({
          role: "assistant",
          content: assistantContent,
        });

        // Add function calls and responses to history
        for (const call of toolCalls) {
          this.conversationHistory.push({
            role: "assistant",
            content: "",
            functionCall: call,
          });
        }

        for (const result of functionResults) {
          this.conversationHistory.push({
            role: "function",
            content: JSON.stringify(result.result),
            functionResponse: result,
          });
        }
      }

      this.activeTurn = null;

      // Loop detection
      for (const call of toolCalls) {
        if (this.loopDetector.checkLoop(call.name, call.params)) {
          logger.warn("Loop detected", {
            toolName: call.name,
            params: call.params,
          });

          yield {
            type: "execution_complete",
            reason: "loop_detected",
            turns: this.currentTurn,
            details: `Tool ${call.name} called repeatedly with similar params`,
          };
          return;
        }
      }

      // If no tool calls, we're done
      if (!shouldContinue) {
        yield {
          type: "execution_complete",
          reason: "finished",
          turns: this.currentTurn,
        };
        return;
      }
    }

    // Max turns reached
    yield {
      type: "execution_complete",
      reason: "max_turns",
      turns: this.currentTurn,
    };
  }

  async interrupt(): Promise<void> {
    if (this.activeTurn) {
      await this.activeTurn.cancel();
    }
  }

  private buildLLMRequest(): LLMRequest {
    const messages: UnifiedMessage[] = [];

    // Add system prompt if provided
    if (this.config.systemPrompt) {
      messages.push({
        role: "system",
        content: this.config.systemPrompt,
      });
    }

    // Add conversation history
    messages.push(...this.conversationHistory);

    return {
      messages,
      tools: this.toolRegistry.getAllDeclarations(),
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
    };
  }

  getHistory(): UnifiedMessage[] {
    return [...this.conversationHistory];
  }
}
