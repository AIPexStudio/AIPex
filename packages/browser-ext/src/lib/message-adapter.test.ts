import { describe, expect, it } from "vitest";
import { fromStorageFormat, toStorageFormat } from "./message-adapter";

const TEST_IMAGE_DATA = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==";
const TEST_SCREENSHOT_UID = "screenshot_1234567890_abcdefghi";
const PLACEHOLDER = "[Image data removed - see following user message]";

describe("message-adapter", () => {
  describe("toStorageFormat – screenshot stripping", () => {
    it("should strip base64 imageData from screenshot tool results", () => {
      const output = {
        success: true,
        imageData: TEST_IMAGE_DATA,
        sendToLLM: true,
        screenshotUid: TEST_SCREENSHOT_UID,
        tabId: 1,
        url: "https://example.com",
        title: "Example",
      };

      const messages = [
        {
          id: "msg-1",
          role: "assistant" as const,
          parts: [
            {
              type: "tool" as const,
              toolCallId: "call-1",
              toolName: "capture_screenshot",
              input: { sendToLLM: true },
              output,
              state: "completed" as const,
              screenshot: TEST_IMAGE_DATA,
              screenshotUid: TEST_SCREENSHOT_UID,
            },
          ],
          timestamp: Date.now(),
        },
      ];

      const stored = toStorageFormat(messages as any);
      expect(stored.length).toBe(1);

      // Find the tool_result part
      const toolResultPart = stored[0]!.parts.find(
        (p: any) => p.type === "tool_result",
      ) as any;
      expect(toolResultPart).toBeTruthy();

      // Parse the content and verify imageData is stripped
      const parsedContent = JSON.parse(toolResultPart.content);
      expect(parsedContent.imageData).toBe(PLACEHOLDER);
      expect(parsedContent.screenshotUid).toBe(TEST_SCREENSHOT_UID);
      expect(parsedContent.success).toBe(true);
    });

    it("should not strip non-screenshot tool results", () => {
      const output = {
        tabs: [{ id: 1, title: "Tab" }],
        imageData: TEST_IMAGE_DATA, // Even if it has imageData
      };

      const messages = [
        {
          id: "msg-1",
          role: "assistant" as const,
          parts: [
            {
              type: "tool" as const,
              toolCallId: "call-1",
              toolName: "get_tabs",
              input: {},
              output,
              state: "completed" as const,
            },
          ],
          timestamp: Date.now(),
        },
      ];

      const stored = toStorageFormat(messages as any);
      const toolResultPart = stored[0]!.parts.find(
        (p: any) => p.type === "tool_result",
      ) as any;
      const parsedContent = JSON.parse(toolResultPart.content);
      expect(parsedContent.imageData).toBe(TEST_IMAGE_DATA);
    });
  });

  describe("fromStorageFormat – screenshotUid restoration", () => {
    it("should restore screenshotUid from stored tool result", () => {
      const storedOutput = {
        success: true,
        imageData: PLACEHOLDER,
        sendToLLM: true,
        screenshotUid: TEST_SCREENSHOT_UID,
        tabId: 1,
      };

      const storedMessages = [
        {
          id: "msg-1",
          role: "assistant" as const,
          parts: [
            {
              type: "tool_use" as const,
              id: "call-1",
              name: "capture_screenshot",
              input: { sendToLLM: true },
            },
            {
              type: "tool_result" as const,
              tool_use_id: "call-1",
              content: JSON.stringify(storedOutput),
              is_error: false,
            },
          ],
          timestamp: Date.now(),
        },
      ];

      const restored = fromStorageFormat(storedMessages as any);
      expect(restored.length).toBe(1);

      // Find the tool part (merged from tool_use + tool_result)
      const toolPart = restored[0]!.parts.find(
        (p: any) => p.type === "tool",
      ) as any;
      expect(toolPart).toBeTruthy();
      expect(toolPart.screenshotUid).toBe(TEST_SCREENSHOT_UID);
      // imageData is the placeholder, not a real data URL, so screenshot should NOT be set
      expect(toolPart.screenshot).toBeUndefined();
      expect(toolPart.state).toBe("completed");
    });

    it("should restore both screenshotUid and screenshot when real imageData is present", () => {
      const storedOutput = {
        success: true,
        imageData: TEST_IMAGE_DATA,
        sendToLLM: true,
        screenshotUid: TEST_SCREENSHOT_UID,
        tabId: 1,
      };

      const storedMessages = [
        {
          id: "msg-1",
          role: "assistant" as const,
          parts: [
            {
              type: "tool_use" as const,
              id: "call-1",
              name: "capture_screenshot",
              input: { sendToLLM: true },
            },
            {
              type: "tool_result" as const,
              tool_use_id: "call-1",
              content: JSON.stringify(storedOutput),
              is_error: false,
            },
          ],
          timestamp: Date.now(),
        },
      ];

      const restored = fromStorageFormat(storedMessages as any);
      const toolPart = restored[0]!.parts.find(
        (p: any) => p.type === "tool",
      ) as any;
      expect(toolPart.screenshotUid).toBe(TEST_SCREENSHOT_UID);
      expect(toolPart.screenshot).toBe(TEST_IMAGE_DATA);
    });
  });

  describe("round-trip: toStorageFormat -> fromStorageFormat", () => {
    it("should preserve screenshotUid through round-trip", () => {
      const original = [
        {
          id: "msg-1",
          role: "assistant" as const,
          parts: [
            {
              type: "tool" as const,
              toolCallId: "call-1",
              toolName: "capture_screenshot",
              input: { sendToLLM: true },
              output: {
                success: true,
                imageData: TEST_IMAGE_DATA,
                sendToLLM: true,
                screenshotUid: TEST_SCREENSHOT_UID,
                tabId: 1,
              },
              state: "completed" as const,
              screenshot: TEST_IMAGE_DATA,
              screenshotUid: TEST_SCREENSHOT_UID,
            },
          ],
          timestamp: Date.now(),
        },
      ];

      // Store -> Restore
      const stored = toStorageFormat(original as any);
      const restored = fromStorageFormat(stored);

      const toolPart = restored[0]!.parts.find(
        (p: any) => p.type === "tool",
      ) as any;

      // screenshotUid should survive the round-trip
      expect(toolPart.screenshotUid).toBe(TEST_SCREENSHOT_UID);
      // imageData was stripped during storage, so inline screenshot is gone
      expect(toolPart.screenshot).toBeUndefined();
      expect(toolPart.state).toBe("completed");
      expect(toolPart.toolName).toBe("capture_screenshot");
    });

    it("should handle capture_tab_screenshot round-trip", () => {
      const original = [
        {
          id: "msg-1",
          role: "assistant" as const,
          parts: [
            {
              type: "tool" as const,
              toolCallId: "call-1",
              toolName: "capture_tab_screenshot",
              input: { tabId: 42, sendToLLM: true },
              output: {
                success: true,
                imageData: TEST_IMAGE_DATA,
                sendToLLM: true,
                screenshotUid: TEST_SCREENSHOT_UID,
                tabId: 42,
              },
              state: "completed" as const,
              screenshot: TEST_IMAGE_DATA,
              screenshotUid: TEST_SCREENSHOT_UID,
            },
          ],
          timestamp: Date.now(),
        },
      ];

      const stored = toStorageFormat(original as any);
      const restored = fromStorageFormat(stored);

      const toolPart = restored[0]!.parts.find(
        (p: any) => p.type === "tool",
      ) as any;
      expect(toolPart.screenshotUid).toBe(TEST_SCREENSHOT_UID);
      expect(toolPart.toolName).toBe("capture_tab_screenshot");
    });
  });
});
