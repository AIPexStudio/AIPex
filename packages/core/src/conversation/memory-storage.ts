import type { Session } from "./session.js";
import type { SessionSummary, StorageAdapter } from "./storage.js";

export class InMemoryStorage implements StorageAdapter {
  private sessions = new Map<string, Session>();

  async save(session: Session): Promise<void> {
    this.sessions.set(session.id, session);
  }

  async load(id: string): Promise<Session | null> {
    return this.sessions.get(id) || null;
  }

  async delete(id: string): Promise<void> {
    this.sessions.delete(id);
  }

  async listAll(): Promise<SessionSummary[]> {
    return Array.from(this.sessions.values()).map((session) => {
      const stats = session.getStats();
      return {
        id: session.id,
        turnCount: stats.totalTurns,
        createdAt: stats.createdAt,
        lastActiveAt: stats.lastActiveAt,
      };
    });
  }

  clear(): void {
    this.sessions.clear();
  }
}
