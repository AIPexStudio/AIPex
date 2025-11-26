import { Agent as OpenAIAgent, run } from "@openai/agents";
import type { ConversationManager } from "../conversation/manager.js";
import type { Session } from "../conversation/session.js";
import type {
  AgentEvent,
  AgentMetrics,
  AIPexAgentOptions,
  CompletedTurn,
} from "../types.js";
import { generateId } from "../utils/id-generator.js";

export class AIPexAgent {
  private agent: OpenAIAgent;
  private conversationManager?: ConversationManager;
  private maxTurns: number;
  private maxTokens?: number;

  private constructor(
    agent: OpenAIAgent,
    conversationManager?: ConversationManager,
    maxTurns?: number,
    maxTokens?: number,
  ) {
    this.agent = agent;
    this.conversationManager = conversationManager;
    this.maxTurns = maxTurns ?? 10;
    this.maxTokens = maxTokens;
  }

  static create(options: AIPexAgentOptions): AIPexAgent {
    const agent = new OpenAIAgent({
      name: options.name ?? "Assistant",
      instructions: options.instructions,
      model: options.model,
      tools: options.tools ?? [],
    });

    return new AIPexAgent(
      agent,
      options.conversationManager,
      options.maxTurns,
      options.maxTokens,
    );
  }

  private initMetrics(
    startTime: number,
    session: Session | null,
  ): AgentMetrics {
    const sessionStats = session?.getStats();
    return {
      tokensUsed: 0,
      maxTokens: this.maxTokens,
      promptTokens: 0,
      completionTokens: 0,
      turnCount: session?.getTurnCount() ?? 0,
      maxTurns: this.maxTurns,
      toolCallCount: sessionStats?.toolCallCount ?? 0,
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

    let contentBuffer = "";
    let turnCount = session?.getTurnCount() ?? 0;

    const result = await run(this.agent, input, {
      maxTurns: this.maxTurns,
    });

    contentBuffer = result.finalOutput ?? "";
    yield { type: "content_delta", delta: contentBuffer };

    turnCount++;
    metrics.turnCount = turnCount;
    metrics.duration = Date.now() - startTime;

    const resultWithUsage = result as typeof result & {
      usage?: { promptTokens?: number; completionTokens?: number };
    };
    if (resultWithUsage.usage) {
      metrics.promptTokens = resultWithUsage.usage.promptTokens ?? 0;
      metrics.completionTokens = resultWithUsage.usage.completionTokens ?? 0;
      metrics.tokensUsed = metrics.promptTokens + metrics.completionTokens;
    }

    yield { type: "metrics_update", metrics: { ...metrics } };

    if (session && this.conversationManager) {
      const turn: CompletedTurn = {
        id: generateId(),
        userMessage: { role: "user", content: input },
        assistantMessage: { role: "assistant", content: contentBuffer },
        functionCalls: [],
        functionResults: [],
        timestamp: Date.now(),
        metadata: {
          tokensUsed: metrics.tokensUsed,
          duration: metrics.duration,
        },
      };
      session.addTurn(turn);
      await this.conversationManager.saveSession(session);
    }

    yield { type: "turn_complete", turnNumber: turnCount };
    yield {
      type: "execution_complete",
      turns: turnCount,
      finalOutput: contentBuffer,
      metrics,
    };
  }

  async *executeStream(input: string): AsyncGenerator<AgentEvent> {
    let session: Session | null = null;

    if (this.conversationManager) {
      session = await this.conversationManager.createSession();
      yield { type: "session_created", sessionId: session.id };
    }

    yield* this.runExecution(input, session);
  }

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
      turnCount: session.getTurnCount(),
    };

    yield* this.runExecution(input, session);
  }
}
