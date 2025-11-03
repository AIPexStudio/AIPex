import type { UnifiedMessage } from "../llm/types.js";
import { generateId } from "../utils/id-generator.js";
import { extractPreview, generateDefaultPreview } from "./preview.js";
import type { SessionSummary } from "./storage.js";
import type {
  CompletedTurn,
  SerializedSession,
  SessionConfig,
  SessionMetadata,
  SessionStats,
} from "./types.js";

export class Session {
  readonly id: string;
  private turns: CompletedTurn[] = [];
  private systemPrompt?: string;
  private metadata: SessionMetadata;
  private config: SessionConfig;
  private preview: string;

  constructor(id?: string, config: SessionConfig = {}) {
    this.id = id || generateId();
    this.systemPrompt = config.systemPrompt;
    this.config = {
      maxHistoryLength: config.maxHistoryLength || 100,
      maxContextTokens: config.maxContextTokens || 10000,
      keepRecentTurns: config.keepRecentTurns || 10,
    };
    this.metadata = {
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    };
    this.preview = generateDefaultPreview(this.metadata.createdAt);
  }

  addTurn(turn: CompletedTurn): void {
    this.turns.push(turn);
    this.metadata.lastActiveAt = Date.now();
    this.metadata.totalTurns = this.turns.length;

    // Update preview with first user message (only on first turn)
    if (this.turns.length === 1) {
      this.preview = extractPreview(turn.userMessage.content);
    }

    // Simple length-based truncation - check if we exceeded the limit after adding
    const maxLength = this.config.maxHistoryLength!;
    if (this.turns.length > maxLength) {
      // Keep only the most recent turns
      const keepCount = this.config.keepRecentTurns!;
      this.turns = this.turns.slice(-keepCount);
    }
  }

  getMessages(): UnifiedMessage[] {
    const messages: UnifiedMessage[] = [];

    // Add system prompt if exists
    if (this.systemPrompt) {
      messages.push({
        role: "system",
        content: this.systemPrompt,
      });
    }

    // Convert turns to message sequence
    for (const turn of this.turns) {
      messages.push(turn.userMessage);

      // Add assistant message
      if (turn.assistantMessage.content || turn.functionCalls.length === 0) {
        messages.push(turn.assistantMessage);
      }

      // Add function calls and responses
      for (let i = 0; i < turn.functionCalls.length; i++) {
        messages.push({
          role: "assistant",
          content: "",
          functionCall: turn.functionCalls[i],
        });

        if (turn.functionResults[i]) {
          messages.push({
            role: "function",
            content: JSON.stringify(turn.functionResults[i].result),
            functionResponse: turn.functionResults[i],
          });
        }
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
    const totalTurns = this.turns.length;
    const totalTokens = this.turns.reduce(
      (sum, turn) => sum + (turn.metadata?.tokensUsed || 0),
      0,
    );
    const totalDuration = this.turns.reduce(
      (sum, turn) => sum + (turn.metadata?.duration || 0),
      0,
    );
    const avgTurnDuration = totalTurns > 0 ? totalDuration / totalTurns : 0;
    const toolCallCount = this.turns.reduce(
      (sum, turn) => sum + turn.functionCalls.length,
      0,
    );

    return {
      totalTurns,
      totalTokens,
      avgTurnDuration,
      toolCallCount,
      createdAt: this.metadata.createdAt,
      lastActiveAt: this.metadata.lastActiveAt,
    };
  }

  getSummary(): SessionSummary {
    return {
      id: this.id,
      preview: this.preview,
      createdAt: this.metadata.createdAt,
      lastActiveAt: this.metadata.lastActiveAt,
      totalTurns: this.turns.length,
      tags: this.metadata.tags,
    };
  }

  setSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
  }

  toJSON(): SerializedSession {
    return {
      id: this.id,
      turns: this.turns,
      systemPrompt: this.systemPrompt,
      metadata: this.metadata,
      config: this.config,
      preview: this.preview,
    };
  }

  static fromJSON(data: SerializedSession): Session {
    const session = new Session(data.id, data.config);
    session.turns = data.turns;
    session.systemPrompt = data.systemPrompt;
    session.metadata = data.metadata;
    session.preview =
      data.preview || generateDefaultPreview(data.metadata.createdAt);
    return session;
  }
}
