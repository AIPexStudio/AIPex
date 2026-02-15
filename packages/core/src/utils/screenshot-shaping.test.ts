import type { AgentInputItem } from "@openai/agents";
import { describe, expect, it } from "vitest";
import {
  isTransientScreenshotItem,
  pruneTransientScreenshotItems,
  shapeScreenshotItems,
  TRANSIENT_SCREENSHOT_MARKER,
} from "./screenshot-shaping.js";

// --- Helpers ---

const TEST_IMAGE_DATA = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==";
const TEST_SCREENSHOT_UID = "screenshot_1234567890_abcdefghi";
const PLACEHOLDER = "[Image data removed - see following user message]";

/**
 * Create a screenshot tool result with plain string output (legacy/test format).
 */
function createScreenshotToolResult(
  overrides: Record<string, unknown> = {},
): AgentInputItem {
  const output = {
    success: true,
    imageData: TEST_IMAGE_DATA,
    sendToLLM: true,
    screenshotUid: TEST_SCREENSHOT_UID,
    tabId: 1,
    url: "https://example.com",
    title: "Example",
    ...overrides,
  };
  return {
    type: "function_call_result",
    name: "capture_screenshot",
    callId: "call_abc123",
    output: JSON.stringify(output),
  } as AgentInputItem;
}

/**
 * Create a screenshot tool result using the SDK's actual output format:
 * { type: 'text', text: '<json string>' }
 *
 * This is what `@openai/agents` SDK produces via `getToolCallOutputItem()`
 * when a tool returns a plain object.
 */
function createSdkScreenshotToolResult(
  overrides: Record<string, unknown> = {},
): AgentInputItem {
  const output = {
    success: true,
    imageData: TEST_IMAGE_DATA,
    sendToLLM: true,
    screenshotUid: TEST_SCREENSHOT_UID,
    tabId: 1,
    url: "https://example.com",
    title: "Example",
    ...overrides,
  };
  return {
    type: "function_call_result",
    name: "capture_screenshot",
    callId: "call_sdk_123",
    status: "completed",
    output: { type: "text", text: JSON.stringify(output) },
  } as AgentInputItem;
}

function createNonScreenshotToolResult(): AgentInputItem {
  return {
    type: "function_call_result",
    name: "get_tabs",
    callId: "call_other",
    output: JSON.stringify({ tabs: [{ id: 1, title: "Tab" }] }),
  } as AgentInputItem;
}

function createUserMessage(text: string): AgentInputItem {
  return {
    type: "message",
    role: "user",
    content: text,
  };
}

// --- Tests ---

