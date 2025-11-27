import type { AgentInputItem } from "@openai/agents";
import { beforeEach, describe, expect, it } from "vitest";
import { Session } from "./session.js";

const createUserMessage = (content: string): AgentInputItem => ({
  type: "message",
  role: "user",
  content,
});

const createAssistantMessage = (content: string): AgentInputItem => ({
  type: "message",
  role: "assistant",
  status: "completed",
  content: [{ type: "output_text", text: content }],
});

describe("Session", () => {
  let session: Session;

  beforeEach(() => {
    session = new Session();
  });

  describe("OpenAI Session interface", () => {
    it("should return session ID", async () => {
      const id = await session.getSessionId();
      expect(id).toBe(session.id);
    });

    it("should add and get items", async () => {
      const items: AgentInputItem[] = [
        createUserMessage("Hello"),
        createAssistantMessage("Hi there!"),
      ];

      await session.addItems(items);
      const retrieved = await session.getItems();

      expect(retrieved.length).toBe(2);
    });

    it("should get items with limit", async () => {
      const items: AgentInputItem[] = [
        createUserMessage("Message 1"),
        createAssistantMessage("Response 1"),
        createUserMessage("Message 2"),
        createAssistantMessage("Response 2"),
      ];

      await session.addItems(items);
      const limited = await session.getItems(2);

      expect(limited.length).toBe(2);
    });

    it("should pop item", async () => {
      const items: AgentInputItem[] = [
        createUserMessage("Hello"),
        createAssistantMessage("Hi!"),
      ];

      await session.addItems(items);
      await session.popItem();

      expect(session.getItemCount()).toBe(1);
    });

    it("should clear session", async () => {
      await session.addItems([createUserMessage("Hello")]);
      await session.clearSession();

      expect(session.getItemCount()).toBe(0);
    });
  });

  describe("Fork functionality", () => {
    beforeEach(async () => {
      const items: AgentInputItem[] = [
        createUserMessage("Turn 1"),
        createAssistantMessage("Response 1"),
        createUserMessage("Turn 2"),
        createAssistantMessage("Response 2"),
        createUserMessage("Turn 3"),
        createAssistantMessage("Response 3"),
      ];
      await session.addItems(items);
    });

    it("should fork a session at specified item index", async () => {
      const forkedSession = session.fork(3);

      expect(forkedSession.id).not.toBe(session.id);
      expect(forkedSession.getItemCount()).toBe(4);
      expect(forkedSession.parentSessionId).toBe(session.id);
      expect(forkedSession.forkAtItemIndex).toBe(3);
    });

    it("should fork at last item by default", () => {
      const forkedSession = session.fork();

      expect(forkedSession.getItemCount()).toBe(6);
      expect(forkedSession.forkAtItemIndex).toBe(5);
    });

    it("should throw error for invalid item index", () => {
      expect(() => session.fork(10)).toThrow();
      expect(() => session.fork(-1)).toThrow();
    });

    it("should have independent items after fork", async () => {
      const forkedSession = session.fork(3);

      await forkedSession.addItems([createUserMessage("New message")]);

      expect(session.getItemCount()).toBe(6);
      expect(forkedSession.getItemCount()).toBe(5);
    });

    it("should get fork info correctly", () => {
      const forkedSession = session.fork(3);
      const forkInfo = forkedSession.getForkInfo();

      expect(forkInfo.parentSessionId).toBe(session.id);
      expect(forkInfo.forkAtItemIndex).toBe(3);
    });

    it("should refresh timestamps when forking", () => {
      const beforeFork = Date.now();
      const forkedSession = session.fork(3);
      const summary = forkedSession.getSummary();

      expect(summary.createdAt).toBeGreaterThanOrEqual(beforeFork);
      expect(summary.lastActiveAt).toBeGreaterThanOrEqual(beforeFork);
    });
  });

  describe("Serialization", () => {
    it("should preserve all data through serialization including fork info", async () => {
      await session.addItems([
        createUserMessage("Hello"),
        createAssistantMessage("Hi!"),
      ]);

      const forkedSession = session.fork(0);
      const serialized = forkedSession.toJSON();
      const deserialized = Session.fromJSON(serialized);

      expect(deserialized.id).toBe(forkedSession.id);
      expect(deserialized.getItemCount()).toBe(1);
      expect(deserialized.parentSessionId).toBe(session.id);
      expect(deserialized.forkAtItemIndex).toBe(0);
    });

    it("should throw error for invalid session data", () => {
      expect(() => Session.fromJSON(null as any)).toThrow(
        "Invalid session data",
      );
      expect(() => Session.fromJSON({} as any)).toThrow("Invalid session data");
    });
  });

  describe("Session summary", () => {
    it("should generate summary correctly", async () => {
      await session.addItems([
        createUserMessage("Hello world"),
        createAssistantMessage("Hi!"),
      ]);

      const summary = session.getSummary();

      expect(summary.id).toBe(session.id);
      expect(summary.itemCount).toBe(2);
      expect(summary.preview).toBe("Hello world");
    });

    it("should include fork info in summary", async () => {
      await session.addItems([
        createUserMessage("Test"),
        createAssistantMessage("Response"),
      ]);

      const forkedSession = session.fork(0);
      const summary = forkedSession.getSummary();

      expect(summary.parentSessionId).toBe(session.id);
      expect(summary.forkAtItemIndex).toBe(0);
    });

    it("should fall back to stored summary when preview text missing", async () => {
      session.setMetadata("lastSummary", "Earlier summary text");
      await session.addItems([
        {
          type: "message",
          role: "system",
          content: "Conversation summary:\nEarlier summary text",
        } as AgentInputItem,
      ]);

      const summary = session.getSummary();
      expect(summary.preview).toContain("Earlier summary text");
    });
  });

  describe("Metadata", () => {
    it("should set and get metadata", () => {
      session.setMetadata("custom", "value");
      expect(session.getMetadata("custom")).toBe("value");
    });

    it("should return undefined for non-existent metadata", () => {
      expect(session.getMetadata("nonexistent")).toBeUndefined();
    });
  });

  describe("Preview generation", () => {
    it("should truncate long preview", async () => {
      const longMessage = "A".repeat(100);
      await session.addItems([createUserMessage(longMessage)]);

      const summary = session.getSummary();
      expect(summary.preview.length).toBeLessThanOrEqual(53);
      expect(summary.preview.endsWith("...")).toBe(true);
    });

    it("should handle array content in user message", async () => {
      await session.addItems([
        {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: "Hello from array" }],
        },
      ]);

      const summary = session.getSummary();
      expect(summary.preview).toBe("Hello from array");
    });
  });

  describe("Session metrics", () => {
    it("should start with zero metrics", () => {
      const metrics = session.getSessionMetrics();

      expect(metrics.totalTokensUsed).toBe(0);
      expect(metrics.totalPromptTokens).toBe(0);
      expect(metrics.totalCompletionTokens).toBe(0);
      expect(metrics.executionCount).toBe(0);
    });

    it("should accumulate metrics correctly", () => {
      session.addMetrics({
        tokensUsed: 100,
        promptTokens: 60,
        completionTokens: 40,
      });
      session.addMetrics({
        tokensUsed: 50,
        promptTokens: 30,
        completionTokens: 20,
      });

      const metrics = session.getSessionMetrics();

      expect(metrics.totalTokensUsed).toBe(150);
      expect(metrics.totalPromptTokens).toBe(90);
      expect(metrics.totalCompletionTokens).toBe(60);
      expect(metrics.executionCount).toBe(2);
    });

    it("should handle partial metrics", () => {
      session.addMetrics({ tokensUsed: 100 });
      session.addMetrics({ promptTokens: 50 });

      const metrics = session.getSessionMetrics();

      expect(metrics.totalTokensUsed).toBe(100);
      expect(metrics.totalPromptTokens).toBe(50);
      expect(metrics.totalCompletionTokens).toBe(0);
      expect(metrics.executionCount).toBe(2);
    });

    it("should return a copy of metrics", () => {
      session.addMetrics({ tokensUsed: 100 });
      const metrics1 = session.getSessionMetrics();
      metrics1.totalTokensUsed = 999;

      const metrics2 = session.getSessionMetrics();
      expect(metrics2.totalTokensUsed).toBe(100);
    });

    it("should reset metrics when forking", async () => {
      await session.addItems([
        createUserMessage("Test"),
        createAssistantMessage("Response"),
      ]);
      session.addMetrics({
        tokensUsed: 100,
        promptTokens: 60,
        completionTokens: 40,
      });

      const forkedSession = session.fork(0);
      const forkedMetrics = forkedSession.getSessionMetrics();

      expect(forkedMetrics.totalTokensUsed).toBe(0);
      expect(forkedMetrics.executionCount).toBe(0);
    });

    it("should preserve metrics through serialization", () => {
      session.addMetrics({
        tokensUsed: 200,
        promptTokens: 120,
        completionTokens: 80,
      });
      session.addMetrics({
        tokensUsed: 100,
        promptTokens: 60,
        completionTokens: 40,
      });

      const serialized = session.toJSON();
      const deserialized = Session.fromJSON(serialized);
      const metrics = deserialized.getSessionMetrics();

      expect(metrics.totalTokensUsed).toBe(300);
      expect(metrics.totalPromptTokens).toBe(180);
      expect(metrics.totalCompletionTokens).toBe(120);
      expect(metrics.executionCount).toBe(2);
    });

    it("should handle missing metrics in serialized data", () => {
      const serialized = session.toJSON();
      delete (serialized as any).metrics;

      const deserialized = Session.fromJSON(serialized);
      const metrics = deserialized.getSessionMetrics();

      expect(metrics.totalTokensUsed).toBe(0);
      expect(metrics.executionCount).toBe(0);
    });
  });

  describe("Fork deep copy", () => {
    it("should deep copy items when forking", async () => {
      const item: AgentInputItem = {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: "Original text" }],
      };
      await session.addItems([item, createAssistantMessage("Response")]);

      const forkedSession = session.fork(1);
      const forkedItems = await forkedSession.getItems();

      (forkedItems[0] as any).content[0].text = "Modified text";

      const originalItems = await session.getItems();
      expect((originalItems[0] as any).content[0].text).toBe("Original text");
    });

    it("should not affect parent session when modifying forked items array", async () => {
      await session.addItems([
        createUserMessage("Message 1"),
        createAssistantMessage("Response 1"),
        createUserMessage("Message 2"),
        createAssistantMessage("Response 2"),
      ]);

      const forkedSession = session.fork(1);
      await forkedSession.popItem();
      await forkedSession.addItems([createUserMessage("New message")]);

      expect(session.getItemCount()).toBe(4);
      expect(forkedSession.getItemCount()).toBe(2);
    });
  });
});
