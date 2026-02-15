import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { shareConversation } from "./share-conversation";

// Mock web-auth
vi.mock("./web-auth", () => ({
  getAuthCookieHeader: vi.fn().mockResolvedValue("session=abc123"),
}));

// Mock website config
vi.mock("../config/website", () => ({
  WEBSITE_URL: "https://www.claudechrome.com",
}));

describe("shareConversation", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("throws when there are no non-system messages", async () => {
    const messages = [
      {
        id: "1",
        role: "system" as const,
        parts: [{ type: "text" as const, text: "You are helpful" }],
      },
    ];

    await expect(shareConversation(messages)).rejects.toThrow(
      "No messages to share",
    );
  });

  it("filters out system messages before sharing", async () => {
    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ url: "https://www.claudechrome.com/share/abc" }),
    });

    const messages = [
      {
        id: "1",
        role: "system" as const,
        parts: [{ type: "text" as const, text: "System prompt" }],
      },
      {
        id: "2",
        role: "user" as const,
        parts: [{ type: "text" as const, text: "Hello" }],
      },
      {
        id: "3",
        role: "assistant" as const,
        parts: [{ type: "text" as const, text: "Hi there!" }],
      },
    ];

    await shareConversation(messages);

    expect(mockFetch).toHaveBeenCalledTimes(1);

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    // Should only have 2 messages (user + assistant), not the system one
    expect(callBody.messages).toHaveLength(2);
    expect(callBody.messages[0].role).toBe("user");
    expect(callBody.messages[1].role).toBe("assistant");
  });

  it("returns the share URL on success", async () => {
    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ url: "https://www.claudechrome.com/share/xyz" }),
    });

    const messages = [
      {
        id: "1",
        role: "user" as const,
        parts: [{ type: "text" as const, text: "Hello" }],
      },
    ];

    const result = await shareConversation(messages);
    expect(result.url).toBe("https://www.claudechrome.com/share/xyz");
  });

  it("throws on server error", async () => {
    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Internal Server Error"),
    });

    const messages = [
      {
        id: "1",
        role: "user" as const,
        parts: [{ type: "text" as const, text: "Hello" }],
      },
    ];

    await expect(shareConversation(messages)).rejects.toThrow(
      "Share failed (500)",
    );
  });

  it("throws when no URL is returned", async () => {
    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const messages = [
      {
        id: "1",
        role: "user" as const,
        parts: [{ type: "text" as const, text: "Hello" }],
      },
    ];

    await expect(shareConversation(messages)).rejects.toThrow(
      "no URL was returned",
    );
  });

  it("strips screenshot data from tool parts", async () => {
    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ url: "https://www.claudechrome.com/share/abc" }),
    });

    const messages = [
      {
        id: "1",
        role: "assistant" as const,
        parts: [
          {
            type: "tool" as const,
            toolName: "capture_screenshot",
            toolCallId: "call-1",
            input: {},
            output: { success: true },
            state: "completed" as const,
            screenshot: "data:image/png;base64,HUGESCREENSHOTDATA",
          },
        ],
      },
    ];

    await shareConversation(messages);

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    const toolPart = callBody.messages[0].content.parts[0];
    // screenshot field should NOT be included in the shared payload
    expect(toolPart.screenshot).toBeUndefined();
    expect(toolPart.toolName).toBe("capture_screenshot");
  });
});