describe("shapeScreenshotItems", () => {
  it("should strip imageData and inject transient user image message for sendToLLM=true", () => {
    const items = [createScreenshotToolResult()];
    const shaped = shapeScreenshotItems(items);

    expect(shaped.length).toBe(2);

    // First item: stripped tool result — always wrapped in { success, data }
    const toolResult = shaped[0] as { type: string; output: string };
    expect(toolResult.type).toBe("function_call_result");
    const parsed = JSON.parse(toolResult.output);
    expect(parsed.success).toBe(true);
    expect(parsed.data).toBeDefined();
    expect(parsed.data.imageData).toBe(PLACEHOLDER);
    expect(parsed.data.screenshotUid).toBe(TEST_SCREENSHOT_UID);
    expect(parsed.data.sendToLLM).toBe(true);

    // Second item: transient user image message
    const userMsg = shaped[1] as {
      type: string;
      role: string;
      content: Array<{ type: string; text?: string; image?: string }>;
      providerData?: Record<string, unknown>;
    };
    expect(userMsg.type).toBe("message");
    expect(userMsg.role).toBe("user");
    expect(userMsg.providerData?.[TRANSIENT_SCREENSHOT_MARKER]).toBe(true);

    // Check content has text + image parts
    const textPart = userMsg.content.find((c) => c.type === "input_text");
    const imagePart = userMsg.content.find((c) => c.type === "input_image");
    expect(textPart).toBeTruthy();
    expect(imagePart).toBeTruthy();
    expect((imagePart as { image: string }).image).toBe(TEST_IMAGE_DATA);
  });

  it("should pass through items when sendToLLM=false", () => {
    const items = [
      createScreenshotToolResult({
        sendToLLM: false,
        imageData: undefined,
        captured: true,
      }),
    ];
    const shaped = shapeScreenshotItems(items);

    // Should not inject a user image message
    expect(shaped.length).toBe(1);
    expect(shaped[0]).toEqual(items[0]);
  });

  it("should pass through non-screenshot tools unchanged", () => {
    const items = [createNonScreenshotToolResult()];
    const shaped = shapeScreenshotItems(items);

    expect(shaped.length).toBe(1);
    expect(shaped[0]).toEqual(items[0]);
  });

  it("should pass through non-tool items unchanged", () => {
    const items = [createUserMessage("hello")];
    const shaped = shapeScreenshotItems(items);

    expect(shaped.length).toBe(1);
    expect(shaped[0]).toEqual(items[0]);
  });

  it("should handle capture_tab_screenshot the same way", () => {
    const toolResult = createScreenshotToolResult();
    (toolResult as { name: string }).name = "capture_tab_screenshot";
    const shaped = shapeScreenshotItems([toolResult]);

    expect(shaped.length).toBe(2);
    expect((shaped[0] as { type: string }).type).toBe("function_call_result");
    expect((shaped[1] as { type: string; role: string }).role).toBe("user");
  });

  it("should handle capture_screenshot_with_highlight the same way", () => {
    const output = {
      success: true,
      imageData: TEST_IMAGE_DATA,
      sendToLLM: true,
      screenshotUid: TEST_SCREENSHOT_UID,
      tabId: 1,
      url: "https://example.com",
      title: "Example",
      selector: ".my-element",
      cropped: true,
    };
    const item: AgentInputItem = {
      type: "function_call_result",
      name: "capture_screenshot_with_highlight",
      callId: "call_highlight",
      output: JSON.stringify(output),
    } as AgentInputItem;

    const shaped = shapeScreenshotItems([item]);

    expect(shaped.length).toBe(2);

    // First item: stripped tool result — always wrapped in { success, data }
    const toolResult = shaped[0] as { type: string; output: string };
    expect(toolResult.type).toBe("function_call_result");
    const parsed = JSON.parse(toolResult.output);
    expect(parsed.success).toBe(true);
    expect(parsed.data).toBeDefined();
    expect(parsed.data.imageData).toBe(PLACEHOLDER);
    expect(parsed.data.screenshotUid).toBe(TEST_SCREENSHOT_UID);
    expect(parsed.data.sendToLLM).toBe(true);

    // Second item: transient user image message
    const userMsg = shaped[1] as {
      type: string;
      role: string;
      content: Array<{ type: string; text?: string; image?: string }>;
      providerData?: Record<string, unknown>;
    };
    expect(userMsg.type).toBe("message");
    expect(userMsg.role).toBe("user");
    expect(userMsg.providerData?.[TRANSIENT_SCREENSHOT_MARKER]).toBe(true);
    const imagePart = userMsg.content.find((c) => c.type === "input_image");
    expect(imagePart).toBeTruthy();
    expect((imagePart as { image: string }).image).toBe(TEST_IMAGE_DATA);
  });

  it("should pass through capture_screenshot_with_highlight when sendToLLM=false", () => {
    const output = {
      success: true,
      captured: true,
      sendToLLM: false,
      screenshotUid: TEST_SCREENSHOT_UID,
      tabId: 1,
      selector: ".my-element",
      cropped: true,
    };
    const item: AgentInputItem = {
      type: "function_call_result",
      name: "capture_screenshot_with_highlight",
      callId: "call_highlight_no_llm",
      output: JSON.stringify(output),
    } as AgentInputItem;

    const shaped = shapeScreenshotItems([item]);

    // No imageData + sendToLLM=false → pass through unchanged
    expect(shaped.length).toBe(1);
    expect(shaped[0]).toEqual(item);
  });

  it("should handle mixed items correctly", () => {
    const items = [
      createUserMessage("Take a screenshot"),
      createNonScreenshotToolResult(),
      createScreenshotToolResult(),
      createUserMessage("What do you see?"),
    ];
    const shaped = shapeScreenshotItems(items);

    // Original 4 items + 1 injected user image = 5
    expect(shaped.length).toBe(5);

    // Verify order: user, non-screenshot tool, stripped screenshot, user image, user
    expect((shaped[0] as { role: string }).role).toBe("user");
    expect((shaped[1] as { name: string }).name).toBe("get_tabs");
    expect((shaped[2] as { type: string }).type).toBe("function_call_result");
    expect(
      (shaped[3] as { providerData?: Record<string, unknown> }).providerData?.[
        TRANSIENT_SCREENSHOT_MARKER
      ],
    ).toBe(true);
    expect((shaped[4] as { role: string }).role).toBe("user");
  });

  it("should handle nested data structure (one level)", () => {
    const output = {
      success: true,
      data: {
        success: true,
        imageData: TEST_IMAGE_DATA,
        sendToLLM: true,
        screenshotUid: TEST_SCREENSHOT_UID,
      },
    };
    const item: AgentInputItem = {
      type: "function_call_result",
      name: "capture_screenshot",
      callId: "call_nested",
      output: JSON.stringify(output),
    } as AgentInputItem;

    const shaped = shapeScreenshotItems([item]);
    expect(shaped.length).toBe(2);

    const parsedOutput = JSON.parse((shaped[0] as { output: string }).output);
    expect(parsedOutput.success).toBe(true);
    expect(parsedOutput.data.imageData).toBe(PLACEHOLDER);
    expect(parsedOutput.data.screenshotUid).toBe(TEST_SCREENSHOT_UID);
  });

  it("should handle data.data nesting (two levels)", () => {
    // This matches the old aipex pattern: { data: { data: { imageData, ... } } }
    const output = {
      success: true,
      data: {
        data: {
          imageData: TEST_IMAGE_DATA,
          sendToLLM: true,
          screenshotUid: TEST_SCREENSHOT_UID,
          tabId: 1,
          url: "https://example.com",
        },
      },
    };
    const item: AgentInputItem = {
      type: "function_call_result",
      name: "capture_screenshot",
      callId: "call_deep_nested",
      output: JSON.stringify(output),
    } as AgentInputItem;

    const shaped = shapeScreenshotItems([item]);
    expect(shaped.length).toBe(2);

    // Stripped tool result
    const parsedOutput = JSON.parse((shaped[0] as { output: string }).output);
    expect(parsedOutput.success).toBe(true);
    expect(parsedOutput.data).toBeDefined();
    expect(parsedOutput.data.imageData).toBe(PLACEHOLDER);
    expect(parsedOutput.data.screenshotUid).toBe(TEST_SCREENSHOT_UID);
    expect(parsedOutput.data.sendToLLM).toBe(true);

    // Transient user image message
    const userMsg = shaped[1] as {
      type: string;
      role: string;
      content: Array<{ type: string; image?: string }>;
    };
    expect(userMsg.type).toBe("message");
    expect(userMsg.role).toBe("user");
    const imagePart = userMsg.content.find((c) => c.type === "input_image");
    expect(imagePart).toBeTruthy();
    expect((imagePart as { image: string }).image).toBe(TEST_IMAGE_DATA);
  });

  it("should always produce { success: true, data: { ... } } envelope", () => {
    // Even for flat input (no data wrapper), stripped output is wrapped
    const items = [createScreenshotToolResult()];
    const shaped = shapeScreenshotItems(items);
    const parsed = JSON.parse(
      (shaped[0] as { output: string }).output,
    );

    expect(parsed).toHaveProperty("success", true);
    expect(parsed).toHaveProperty("data");
    expect(typeof parsed.data).toBe("object");
    expect(parsed.data.imageData).toBe(PLACEHOLDER);
  });

  // --- SDK output format tests ---
  // The @openai/agents SDK wraps tool outputs in { type: 'text', text: '...' }
  // via getToolCallOutputItem(). These tests verify shaping works with that format.

  it("should shape SDK-format output (type: text object wrapper)", () => {
    const items = [createSdkScreenshotToolResult()];
    const shaped = shapeScreenshotItems(items);

    expect(shaped.length).toBe(2);

    // First item: stripped tool result - output should preserve text object format
    const toolResult = shaped[0] as { type: string; output: unknown };
    expect(toolResult.type).toBe("function_call_result");

    // Output should be { type: 'text', text: '...' } (same format as input)
    const output = toolResult.output as { type: string; text: string };
    expect(output.type).toBe("text");
    expect(typeof output.text).toBe("string");

    const parsed = JSON.parse(output.text);
    expect(parsed.success).toBe(true);
    expect(parsed.data.imageData).toBe(PLACEHOLDER);
    expect(parsed.data.screenshotUid).toBe(TEST_SCREENSHOT_UID);
    expect(parsed.data.sendToLLM).toBe(true);

    // Second item: transient user image message
    const userMsg = shaped[1] as {
      type: string;
      role: string;
      content: Array<{ type: string; image?: string }>;
      providerData?: Record<string, unknown>;
    };
    expect(userMsg.type).toBe("message");
    expect(userMsg.role).toBe("user");
    expect(userMsg.providerData?.[TRANSIENT_SCREENSHOT_MARKER]).toBe(true);
    const imagePart = userMsg.content.find((c) => c.type === "input_image");
    expect((imagePart as { image: string }).image).toBe(TEST_IMAGE_DATA);
  });

  it("should pass through SDK-format output when sendToLLM=false", () => {
    const items = [
      createSdkScreenshotToolResult({
        sendToLLM: false,
        imageData: undefined,
        captured: true,
      }),
    ];
    const shaped = shapeScreenshotItems(items);

    expect(shaped.length).toBe(1);
    expect(shaped[0]).toEqual(items[0]);
  });

  it("should handle SDK-format output for capture_screenshot_with_highlight", () => {
    const output = {
      success: true,
      imageData: TEST_IMAGE_DATA,
      sendToLLM: true,
      screenshotUid: TEST_SCREENSHOT_UID,
      tabId: 1,
      url: "https://example.com",
      title: "Example",
      selector: ".my-element",
      cropped: true,
    };
    const item: AgentInputItem = {
      type: "function_call_result",
      name: "capture_screenshot_with_highlight",
      callId: "call_sdk_highlight",
      status: "completed",
      output: { type: "text", text: JSON.stringify(output) },
    } as AgentInputItem;

    const shaped = shapeScreenshotItems([item]);

    expect(shaped.length).toBe(2);

    // Output preserves text object format
    const toolOutput = (shaped[0] as { output: unknown }).output as {
      type: string;
      text: string;
    };
    expect(toolOutput.type).toBe("text");
    const parsed = JSON.parse(toolOutput.text);
    expect(parsed.success).toBe(true);
    expect(parsed.data.imageData).toBe(PLACEHOLDER);
  });

  it("should handle SDK array output format", () => {
    const outputJson = JSON.stringify({
      success: true,
      imageData: TEST_IMAGE_DATA,
      sendToLLM: true,
      screenshotUid: TEST_SCREENSHOT_UID,
    });
    // The SDK may produce array-wrapped outputs in some structured paths.
    // TypeScript types don't perfectly cover this at compile time, hence
    // the cast through unknown.
    const item = {
      type: "function_call_result",
      name: "capture_screenshot",
      callId: "call_sdk_array",
      status: "completed",
      output: [{ type: "text", text: outputJson }],
    } as unknown as AgentInputItem;

    const shaped = shapeScreenshotItems([item]);

    expect(shaped.length).toBe(2);

    // Output should be { type: 'text', text: '...' } (normalized from array)
    const toolOutput = (shaped[0] as { output: unknown }).output as {
      type: string;
      text: string;
    };
    expect(toolOutput.type).toBe("text");
    const parsed = JSON.parse(toolOutput.text);
    expect(parsed.success).toBe(true);
    expect(parsed.data.imageData).toBe(PLACEHOLDER);
  });
});

