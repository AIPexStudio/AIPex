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
});
