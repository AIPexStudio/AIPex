import type { Session } from "./session.js";

export interface SessionSummary {
  id: string;
  preview: string;
  createdAt: number;
  lastActiveAt: number;
  totalTurns: number;
  tags?: string[];
}

export interface StorageAdapter {
  save(session: Session): Promise<void>;
  load(id: string): Promise<Session | null>;
  delete(id: string): Promise<void>;
  listAll(): Promise<SessionSummary[]>;
}
