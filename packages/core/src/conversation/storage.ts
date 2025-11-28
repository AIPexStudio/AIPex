import type { KeyValueStorage } from "../storage/index.js";
import type {
  SerializedSession,
  SessionStorageAdapter,
  SessionSummary,
  SessionTree,
} from "../types.js";
import { Session } from "./session.js";

export class SessionStorage implements SessionStorageAdapter {
  constructor(private storage: KeyValueStorage<SerializedSession>) {}

  async save(session: Session): Promise<void> {
    await this.storage.save(session.id, session.toJSON());
  }

  async load(id: string): Promise<Session | null> {
    const data = await this.storage.load(id);
    if (!data) return null;

    try {
      return Session.fromJSON(data);
    } catch (error) {
      console.error(`Failed to deserialize session: ${error}`);
      return null;
    }
  }

  async delete(id: string): Promise<void> {
    await this.storage.delete(id);
  }

  async listAll(): Promise<SessionSummary[]> {
    const allSessions = await this.storage.listAll();
    const summaries: SessionSummary[] = [];

    for (const data of allSessions) {
      try {
        const session = Session.fromJSON(data);
        summaries.push(session.getSummary());
      } catch (error) {
        console.error(`Failed to deserialize session: ${error}`);
      }
    }

    return summaries;
  }

  async getChildren(parentId: string): Promise<SessionSummary[]> {
    const allSummaries = await this.listAll();
    return allSummaries.filter((s) => s.parentSessionId === parentId);
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
}
