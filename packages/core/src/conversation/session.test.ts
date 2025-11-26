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
});
