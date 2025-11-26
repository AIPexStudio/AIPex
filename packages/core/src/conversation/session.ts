import type { AgentInputItem, Session as OpenAISession } from "@openai/agents";
import type {
  ForkInfo,
  SerializedSession,
  SessionConfig,
  SessionSummary,
} from "../types.js";
import { generateId } from "../utils/id-generator.js";

export class Session implements OpenAISession {
  readonly id: string;
  readonly parentSessionId?: string;
  readonly forkAtItemIndex?: number;
  private items: AgentInputItem[] = [];
  private metadata: Record<string, unknown> = {};
  private config: SessionConfig;
  private preview?: string;

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
    this.items.push(...items);
    this.updatePreview();
    this.metadata["lastActiveAt"] = Date.now();
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

    forkedSession.items = this.items.slice(0, index + 1);
    forkedSession.metadata = { ...this.metadata, createdAt: Date.now() };
    forkedSession.updatePreview();

    return forkedSession;
  }

  getForkInfo(): ForkInfo {
    return {
      parentSessionId: this.parentSessionId,
      forkAtItemIndex: this.forkAtItemIndex,
    };
  }

  setMetadata(key: string, value: unknown): void {
    this.metadata[key] = value;
  }

  getMetadata(key: string): unknown {
    return this.metadata[key];
  }

  private updatePreview(): void {
    const firstUserMessage = this.items.find(
      (item) => item.type === "message" && item.role === "user",
    );
    if (firstUserMessage && "content" in firstUserMessage) {
      const content = firstUserMessage.content;
      const text =
        typeof content === "string"
          ? content
          : Array.isArray(content)
            ? content
                .filter((c) => c.type === "input_text")
                .map((c) => (c as { text: string }).text)
                .join(" ")
            : "";
      const maxLength = 50;
      this.preview =
        text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
    }
  }

  toJSON(): SerializedSession {
    return {
      id: this.id,
      items: this.items,
      metadata: this.metadata,
      config: this.config,
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
    session.updatePreview();
    return session;
  }
}
