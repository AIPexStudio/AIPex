import type {
  CompletedTurn,
  ForkInfo,
  Message,
  SerializedSession,
  SessionConfig,
  SessionStats,
  SessionSummary,
} from "../types.js";
import { generateId } from "../utils/id-generator.js";

export class Session {
  readonly id: string;
  readonly parentSessionId?: string;
  readonly forkAtTurn?: number;
  private turns: CompletedTurn[] = [];
  private systemPrompt?: string;
  private metadata: Record<string, unknown> = {};
  private config: SessionConfig;
  private preview?: string;

  constructor(id?: string, config: SessionConfig = {}, forkInfo?: ForkInfo) {
    this.id = id ?? generateId();
    this.config = config;
    this.systemPrompt = config.systemPrompt;
    this.parentSessionId = forkInfo?.parentSessionId;
    this.forkAtTurn = forkInfo?.forkAtTurn;

    if (!this.metadata["createdAt"]) {
      this.metadata["createdAt"] = Date.now();
    }
  }

  addTurn(turn: CompletedTurn): void {
    this.turns.push(turn);
    this.updatePreview();
  }

  getMessages(): Message[] {
    const messages: Message[] = [];

    if (this.systemPrompt) {
      messages.push({
        role: "system",
        content: this.systemPrompt,
      });
    }

    for (const turn of this.turns) {
      messages.push({
        role: "user",
        content: turn.userMessage.content,
      });

      messages.push({
        role: "assistant",
        content: turn.assistantMessage.content,
      });

      for (const call of turn.functionCalls) {
        messages.push({
          role: "function",
          content: JSON.stringify(call),
        });
      }
    }

    return messages;
  }

  getRecentTurns(count: number): CompletedTurn[] {
    return this.turns.slice(-count);
  }

  getTurnCount(): number {
    return this.turns.length;
  }

  getStats(): SessionStats {
    const messageCount = this.turns.reduce(
      (sum, turn) => sum + 2 + turn.functionCalls.length,
      0,
    );
    const toolCallCount = this.turns.reduce(
      (sum, turn) => sum + turn.functionCalls.length,
      0,
    );
    const totalTokens = this.turns.reduce(
      (sum, turn) => sum + (turn.metadata?.tokensUsed ?? 0),
      0,
    );
    const totalDuration = this.turns.reduce(
      (sum, turn) => sum + (turn.metadata?.duration ?? 0),
      0,
    );

    return {
      messageCount,
      turnCount: this.turns.length,
      toolCallCount,
      totalTokens,
      totalDuration,
    };
  }

  getSummary(): SessionSummary {
    const now = Date.now();
    const createdAtValue = this.metadata["createdAt"];
    const createdAt = typeof createdAtValue === "number" ? createdAtValue : now;

    const lastActiveAtValue = this.metadata["lastActiveAt"];
    let lastActiveAt =
      typeof lastActiveAtValue === "number" ? lastActiveAtValue : now;

    if (this.turns.length > 0) {
      const lastTurn = this.turns[this.turns.length - 1];
      lastActiveAt = lastTurn.timestamp ?? lastActiveAt;
    }

    const tagsValue = this.metadata["tags"];
    const tags = Array.isArray(tagsValue) ? tagsValue : [];

    return {
      id: this.id,
      preview: this.preview ?? "",
      createdAt,
      lastActiveAt,
      turnCount: this.turns.length,
      tags,
      parentSessionId: this.parentSessionId,
      forkAtTurn: this.forkAtTurn,
    };
  }

  fork(atTurn?: number): Session {
    const turnIndex = atTurn !== undefined ? atTurn : this.turns.length - 1;

    if (turnIndex < 0 || turnIndex >= this.turns.length) {
      throw new Error(
        `Invalid turn index: ${turnIndex}. Must be between 0 and ${this.turns.length - 1}`,
      );
    }

    const forkedSession = new Session(
      undefined,
      { ...this.config },
      {
        parentSessionId: this.id,
        forkAtTurn: turnIndex,
      },
    );

    forkedSession.turns = this.turns.slice(0, turnIndex + 1);
    forkedSession.systemPrompt = this.systemPrompt;
    forkedSession.metadata = { ...this.metadata, createdAt: Date.now() };
    forkedSession.updatePreview();

    return forkedSession;
  }

  getTurnsUpTo(turnIndex: number): CompletedTurn[] {
    if (turnIndex < 0 || turnIndex >= this.turns.length) {
      throw new Error(
        `Invalid turn index: ${turnIndex}. Must be between 0 and ${this.turns.length - 1}`,
      );
    }
    return this.turns.slice(0, turnIndex + 1);
  }

  getForkInfo(): ForkInfo {
    return {
      parentSessionId: this.parentSessionId,
      forkAtTurn: this.forkAtTurn,
    };
  }

  setSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
  }

  setMetadata(key: string, value: unknown): void {
    this.metadata[key] = value;
  }

  getMetadata(key: string): unknown {
    return this.metadata[key];
  }

  private updatePreview(): void {
    if (this.turns.length > 0) {
      const firstMessage = this.turns[0].userMessage.content.trim();
      const maxLength = 50;
      this.preview =
        firstMessage.length > maxLength
          ? `${firstMessage.slice(0, maxLength)}...`
          : firstMessage;
    }
  }

  toJSON(): SerializedSession {
    return {
      id: this.id,
      turns: this.turns,
      systemPrompt: this.systemPrompt,
      metadata: this.metadata,
      config: this.config,
      parentSessionId: this.parentSessionId,
      forkAtTurn: this.forkAtTurn,
    };
  }

  static fromJSON(data: SerializedSession): Session {
    if (!data || typeof data !== "object" || !data.id) {
      throw new Error("Invalid session data: missing required fields");
    }
    const session = new Session(data.id, data.config, {
      parentSessionId: data.parentSessionId,
      forkAtTurn: data.forkAtTurn,
    });
    session.turns = data.turns ?? [];
    session.systemPrompt = data.systemPrompt;
    session.metadata = data.metadata ?? {};
    session.updatePreview();
    return session;
  }
}
