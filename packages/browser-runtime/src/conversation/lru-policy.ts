import type { ConversationData } from "./types";

/**
 * LRU (Least Recently Used) policy for conversation management
 */
export class LRUPolicy {
  private readonly maxItems: number;

  constructor(maxItems: number = 5) {
    this.maxItems = maxItems;
  }

  /**
   * Sort conversations by updatedAt (most recent first)
   */
  sortByTimestamp(conversations: ConversationData[]): ConversationData[] {
    return [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Apply LRU policy: keep only the most recent conversations
   * Returns conversations to keep and conversations to delete
   */
  apply(conversations: ConversationData[]): {
    toKeep: ConversationData[];
    toDelete: ConversationData[];
  } {
    if (conversations.length <= this.maxItems) {
      return {
        toKeep: conversations,
        toDelete: [],
      };
    }

    const sorted = this.sortByTimestamp(conversations);
    return {
      toKeep: sorted.slice(0, this.maxItems),
      toDelete: sorted.slice(this.maxItems),
    };
  }

  /**
   * Get conversations that should be deleted
   */
  getExpiredConversations(
    conversations: ConversationData[],
  ): ConversationData[] {
    if (conversations.length <= this.maxItems) {
      return [];
    }
    const sorted = this.sortByTimestamp(conversations);
    return sorted.slice(this.maxItems);
  }
}
