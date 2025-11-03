import { describe, expect, it } from "vitest";
import {
  extractPreview,
  generateDefaultPreview,
  getFirstUserMessage,
} from "./preview.js";
import type { CompletedTurn } from "./types.js";

describe("extractPreview", () => {
  it("should extract simple message", () => {
    const preview = extractPreview("help me write a sorting algorithm");
    expect(preview).toBe("help me write a sorting algorithm");
  });

  it("should truncate long messages", () => {
    const longMessage = "A".repeat(150);
    const preview = extractPreview(longMessage);
    expect(preview).toBe(`${"A".repeat(100)}...`);
    expect(preview.length).toBe(103);
  });

  it("should trim whitespace", () => {
    const preview = extractPreview("    write code   ");
    expect(preview).toBe("write code");
  });

  it("should handle empty messages", () => {
    expect(extractPreview("")).toBe("");
    expect(extractPreview("   ")).toBe("");
  });

  it("should handle multiline messages", () => {
    const message = "line 1\nline 2\nline 3";
    const preview = extractPreview(message);
    expect(preview).toBe("line 1\nline 2\nline 3");
  });
});

describe("getFirstUserMessage", () => {
  it("should extract first user message from turns", () => {
    const turns: CompletedTurn[] = [
      {
        id: "turn-1",
        userMessage: { role: "user", content: "first message" },
        assistantMessage: { role: "assistant", content: "response" },
        functionCalls: [],
        functionResults: [],
        timestamp: Date.now(),
      },
      {
        id: "turn-2",
        userMessage: { role: "user", content: "second message" },
        assistantMessage: { role: "assistant", content: "response" },
        functionCalls: [],
        functionResults: [],
        timestamp: Date.now(),
      },
    ];

    const message = getFirstUserMessage(turns);
    expect(message).toBe("first message");
  });

  it("should return undefined for empty turns", () => {
    const message = getFirstUserMessage([]);
    expect(message).toBeUndefined();
  });
});

describe("generateDefaultPreview", () => {
  it("should generate preview with date", () => {
    const timestamp = new Date("2024-03-15T10:30:00").getTime();
    const preview = generateDefaultPreview(timestamp);
    expect(preview).toMatch(/^Conversation/);
    expect(preview).toContain("Mar");
  });

  it("should generate different previews for different dates", () => {
    const timestamp1 = new Date("2024-03-15T10:30:00").getTime();
    const timestamp2 = new Date("2024-03-16T10:30:00").getTime();

    const preview1 = generateDefaultPreview(timestamp1);
    const preview2 = generateDefaultPreview(timestamp2);

    expect(preview1).not.toBe(preview2);
  });
});
