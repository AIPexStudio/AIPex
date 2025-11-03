import type { Session } from "./session.js";

export interface SessionSummary {
  id: string;
  turnCount: number;
  createdAt: number;
  lastActiveAt: number;
}

export interface StorageAdapter {
  save(session: Session): Promise<void>;
  load(id: string): Promise<Session | null>;
  delete(id: string): Promise<void>;
  listAll(): Promise<SessionSummary[]>;
}
