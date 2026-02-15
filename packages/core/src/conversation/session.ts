import type { AgentInputItem, Session as OpenAISession } from "@openai/agents";
import type {
  AgentMetrics,
  ForkInfo,
  SerializedSession,
  SessionConfig,
  SessionMetrics,
  SessionSummary,
} from "../types.js";
import { generateId } from "../utils/id-generator.js";
import {
  isTransientScreenshotItem,
  pruneTransientScreenshotItems,
  shapeScreenshotItems,
} from "../utils/screenshot-shaping.js";

function createEmptySessionMetrics(): SessionMetrics {
  return {
    totalTokensUsed: 0,
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    executionCount: 0,
  };
}

export class Session implements OpenAISession {
  readonly id: string;
  readonly parentSessionId?: string;
  readonly forkAtItemIndex?: number;
  private items: AgentInputItem[] = [];
  private metadata: Record<string, unknown> = {};
  private config: SessionConfig;
  private preview?: string;
  private sessionMetrics: SessionMetrics = createEmptySessionMetrics();

  constructor(id?: string, config: SessionConfig = {}, forkInfo?: ForkInfo) {
    this.id = id ?? generateId();
    this.config = config;
    this.parentSessionId = forkInfo?.parentSessionId;
    this.forkAtItemIndex = forkInfo?.forkAtItemIndex;

    if (!this.metadata["createdAt"]) {
      this.metadata["createdAt"] = Date.now();
    }
  }

  // OpenAI Session interface implementation

  async getSessionId(): Promise<string> {
    return this.id;
  }

  async getItems(limit?: number): Promise<AgentInputItem[]> {
    if (limit === undefined) {
      return [...this.items];
    }
    return this.items.slice(-limit);
  }

  async addItems(items: AgentInputItem[]): Promise<void> {
    // Shape screenshot tool results: strip base64 imageData from the tool
    // result and inject a transient user message with the real image so the
    // model can consume it via the standard vision path.
    const shaped = shapeScreenshotItems(items);
    this.items.push(...shaped);
    this.metadata["lastActiveAt"] = Date.now();
    this.updatePreview();
  }

  async popItem(): Promise<AgentInputItem | undefined> {
    return this.items.pop();
  }

  async clearSession(): Promise<void> {
    this.items = [];
    this.preview = undefined;
  }

  // Extended functionality

  getItemCount(): number {
    return this.items.length;
  }

  getSummary(): SessionSummary {
    const now = Date.now();
    const createdAtValue = this.metadata["createdAt"];
    const createdAt = typeof createdAtValue === "number" ? createdAtValue : now;

    const lastActiveAtValue = this.metadata["lastActiveAt"];
    const lastActiveAt =
      typeof lastActiveAtValue === "number" ? lastActiveAtValue : createdAt;

    const tagsValue = this.metadata["tags"];
    const tags = Array.isArray(tagsValue) ? tagsValue : [];

    return {
      id: this.id,
      preview: this.preview ?? "",
      createdAt,
      lastActiveAt,
      itemCount: this.items.length,
      tags,
      parentSessionId: this.parentSessionId,
      forkAtItemIndex: this.forkAtItemIndex,
    };
  }

  fork(atItemIndex?: number): Session {
    const index = atItemIndex ?? this.items.length - 1;

    if (index < 0 || index >= this.items.length) {
      throw new Error(
        `Invalid item index: ${index}. Must be between 0 and ${this.items.length - 1}`,
      );
    }

    const forkedSession = new Session(
      undefined,
      { ...this.config },
      {
        parentSessionId: this.id,
        forkAtItemIndex: index,
      },
    );

    forkedSession.items = structuredClone(this.items.slice(0, index + 1));
    const now = Date.now();
    forkedSession.metadata = {
      ...structuredClone(this.metadata),
      createdAt: now,
      lastActiveAt: now,
    };
    forkedSession.updatePreview();

    return forkedSession;
  }

  getForkInfo(): ForkInfo {
    return {
      parentSessionId: this.parentSessionId,
      forkAtItemIndex: this.forkAtItemIndex,
    };
  }

  addMetrics(delta: Partial<AgentMetrics>): void {
    this.sessionMetrics.totalTokensUsed += delta.tokensUsed ?? 0;
    this.sessionMetrics.totalPromptTokens += delta.promptTokens ?? 0;
    this.sessionMetrics.totalCompletionTokens += delta.completionTokens ?? 0;
    this.sessionMetrics.executionCount += 1;
  }

  getSessionMetrics(): SessionMetrics {
    return { ...this.sessionMetrics };
  }

  setMetadata(key: string, value: unknown): void {
    this.metadata[key] = value;
  }

  getMetadata(key: string): unknown {
    return this.metadata[key];
  }

  private updatePreview(): void {
    const latestUserMessage = [...this.items]
      .reverse()
      .find(
        (item) =>
          item.type === "message" &&
          item.role === "user" &&
          !isTransientScreenshotItem(item),
      );

    const previewSource =
      this.extractContent(latestUserMessage) ??
      this.tryGetStringMetadata("lastSummary");

    if (!previewSource) {
      this.preview = undefined;
      return;
    }

    const maxLength = 50;
    const normalized = previewSource.trim();
    this.preview =
      normalized.length > maxLength
        ? `${normalized.slice(0, maxLength)}...`
        : normalized;
  }

  private extractContent(
    message: AgentInputItem | undefined,
  ): string | undefined {
    if (!message || !("content" in message)) {
      return undefined;
    }

    const content = message.content;
    if (typeof content === "string") {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .filter((c) => c.type === "input_text")
        .map((c) => (c as { text: string }).text)
        .join(" ");
    }

    return undefined;
  }

  private tryGetStringMetadata(key: string): string | undefined {
    const value = this.metadata[key];
    return typeof value === "string" && value.trim().length > 0
      ? value
      : undefined;
  }

  toJSON(): SerializedSession {
    return {
      id: this.id,
      // Prune transient screenshot user-image messages before persisting
      // to avoid storing large base64 blobs in conversation history.
      items: pruneTransientScreenshotItems(this.items),
      metadata: this.metadata,
      config: this.config,
      metrics: this.sessionMetrics,
      parentSessionId: this.parentSessionId,
      forkAtItemIndex: this.forkAtItemIndex,
    };
  }

  static fromJSON(data: SerializedSession): Session {
    if (!data || typeof data !== "object" || !data.id) {
      throw new Error("Invalid session data: missing required fields");
    }
    const session = new Session(data.id, data.config, {
      parentSessionId: data.parentSessionId,
      forkAtItemIndex: data.forkAtItemIndex,
    });
    session.items = data.items ?? [];
    session.metadata = data.metadata ?? {};
    session.sessionMetrics = data.metrics ?? createEmptySessionMetrics();
    session.updatePreview();
    return session;
  }
}
