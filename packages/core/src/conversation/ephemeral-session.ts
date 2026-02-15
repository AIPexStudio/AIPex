/**
 * Ephemeral (in-memory, non-persistent) session that implements the
 * `@openai/agents` Session interface.
 *
 * Used in stateless mode (conversation: false) so that the OpenAI Agents
 * runner still has a session to work with.  Screenshot shaping (strip base64
 * imageData, inject transient user image message) is handled by the
 * `callModelInputFilter` hook in AIPex, not by the session itself.
 *
 * This class intentionally imports only from `../utils/` to avoid circular
 * dependencies with the persistence layer (session.ts, manager.ts, storage.ts).
 */

import type { AgentInputItem, Session } from "@openai/agents";
import { generateId } from "../utils/id-generator.js";

export class EphemeralSession implements Session {
  readonly id: string;
  private items: AgentInputItem[] = [];

  constructor(id?: string) {
    this.id = id ?? generateId();
  }

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
  }

  async popItem(): Promise<AgentInputItem | undefined> {
    return this.items.pop();
  }

  async clearSession(): Promise<void> {
    this.items = [];
  }

  getItemCount(): number {
    return this.items.length;
  }
}
