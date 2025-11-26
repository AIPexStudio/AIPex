import { LRUCache } from "lru-cache";
import type {
  SessionConfig,
  SessionStorageAdapter,
  SessionSummary,
  SessionTree,
} from "../types.js";
import { generateId } from "../utils/id-generator.js";
import { Session } from "./session.js";

export interface ConversationManagerConfig {
  cacheSize?: number;
  cacheTTL?: number;
}

export class ConversationManager {
  private cache: LRUCache<string, Session>;

  constructor(
    private storage: SessionStorageAdapter,
    config: ConversationManagerConfig = {},
  ) {
    this.cache = new LRUCache<string, Session>({
      max: config.cacheSize ?? 100,
      ttl: config.cacheTTL ?? 1000 * 60 * 30, // 30 minutes default
      updateAgeOnGet: true,
      updateAgeOnHas: true,
    });
  }

  async createSession(config?: SessionConfig): Promise<Session> {
    const session = new Session(generateId(), config);
    await this.storage.save(session);
    this.cache.set(session.id, session);
    return session;
  }

  async getSession(id: string): Promise<Session | null> {
    // Check cache first
    if (this.cache.has(id)) {
      return this.cache.get(id) ?? null;
    }

    // Load from storage
    const session = await this.storage.load(id);
    if (session) {
      this.cache.set(id, session);
    }
    return session;
  }

  async saveSession(session: Session): Promise<void> {
    // Update cache
    this.cache.set(session.id, session);
    // Persist to storage
    await this.storage.save(session);
  }

  async deleteSession(id: string): Promise<void> {
    this.cache.delete(id);
    await this.storage.delete(id);
  }

  /**
   * List all sessions with filtering, sorting, and pagination
   * Reference: codex-rs/app-server/src/codex_message_processor.rs:887-954
   */
  async listSessions(options?: {
    limit?: number;
    offset?: number;
    sortBy?: "createdAt" | "lastActiveAt";
    tags?: string[];
  }): Promise<SessionSummary[]> {
    // Get all session summaries
    const summaries = await this.storage.listAll();

    // Filter (if tags provided)
    let filtered = summaries;
    if (options?.tags && options.tags.length > 0) {
      filtered = filtered.filter((s) =>
        s.tags?.some((tag) => options.tags?.includes(tag) ?? false),
      );
    }

    // Sort
    const sortBy = options?.sortBy ?? "lastActiveAt";
    filtered.sort((a, b) => b[sortBy] - a[sortBy]);

    // Paginate
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;

    return filtered.slice(offset, offset + limit);
  }

  async forkSession(sessionId: string, atTurn?: number): Promise<Session> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const forkedSession = session.fork(atTurn);
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
}
