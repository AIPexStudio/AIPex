import type { AgentInputItem } from "@openai/agents";
import { LRUCache } from "lru-cache";
import type {
  SessionConfig,
  SessionStorageAdapter,
  SessionSummary,
  SessionTree,
} from "../types.js";
import { generateId } from "../utils/id-generator.js";
import type { ConversationCompressor } from "./compressor.js";
import { Session } from "./session.js";

export interface ConversationManagerConfig {
  cacheSize?: number;
  cacheTTL?: number;
  compressor?: ConversationCompressor;
}

export class ConversationManager {
  private cache: LRUCache<string, Session>;
  private compressor?: ConversationCompressor;

  constructor(
    private storage: SessionStorageAdapter,
    config: ConversationManagerConfig = {},
  ) {
    this.cache = new LRUCache<string, Session>({
      max: config.cacheSize ?? 100,
      ttl: config.cacheTTL ?? 1000 * 60 * 30,
      updateAgeOnGet: true,
      updateAgeOnHas: true,
    });
    this.compressor = config.compressor;
  }

  async createSession(config?: SessionConfig): Promise<Session> {
    const session = new Session(generateId(), config);
    await this.storage.save(session);
    this.cache.set(session.id, session);
    return session;
  }

  async getSession(id: string): Promise<Session | null> {
    if (this.cache.has(id)) {
      return this.cache.get(id) ?? null;
    }

    const session = await this.storage.load(id);
    if (session) {
      this.cache.set(id, session);
    }
    return session;
  }

  async saveSession(session: Session): Promise<void> {
    if (this.compressor?.shouldCompress(session.getItemCount())) {
      await this.doCompress(session);
    }
    this.cache.set(session.id, session);
    await this.storage.save(session);
  }

  async compressSession(
    sessionId: string,
  ): Promise<{ compressed: boolean; summary?: string }> {
    if (!this.compressor) {
      return { compressed: false };
    }
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }
    const { summary } = await this.doCompress(session);
    this.cache.set(session.id, session);
    await this.storage.save(session);
    return { compressed: true, summary };
  }

  private async doCompress(session: Session): Promise<{ summary: string }> {
    const items = await session.getItems();
    const { summary, compressedItems } =
      await this.compressor!.compressItems(items);

    const nextItems =
      summary.trim().length > 0
        ? [this.createSummaryItem(summary), ...compressedItems]
        : compressedItems;

    await session.clearSession();
    session.setMetadata("lastSummary", summary);
    await session.addItems(nextItems);

    return { summary };
  }

  async deleteSession(id: string): Promise<void> {
    this.cache.delete(id);
    await this.storage.delete(id);
  }

  async listSessions(options?: {
    limit?: number;
    offset?: number;
    sortBy?: "createdAt" | "lastActiveAt";
    tags?: string[];
  }): Promise<SessionSummary[]> {
    const summaries = await this.storage.listAll();

    let filtered = summaries;
    if (options?.tags && options.tags.length > 0) {
      filtered = filtered.filter((s) =>
        s.tags?.some((tag) => options.tags?.includes(tag) ?? false),
      );
    }

    const sortBy = options?.sortBy ?? "lastActiveAt";
    filtered.sort((a, b) => b[sortBy] - a[sortBy]);

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;

    return filtered.slice(offset, offset + limit);
  }

  async forkSession(sessionId: string, atItemIndex?: number): Promise<Session> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const forkedSession = session.fork(atItemIndex);
    await this.storage.save(forkedSession);
    this.cache.set(forkedSession.id, forkedSession);

    return forkedSession;
  }

  async getSessionTree(rootId?: string): Promise<SessionTree[]> {
    return this.storage.getSessionTree(rootId);
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  private createSummaryItem(summary: string): AgentInputItem {
    return {
      type: "message",
      role: "system",
      content: `Conversation summary:\n${summary}`,
    };
  }
}
