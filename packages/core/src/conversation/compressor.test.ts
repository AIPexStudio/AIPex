import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CompletedTurn, SummarizerFunction } from "../types.js";
import { ConversationCompressor } from "./compressor.js";

describe("ConversationCompressor", () => {
  let mockSummarizer: SummarizerFunction;
  let compressor: ConversationCompressor;

  beforeEach(() => {
    mockSummarizer = vi.fn().mockResolvedValue("Summary of conversation");

    compressor = new ConversationCompressor(mockSummarizer);
  });

  describe("shouldCompress", () => {
    it("should return false when turn count is below threshold", () => {
      expect(compressor.shouldCompress(5)).toBe(false);
      expect(compressor.shouldCompress(10)).toBe(false);
    });

    it("should return true when turn count exceeds threshold", () => {
      expect(compressor.shouldCompress(11)).toBe(true);
      expect(compressor.shouldCompress(20)).toBe(true);
    });
  });

  describe("compressTurns", () => {
    it("should not compress when turns are below threshold", async () => {
      const turns: CompletedTurn[] = createMockTurns(5);

      const result = await compressor.compressTurns(turns);

      expect(result.summary).toBe("");
      expect(result.compressedTurns).toEqual(turns);
      expect(mockSummarizer).not.toHaveBeenCalled();
    });

    it("should not compress when turns equal threshold", async () => {
      const turns: CompletedTurn[] = createMockTurns(10);

      const result = await compressor.compressTurns(turns);

      expect(result.summary).toBe("");
      expect(result.compressedTurns).toEqual(turns);
      expect(mockSummarizer).not.toHaveBeenCalled();
    });

    it("should compress when turns exceed threshold", async () => {
      const turns: CompletedTurn[] = createMockTurns(15);

      vi.mocked(mockSummarizer).mockResolvedValue(
        "Summary of old conversation",
      );

      const result = await compressor.compressTurns(turns);

      expect(result.summary).toBe("Summary of old conversation");
      expect(result.compressedTurns).toHaveLength(5);
      expect(mockSummarizer).toHaveBeenCalledTimes(1);

      const callArgs = vi.mocked(mockSummarizer).mock.calls[0][0];
      expect(callArgs).toContain("You are a conversation summarizer");
      expect(callArgs).toContain("under 500 characters");
    });

    it("should keep correct number of recent turns", async () => {
      const turns: CompletedTurn[] = createMockTurns(20);

      vi.mocked(mockSummarizer).mockResolvedValue("Summary");

      const result = await compressor.compressTurns(turns);

      expect(result.compressedTurns).toHaveLength(5);
      expect(result.compressedTurns[0].id).toBe("turn-16");
      expect(result.compressedTurns[4].id).toBe("turn-20");
    });

    it("should include function calls in summary prompt", async () => {
      const turns: CompletedTurn[] = [
        {
          id: "turn-1",
          userMessage: { role: "user", content: "What's the weather?" },
          assistantMessage: { role: "assistant", content: "Let me check" },
          functionCalls: [
            {
              id: "call-1",
              name: "get_weather",
              params: { city: "Tokyo" },
            },
            {
              id: "call-2",
              name: "get_forecast",
              params: { days: 7 },
            },
          ],
          functionResults: [],
          timestamp: Date.now(),
        },
        ...createMockTurns(14).map((turn, i) => ({
          ...turn,
          id: `turn-${i + 2}`,
        })),
      ];

      vi.mocked(mockSummarizer).mockResolvedValue("Summary with tools");

      await compressor.compressTurns(turns);

      const callArgs = vi.mocked(mockSummarizer).mock.calls[0][0];

      expect(callArgs).toContain("get_weather");
      expect(callArgs).toContain("get_forecast");
      expect(callArgs).toContain("Tools used:");
    });

    it("should trim summary text", async () => {
      const turns: CompletedTurn[] = createMockTurns(15);

      vi.mocked(mockSummarizer).mockResolvedValue(
        "  Summary with whitespace  \n\n",
      );

      const result = await compressor.compressTurns(turns);

      expect(result.summary).toBe("Summary with whitespace");
    });

    it("should respect maxSummaryLength in prompt", async () => {
      const customSummarizer = vi.fn().mockResolvedValue("Short summary");
      const customCompressor = new ConversationCompressor(customSummarizer, {
        maxSummaryLength: 200,
      });

      const turns: CompletedTurn[] = createMockTurns(15);

      await customCompressor.compressTurns(turns);

      const callArgs = vi.mocked(customSummarizer).mock.calls[0][0];

      expect(callArgs).toContain("under 200 characters");
    });
  });

  describe("compressMessages", () => {
    it("should not compress when messages are below threshold", async () => {
      const messages = [
        { role: "user" as const, content: "Message 1" },
        { role: "assistant" as const, content: "Response 1" },
      ];

      const result = await compressor.compressMessages(messages);

      expect(result).toEqual(messages);
      expect(mockSummarizer).not.toHaveBeenCalled();
    });

    it("should preserve system messages", async () => {
      const messages = [
        { role: "system" as const, content: "System prompt" },
        { role: "user" as const, content: "User message 1" },
        { role: "assistant" as const, content: "Response 1" },
        ...Array.from({ length: 20 }, (_, i) => [
          { role: "user" as const, content: `Message ${i + 2}` },
          { role: "assistant" as const, content: `Response ${i + 2}` },
        ]).flat(),
      ];

      vi.mocked(mockSummarizer).mockResolvedValue("Summary of conversation");

      const result = await compressor.compressMessages(messages);

      const systemMessages = result.filter((m) => m.role === "system");
      expect(systemMessages).toHaveLength(2);
      expect(systemMessages[0].content).toBe("System prompt");
      expect(systemMessages[1].content).toContain(
        "Previous conversation summary",
      );
    });

    it("should compress old messages and keep recent ones", async () => {
      const messages = Array.from({ length: 15 }, (_, i) => [
        { role: "user" as const, content: `User ${i + 1}` },
        { role: "assistant" as const, content: `Assistant ${i + 1}` },
      ]).flat();

      vi.mocked(mockSummarizer).mockResolvedValue("Compressed summary");

      const result = await compressor.compressMessages(messages);

      const summaryMessage = result.find(
        (m) => m.role === "system" && m.content.includes("summary"),
      );
      expect(summaryMessage).toBeDefined();

      const recentMessages = result.filter((m) => m.role !== "system");
      expect(recentMessages.length).toBeGreaterThan(0);
      expect(recentMessages.length).toBeLessThan(messages.length);
    });

    it("should handle incomplete turns", async () => {
      const messages = [
        ...Array.from({ length: 15 }, (_, i) => [
          { role: "user" as const, content: `Message ${i + 1}` },
          { role: "assistant" as const, content: `Response ${i + 1}` },
        ]).flat(),
        { role: "user" as const, content: "Incomplete turn" },
      ];

      vi.mocked(mockSummarizer).mockResolvedValue("Summary");

      const result = await compressor.compressMessages(messages);

      const lastMessage = result[result.length - 1];
      expect(lastMessage.role).toBe("user");
      expect(lastMessage.content).toBe("Incomplete turn");
    });

    it("should group multiple system messages separately", async () => {
      const messages = [
        { role: "system" as const, content: "System 1" },
        { role: "system" as const, content: "System 2" },
        ...Array.from({ length: 15 }, (_, i) => [
          { role: "user" as const, content: `Message ${i + 1}` },
          { role: "assistant" as const, content: `Response ${i + 1}` },
        ]).flat(),
      ];

      vi.mocked(mockSummarizer).mockResolvedValue("Summary");

      const result = await compressor.compressMessages(messages);

      const systemMessages = result.filter((m) => m.role === "system");
      expect(systemMessages.length).toBeGreaterThanOrEqual(2);
      expect(systemMessages[0].content).toBe("System 1");
      expect(systemMessages[1].content).toBe("System 2");
    });

    it("should format conversation text correctly", async () => {
      const messages = [
        { role: "user" as const, content: "Hello" },
        { role: "assistant" as const, content: "Hi" },
        { role: "user" as const, content: "How are you?" },
        { role: "assistant" as const, content: "I'm fine" },
        ...Array.from({ length: 10 }, (_, i) => [
          { role: "user" as const, content: `Message ${i + 3}` },
          { role: "assistant" as const, content: `Response ${i + 3}` },
        ]).flat(),
      ];

      vi.mocked(mockSummarizer).mockResolvedValue("Summary");

      await compressor.compressMessages(messages);

      const callArgs = vi.mocked(mockSummarizer).mock.calls[0][0];

      expect(callArgs).toContain("user: Hello");
      expect(callArgs).toContain("assistant: Hi");
    });

    it("should not compress when turns equal threshold", async () => {
      const messages = Array.from({ length: 10 }, (_, i) => [
        { role: "user" as const, content: `Message ${i + 1}` },
        { role: "assistant" as const, content: `Response ${i + 1}` },
      ]).flat();

      const result = await compressor.compressMessages(messages);

      expect(result).toEqual(messages);
      expect(mockSummarizer).not.toHaveBeenCalled();
    });
  });

  describe("generateSummary", () => {
    it("should format turns correctly for summarization", async () => {
      const turns: CompletedTurn[] = [
        {
          id: "turn-1",
          userMessage: { role: "user", content: "First question" },
          assistantMessage: { role: "assistant", content: "First answer" },
          functionCalls: [],
          functionResults: [],
          timestamp: Date.now(),
        },
        {
          id: "turn-2",
          userMessage: { role: "user", content: "Second question" },
          assistantMessage: { role: "assistant", content: "Second answer" },
          functionCalls: [
            {
              id: "call-1",
              name: "tool_name",
              params: {},
            },
          ],
          functionResults: [],
          timestamp: Date.now(),
        },
      ];

      const turns15 = [...turns, ...createMockTurns(13)];

      vi.mocked(mockSummarizer).mockResolvedValue("Generated summary");

      await compressor.compressTurns(turns15);

      const callArgs = vi.mocked(mockSummarizer).mock.calls[0][0];

      expect(callArgs).toContain("User: First question");
      expect(callArgs).toContain("Assistant: First answer");
      expect(callArgs).toContain("User: Second question");
      expect(callArgs).toContain("Assistant: Second answer");
      expect(callArgs).toContain("tool_name");
    });
  });
});

function createMockTurns(count: number): CompletedTurn[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `turn-${i + 1}`,
    userMessage: {
      role: "user" as const,
      content: `User message ${i + 1}`,
    },
    assistantMessage: {
      role: "assistant" as const,
      content: `Assistant response ${i + 1}`,
    },
    functionCalls: [],
    functionResults: [],
    timestamp: Date.now() + i,
  }));
}
