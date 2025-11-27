import type {
  SessionStorageAdapter,
  SessionSummary,
  SessionTree,
} from "../types.js";
import type { Session } from "./session.js";

export class InMemorySessionStorage implements SessionStorageAdapter {
  private sessions = new Map<string, Session>();

  async save(session: Session): Promise<void> {
    this.sessions.set(session.id, session);
  }

  async load(id: string): Promise<Session | null> {
    return this.sessions.get(id) ?? null;
  }

  async delete(id: string): Promise<void> {
    this.sessions.delete(id);
  }

  async listAll(): Promise<SessionSummary[]> {
    return Array.from(this.sessions.values()).map((session) =>
      session.getSummary(),
    );
  }

  async getChildren(parentId: string): Promise<SessionSummary[]> {
    const allSummaries = await this.listAll();
    return allSummaries.filter(
      (summary) => summary.parentSessionId === parentId,
    );
  }

  async getSessionTree(rootId?: string): Promise<SessionTree[]> {
    const allSummaries = await this.listAll();

    const buildTree = (parentId?: string): SessionTree[] => {
      const children = allSummaries.filter(
        (s) => s.parentSessionId === parentId,
      );

      return children.map((session) => ({
        session,
        children: buildTree(session.id),
      }));
    };

    if (rootId) {
      const rootSession = allSummaries.find((s) => s.id === rootId);
      if (!rootSession) {
        return [];
      }
      return [
        {
          session: rootSession,
          children: buildTree(rootId),
        },
      ];
    }

    return buildTree(undefined);
  }

  clear(): void {
    this.sessions.clear();
  }
}
