import { Agent as OpenAIAgent, run } from "@openai/agents";
import type { ConversationManager } from "../conversation/manager.js";
import type { Session } from "../conversation/session.js";
import type { AgentEvent, AgentMetrics, AIPexAgentOptions } from "../types.js";

export class AIPexAgent {
  private agent: OpenAIAgent;
  private conversationManager?: ConversationManager;
  private maxTurns: number;

  private constructor(
    agent: OpenAIAgent,
    conversationManager?: ConversationManager,
    maxTurns?: number,
  ) {
    this.agent = agent;
    this.conversationManager = conversationManager;
    this.maxTurns = maxTurns ?? 10;
  }

  static create(options: AIPexAgentOptions): AIPexAgent {
    const agent = new OpenAIAgent({
      name: options.name ?? "Assistant",
      instructions: options.instructions,
      model: options.model,
      tools: options.tools ?? [],
    });

    return new AIPexAgent(agent, options.conversationManager, options.maxTurns);
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

    const result = await run(this.agent, input, {
      maxTurns: this.maxTurns,
      session: session ?? undefined,
    });

    const finalOutput = result.finalOutput ?? "";
    yield { type: "content_delta", delta: finalOutput };

    metrics.itemCount = session?.getItemCount() ?? 0;
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
      await this.conversationManager.saveSession(session);
    }

    yield {
      type: "execution_complete",
      finalOutput,
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
      itemCount: session.getItemCount(),
    };

    yield* this.runExecution(input, session);
  }
}
