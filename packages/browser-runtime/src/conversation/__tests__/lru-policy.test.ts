import { describe, it, expect } from "vitest";
import { LRUPolicy } from "../lru-policy";
import type { ConversationData } from "../types";

describe("LRUPolicy", () => {
  const createMockConversation = (
    id: string,
    updatedAt: number
  ): ConversationData => ({
    id,
    title: `Conversation ${id}`,
    messages: [],
    createdAt: updatedAt - 1000,
    updatedAt,
  });

  describe("sortByTimestamp", () => {
    it("should sort conversations by updatedAt in descending order", () => {
      const policy = new LRUPolicy();
      const conversations = [
        createMockConversation("1", 1000),
        createMockConversation("2", 3000),
        createMockConversation("3", 2000),
      ];

      const sorted = policy.sortByTimestamp(conversations);

      expect(sorted).toHaveLength(3);
      expect(sorted[0]!.id).toBe("2"); // Most recent
      expect(sorted[1]!.id).toBe("3");
      expect(sorted[2]!.id).toBe("1"); // Oldest
    });

    it("should not mutate the original array", () => {
      const policy = new LRUPolicy();
      const conversations = [
        createMockConversation("1", 1000),
        createMockConversation("2", 2000),
      ];
      const original = [...conversations];

      policy.sortByTimestamp(conversations);

      expect(conversations).toEqual(original);
    });
  });

  describe("apply", () => {
    it("should keep all conversations when below limit", () => {
      const policy = new LRUPolicy(5);
      const conversations = [
        createMockConversation("1", 1000),
        createMockConversation("2", 2000),
        createMockConversation("3", 3000),
      ];

      const result = policy.apply(conversations);

      expect(result.toKeep).toHaveLength(3);
      expect(result.toDelete).toHaveLength(0);
    });

    it("should keep exactly maxItems conversations when at limit", () => {
      const policy = new LRUPolicy(3);
      const conversations = [
        createMockConversation("1", 1000),
        createMockConversation("2", 2000),
        createMockConversation("3", 3000),
      ];

      const result = policy.apply(conversations);

      expect(result.toKeep).toHaveLength(3);
      expect(result.toDelete).toHaveLength(0);
    });

    it("should delete oldest conversations when exceeding limit", () => {
      const policy = new LRUPolicy(3);
      const conversations = [
        createMockConversation("1", 1000), // Oldest - should be deleted
        createMockConversation("2", 2000), // Should be deleted
        createMockConversation("3", 3000),
        createMockConversation("4", 4000),
        createMockConversation("5", 5000), // Most recent - should be kept
      ];

      const result = policy.apply(conversations);

      expect(result.toKeep).toHaveLength(3);
      expect(result.toDelete).toHaveLength(2);
      expect(result.toKeep.map((c) => c.id)).toEqual(["5", "4", "3"]);
      expect(result.toDelete.map((c) => c.id)).toEqual(["2", "1"]);
    });

    it("should handle empty array", () => {
      const policy = new LRUPolicy(5);
      const result = policy.apply([]);

      expect(result.toKeep).toHaveLength(0);
      expect(result.toDelete).toHaveLength(0);
    });
  });

  describe("getExpiredConversations", () => {
    it("should return empty array when below limit", () => {
      const policy = new LRUPolicy(5);
      const conversations = [
        createMockConversation("1", 1000),
        createMockConversation("2", 2000),
      ];

      const expired = policy.getExpiredConversations(conversations);

      expect(expired).toHaveLength(0);
    });

    it("should return oldest conversations when exceeding limit", () => {
      const policy = new LRUPolicy(2);
      const conversations = [
        createMockConversation("1", 1000),
        createMockConversation("2", 2000),
        createMockConversation("3", 3000),
        createMockConversation("4", 4000),
      ];

      const expired = policy.getExpiredConversations(conversations);

      expect(expired).toHaveLength(2);
      expect(expired.map((c) => c.id)).toEqual(["2", "1"]);
    });
  });

  describe("custom maxItems", () => {
    it("should respect custom maxItems value", () => {
      const policy = new LRUPolicy(10);
      const conversations = Array.from({ length: 15 }, (_, i) =>
        createMockConversation(`${i}`, i * 1000)
      );

      const result = policy.apply(conversations);

      expect(result.toKeep).toHaveLength(10);
      expect(result.toDelete).toHaveLength(5);
    });

    it("should use default maxItems of 5", () => {
      const policy = new LRUPolicy();
      const conversations = Array.from({ length: 10 }, (_, i) =>
        createMockConversation(`${i}`, i * 1000)
      );

      const result = policy.apply(conversations);

      expect(result.toKeep).toHaveLength(5);
      expect(result.toDelete).toHaveLength(5);
    });
  });
});
