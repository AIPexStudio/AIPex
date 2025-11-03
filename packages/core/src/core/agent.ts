import type { LLMProvider } from "../llm/provider.js";
import type { ToolRegistry } from "../tools/registry.js";
import { generateId } from "../utils/id-generator.js";
import type { AgentEvent } from "./events.js";
import { AgentExecutor, type ExecutorConfig } from "./executor.js";

export interface AgentConfig extends ExecutorConfig {
  llm: LLMProvider;
  tools: ToolRegistry;
}

export class Agent {
  private sessions = new Map<string, AgentExecutor>();

  constructor(
    private llmProvider: LLMProvider,
    private toolRegistry: ToolRegistry,
    private config: ExecutorConfig = {},
  ) {}

  static create(config: AgentConfig): Agent {
    return new Agent(config.llm, config.tools, config);
  }

  async *execute(input: string): AsyncGenerator<AgentEvent> {
    const sessionId = generateId();
    yield { type: "session_created", sessionId };

    yield* this.executeInSession(sessionId, input);
  }

  async *continueConversation(
    sessionId: string,
    input: string,
  ): AsyncGenerator<AgentEvent> {
    yield* this.executeInSession(sessionId, input);
  }

  private async *executeInSession(
    sessionId: string,
    input: string,
  ): AsyncGenerator<AgentEvent> {
    let executor = this.sessions.get(sessionId);

    if (!executor) {
      executor = new AgentExecutor(
        sessionId,
        this.llmProvider,
        this.toolRegistry,
        this.config,
      );
      this.sessions.set(sessionId, executor);
    }

    yield* executor.run(input);
  }

  async interrupt(sessionId: string): Promise<void> {
    const executor = this.sessions.get(sessionId);
    if (executor) {
      await executor.interrupt();
    }
  }

  getSession(sessionId: string): AgentExecutor | undefined {
    return this.sessions.get(sessionId);
  }

  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  listSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  getToolRegistry(): ToolRegistry {
    return this.toolRegistry;
  }
}