describe("pruneTransientScreenshotItems", () => {
  it("should remove transient screenshot items", () => {
    const transient: AgentInputItem = {
      type: "message",
      role: "user",
      content: [
        { type: "input_text", text: "screenshot" },
        { type: "input_image", image: TEST_IMAGE_DATA, detail: "auto" },
      ],
      providerData: { [TRANSIENT_SCREENSHOT_MARKER]: true },
    } as AgentInputItem;

    const normal = createUserMessage("hello");

    const pruned = pruneTransientScreenshotItems([normal, transient]);
    expect(pruned.length).toBe(1);
    expect(pruned[0]).toEqual(normal);
  });

  it("should keep all items when no transients exist", () => {
    const items = [createUserMessage("a"), createUserMessage("b")];
    const pruned = pruneTransientScreenshotItems(items);
    expect(pruned.length).toBe(2);
  });
});

describe("isTransientScreenshotItem", () => {
  it("should return true for transient items", () => {
    const item = {
      type: "message",
      role: "user",
      content: "test",
      providerData: { [TRANSIENT_SCREENSHOT_MARKER]: true },
    } as unknown as AgentInputItem;
    expect(isTransientScreenshotItem(item)).toBe(true);
  });

  it("should return false for normal items", () => {
    expect(isTransientScreenshotItem(createUserMessage("hello"))).toBe(false);
  });
});
