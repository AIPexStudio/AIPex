import { Session } from "./session.js";
import type { SessionSummary, StorageAdapter } from "./storage.js";

/**
 * LocalStorage adapter for session persistence
 * Works in browser environments
 */
export class LocalStorageAdapter implements StorageAdapter {
  private readonly prefix: string;
  private readonly indexKey: string;

  constructor(prefix = "aipex_session_") {
    this.prefix = prefix;
    this.indexKey = `${prefix}index`;

    if (typeof localStorage === "undefined") {
      throw new Error("LocalStorage is not available in this environment");
    }
  }

  async save(session: Session): Promise<void> {
    try {
      const serialized = session.toJSON();
      const key = this.getKey(session.id);

      // Save session data
      localStorage.setItem(key, JSON.stringify(serialized));

      // Update index
      await this.updateIndex(session.id);
    } catch (error) {
      throw new Error(
        `Failed to save session to localStorage: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async load(id: string): Promise<Session | null> {
    try {
      const key = this.getKey(id);
      const data = localStorage.getItem(key);

      if (!data) {
        return null;
      }

      const serialized = JSON.parse(data);
      return Session.fromJSON(serialized);
    } catch (error) {
      console.error(`Failed to load session from localStorage: ${error}`);
      return null;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const key = this.getKey(id);
      localStorage.removeItem(key);

      // Update index
      await this.removeFromIndex(id);
    } catch (error) {
      throw new Error(
        `Failed to delete session from localStorage: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async listAll(): Promise<SessionSummary[]> {
    try {
      const index = await this.getIndex();
      const summaries: SessionSummary[] = [];

      for (const id of index) {
        const session = await this.load(id);
        if (session) {
          const stats = session.getStats();
          summaries.push({
            id: session.id,
            turnCount: stats.totalTurns,
            createdAt: stats.createdAt,
            lastActiveAt: stats.lastActiveAt,
          });
        }
      }

      return summaries;
    } catch (error) {
      console.error(`Failed to list sessions from localStorage: ${error}`);
      return [];
    }
  }

  async clear(): Promise<void> {
    const index = await this.getIndex();
    for (const id of index) {
      localStorage.removeItem(this.getKey(id));
    }
    localStorage.removeItem(this.indexKey);
  }

  private getKey(id: string): string {
    return `${this.prefix}${id}`;
  }

  private async getIndex(): Promise<string[]> {
    const data = localStorage.getItem(this.indexKey);
    if (!data) {
      return [];
    }
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private async updateIndex(id: string): Promise<void> {
    const index = await this.getIndex();
    if (!index.includes(id)) {
      index.push(id);
      localStorage.setItem(this.indexKey, JSON.stringify(index));
    }
  }

  private async removeFromIndex(id: string): Promise<void> {
    const index = await this.getIndex();
    const filtered = index.filter((itemId) => itemId !== id);
    localStorage.setItem(this.indexKey, JSON.stringify(filtered));
  }
}
