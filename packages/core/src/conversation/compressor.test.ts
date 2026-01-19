import type { AgentInputItem } from "@openai/agents";
import type { AiSdkModel } from "@openai/agents-extensions";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConversationCompressor } from "./compressor.js";

vi.mock("@openai/agents", () => ({
  Agent: vi.fn(),
  run: vi.fn().mockResolvedValue({ finalOutput: "Compressed summary" }),
}));

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

const mockModel = {} as AiSdkModel;

describe("ConversationCompressor", () => {
  let compressor: ConversationCompressor;

  beforeEach(() => {
    vi.clearAllMocks();
    compressor = new ConversationCompressor(mockModel);
  });

  describe("shouldCompress", () => {
    it("should return false when item count is below threshold", () => {
      expect(compressor.shouldCompress(10)).toBe(false);
      expect(compressor.shouldCompress(20)).toBe(false);
    });

    it("should return true when item count exceeds threshold", () => {
      expect(compressor.shouldCompress(21)).toBe(true);
      expect(compressor.shouldCompress(30)).toBe(true);
    });
  });

  describe("compressItems", () => {
    it("should not compress when below threshold", async () => {
      const items: AgentInputItem[] = [
        createUserMessage("Hello"),
        createAssistantMessage("Hi"),
      ];

      const result = await compressor.compressItems(items);

      expect(result.summary).toBe("");
      expect(result.compressedItems).toEqual(items);
    });

    it("should compress when exceeding threshold", async () => {
      const items: AgentInputItem[] = [];
      for (let i = 0; i < 25; i++) {
        if (i % 2 === 0) {
          items.push(createUserMessage(`Message ${i}`));
        } else {
          items.push(createAssistantMessage(`Response ${i}`));
        }
      }

      const result = await compressor.compressItems(items);

      expect(result.summary).toBe("Compressed summary");
      expect(result.compressedItems.length).toBe(10);
    });

    it("should keep recent items after compression", async () => {
      const items: AgentInputItem[] = [];
      for (let i = 0; i < 25; i++) {
        if (i % 2 === 0) {
          items.push(createUserMessage(`Message ${i}`));
        } else {
          items.push(createAssistantMessage(`Response ${i}`));
        }
      }

      const result = await compressor.compressItems(items);

      expect(result.compressedItems.length).toBe(10);
    });
  });

  describe("custom config", () => {
    it("should respect custom thresholds", async () => {
      const customCompressor = new ConversationCompressor(mockModel, {
        summarizeAfterItems: 5,
        keepRecentItems: 2,
      });

      const items: AgentInputItem[] = [];
      for (let i = 0; i < 8; i++) {
        if (i % 2 === 0) {
          items.push(createUserMessage(`Message ${i}`));
        } else {
          items.push(createAssistantMessage(`Response ${i}`));
        }
      }

      const result = await customCompressor.compressItems(items);

      expect(result.summary).toBe("Compressed summary");
      expect(result.compressedItems.length).toBe(2);
    });
  });

  describe("token watermark compression", () => {
    it("should trigger compression when lastPromptTokens exceeds watermark", () => {
      const watermarkCompressor = new ConversationCompressor(mockModel, {
        tokenWatermark: 150000,
      });

      expect(watermarkCompressor.shouldCompress(10, 200000)).toBe(true);
      expect(watermarkCompressor.shouldCompress(10, 100000)).toBe(false);
    });

    it("should fallback to item count when tokenWatermark not set", () => {
      const compressor = new ConversationCompressor(mockModel, {
        summarizeAfterItems: 20,
      });

      expect(compressor.shouldCompress(25, 100000)).toBe(true);
      expect(compressor.shouldCompress(15, 200000)).toBe(false);
    });

    it("should fallback to item count when lastPromptTokens not provided", () => {
      const watermarkCompressor = new ConversationCompressor(mockModel, {
        tokenWatermark: 150000,
        summarizeAfterItems: 20,
      });

      expect(watermarkCompressor.shouldCompress(25)).toBe(true);
      expect(watermarkCompressor.shouldCompress(15)).toBe(false);
    });
  });

  describe("protectRecentMessages", () => {
    it("should protect recent N message items", async () => {
      const protectCompressor = new ConversationCompressor(mockModel, {
        summarizeAfterItems: 5,
        protectRecentMessages: 2,
      });

      const items: AgentInputItem[] = [
        createUserMessage("Message 1"),
        createAssistantMessage("Response 1"),
        createUserMessage("Message 2"),
        createAssistantMessage("Response 2"),
        createUserMessage("Message 3"),
        createAssistantMessage("Response 3"),
      ];

      const result = await protectCompressor.compressItems(items);

      // Should protect the last 2 messages (assistant 2 and assistant 3)
      // and summarize everything before that
      expect(result.compressedItems.length).toBe(2);
      expect(result.summary).toBe("Compressed summary");
    });

    it("should protect tool call/result pairs with recent messages", async () => {
      const protectCompressor = new ConversationCompressor(mockModel, {
        summarizeAfterItems: 5,
        protectRecentMessages: 1,
      });

      const items: AgentInputItem[] = [
        createUserMessage("Message 1"),
        createAssistantMessage("Response 1"),
        createUserMessage("Use a tool"),
        createAssistantMessage("I'll use the tool"),
        {
          type: "function_call",
          callId: "call_123",
          name: "testTool",
          arguments: "{}",
        } as AgentInputItem,
        {
          type: "function_call_result",
          callId: "call_123",
          name: "testTool",
          output: "result",
        } as AgentInputItem,
        createAssistantMessage("Tool result received"),
      ];

      const result = await protectCompressor.compressItems(items);

      // Should protect the last assistant message AND the tool call/result pair
      // and the assistant message before the tool calls
      expect(result.compressedItems.length).toBeGreaterThanOrEqual(4);
      expect(result.summary).toBe("Compressed summary");
    });

    it("should include assistant message preceding tool calls", async () => {
      const protectCompressor = new ConversationCompressor(mockModel, {
        summarizeAfterItems: 5,
        protectRecentMessages: 1,
      });

      const items: AgentInputItem[] = [
        createUserMessage("Message 1"),
        createAssistantMessage("Response 1"),
        createUserMessage("Message 2"),
        createAssistantMessage("I'll call a tool"),
        {
          type: "function_call",
          callId: "call_456",
          name: "testTool",
          arguments: "{}",
        } as AgentInputItem,
        {
          type: "function_call_result",
          callId: "call_456",
          name: "testTool",
          output: "result",
        } as AgentInputItem,
        createAssistantMessage("Final response"),
      ];

      const result = await protectCompressor.compressItems(items);

      // Should protect the final assistant message, tool items,
      // and the assistant message that initiated the tool call
      const finalAssistant = result.compressedItems.find(
        (item) =>
          item.type === "message" &&
          item.role === "assistant" &&
          (item.content as any)?.[0]?.text === "Final response",
      );
      const toolCall = result.compressedItems.find(
        (item) => item.type === "function_call",
      );
      const precedingAssistant = result.compressedItems.find(
        (item) =>
          item.type === "message" &&
          item.role === "assistant" &&
          (item.content as any)?.[0]?.text === "I'll call a tool",
      );

      expect(finalAssistant).toBeDefined();
      expect(toolCall).toBeDefined();
      expect(precedingAssistant).toBeDefined();
    });

    it("should handle case with no messages to protect", async () => {
      const protectCompressor = new ConversationCompressor(mockModel, {
        summarizeAfterItems: 5,
        protectRecentMessages: 10,
      });

      const items: AgentInputItem[] = [
        createUserMessage("Message 1"),
        createAssistantMessage("Response 1"),
        createUserMessage("Message 2"),
      ];

      const result = await protectCompressor.compressItems(items);

      // Should protect all items since protectRecentMessages > total messages
      expect(result.compressedItems.length).toBe(3);
      expect(result.summary).toBe("");
    });
  });
});
