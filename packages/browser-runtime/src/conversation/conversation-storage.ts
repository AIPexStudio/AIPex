import { IndexedDBStorage } from "../storage/indexeddb-storage";
import { LRUPolicy } from "./lru-policy";
import { ConversationMigration } from "./migration";
import type {
  ConversationData,
  ConversationStorageConfig,
  UIMessage,
} from "./types";

/**
 * Conversation Storage Manager
 * Manages conversation persistence using IndexedDB with LRU policy
 */
export class ConversationStorage {
  private readonly storage: IndexedDBStorage<ConversationData>;
  private readonly lruPolicy: LRUPolicy;
  private readonly config: Required<ConversationStorageConfig>;
  private migrationPromise: Promise<void> | null = null;

  constructor(config: ConversationStorageConfig = {}) {
    this.config = {
      maxConversations: config.maxConversations ?? 5,
      dbName: config.dbName ?? "aipex-conversations-db",
      storeName: config.storeName ?? "conversations",
    };

    this.storage = new IndexedDBStorage<ConversationData>({
      dbName: this.config.dbName,
      storeName: this.config.storeName,
      version: 1,
      indexes: [{ name: "updatedAt", keyPath: "updatedAt", unique: false }],
    });

    this.lruPolicy = new LRUPolicy(this.config.maxConversations);

    // Trigger migration on initialization
    this.migrationPromise = this.performMigration();
  }

  /**
   * Perform migration from localStorage (only once)
   */
  private async performMigration(): Promise<void> {
    try {
      const result = await ConversationMigration.migrate(
        async (conversation) => {
          await this.storage.save(conversation.id, conversation);
        },
      );

      if (result.migratedCount > 0) {
        // Apply LRU after migration
        await this.applyLRU();
      }
    } catch (error) {
      console.error("❌ [ConversationStorage] Migration error:", error);
    }
  }

  /**
   * Ensure migration is complete before operations
   */
  private async ensureMigrated(): Promise<void> {
    if (this.migrationPromise) {
      await this.migrationPromise;
    }
  }

  /**
   * Generate conversation title from messages
   */
  private generateTitle(messages: UIMessage[]): string {
    const firstUserMessage = messages.find((msg) => msg.role === "user");
    if (!firstUserMessage) {
      return "新对话";
    }

    const textPart = firstUserMessage.parts.find(
      (part) => part.type === "text",
    );
    if (textPart && "text" in textPart && textPart.text) {
      const text = textPart.text;
      return text.length > 30 ? `${text.slice(0, 30)}...` : text;
    }

    return "新对话";
  }

  /**
   * Filter out system messages
   */
  private filterMessages(messages: UIMessage[]): UIMessage[] {
    return messages.filter((msg) => msg.role !== "system");
  }

  /**
   * Apply LRU policy: delete oldest conversations if exceeding limit
   */
  private async applyLRU(): Promise<void> {
    try {
      const allConversations = await this.storage.listAll();
      const { toDelete } = this.lruPolicy.apply(allConversations);

      if (toDelete.length > 0) {
        console.log(
          `🗑️ [ConversationStorage] LRU: Removing ${toDelete.length} old conversation(s)`,
        );
        await Promise.all(toDelete.map((conv) => this.storage.delete(conv.id)));
      }
    } catch (error) {
      console.error("❌ [ConversationStorage] Failed to apply LRU:", error);
    }
  }

  /**
   * Save a new conversation
   * Returns the conversation ID
   */
  async saveConversation(messages: UIMessage[]): Promise<string> {
    await this.ensureMigrated();

    if (messages.length === 0) {
      return "";
    }

    const messagesToSave = this.filterMessages(messages);
    if (messagesToSave.length === 0) {
      return "";
    }

    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    const title = this.generateTitle(messagesToSave);

    const conversation: ConversationData = {
      id: conversationId,
      title,
      messages: messagesToSave,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await this.storage.save(conversationId, conversation);
      await this.applyLRU();
      console.log(
        "💾 [ConversationStorage] Conversation saved:",
        conversationId,
        title,
      );
      return conversationId;
    } catch (error) {
      console.error(
        "❌ [ConversationStorage] Failed to save conversation:",
        error,
      );
      return "";
    }
  }

  /**
   * Get all conversations (sorted by updatedAt, most recent first)
   */
  async getAllConversations(): Promise<ConversationData[]> {
    await this.ensureMigrated();

    try {
      const conversations = await this.storage.listAll();
      return this.lruPolicy.sortByTimestamp(conversations);
    } catch (error) {
      console.error(
        "❌ [ConversationStorage] Failed to get all conversations:",
        error,
      );
      return [];
    }
  }

  /**
   * Get a single conversation by ID
   * Updates the conversation's updatedAt timestamp (LRU access tracking)
   */
  async getConversation(
    conversationId: string,
  ): Promise<ConversationData | null> {
    await this.ensureMigrated();

    try {
      const conversation = await this.storage.load(conversationId);
      if (!conversation) {
        return null;
      }

      // Update access time for LRU
      conversation.updatedAt = Date.now();
      await this.storage.save(conversationId, conversation);

      console.log(
        "🔄 [ConversationStorage] Conversation access time updated:",
        conversationId,
      );
      return conversation;
    } catch (error) {
      console.error(
        "❌ [ConversationStorage] Failed to get conversation:",
        error,
      );
      return null;
    }
  }

  /**
   * Update an existing conversation
   */
  async updateConversation(
    conversationId: string,
    messages: UIMessage[],
  ): Promise<void> {
    await this.ensureMigrated();

    try {
      const conversation = await this.storage.load(conversationId);
      if (!conversation) {
        console.warn(
          "⚠️ [ConversationStorage] Conversation not found for update:",
          conversationId,
        );
        return;
      }

      const messagesToSave = this.filterMessages(messages);
      conversation.messages = messagesToSave;
      conversation.updatedAt = Date.now();

      await this.storage.save(conversationId, conversation);
      console.log(
        "📝 [ConversationStorage] Conversation updated:",
        conversationId,
      );
    } catch (error) {
      console.error(
        "❌ [ConversationStorage] Failed to update conversation:",
        error,
      );
    }
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string): Promise<void> {
    await this.ensureMigrated();

    try {
      await this.storage.delete(conversationId);
      console.log(
        "🗑️ [ConversationStorage] Conversation deleted:",
        conversationId,
      );
    } catch (error) {
      console.error(
        "❌ [ConversationStorage] Failed to delete conversation:",
        error,
      );
    }
  }

  /**
   * Clear all conversations
   */
  async clearAllConversations(): Promise<void> {
    await this.ensureMigrated();

    try {
      await this.storage.clear();
      console.log("🧹 [ConversationStorage] All conversations cleared");
    } catch (error) {
      console.error(
        "❌ [ConversationStorage] Failed to clear conversations:",
        error,
      );
    }
  }

  /**
   * Close the storage (cleanup)
   */
  async close(): Promise<void> {
    await this.storage.close();
  }
}

// Export singleton instance
export const conversationStorage = new ConversationStorage();
