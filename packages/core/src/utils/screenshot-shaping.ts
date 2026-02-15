/**
 * Screenshot message shaping utilities.
 *
 * When a screenshot tool returns `sendToLLM=true`, the large base64 imageData
 * must NOT be sent inside the function_call_result output (models may not
 * support images there, and it bloats token counts).
 *
 * Instead, the imageData is:
 * 1. Stripped from the tool result (replaced with a placeholder string).
 * 2. Injected as a follow-up user message with `input_image` content.
 *
 * This matches the message flow used in the original aipex codebase.
 */

import type { AgentInputItem } from "@openai/agents";
import { safeJsonParse } from "./json.js";

/** Tool names whose results may include screenshot image data */
const SCREENSHOT_TOOL_NAMES = new Set([
  "capture_screenshot",
  "capture_screenshot_with_highlight",
  "capture_tab_screenshot",
]);

/** Placeholder that replaces imageData in the tool result */
const IMAGE_DATA_PLACEHOLDER =
  "[Image data removed - see following user message]";

/** Marker on transient user-image messages so they can be pruned */
export const TRANSIENT_SCREENSHOT_MARKER = "__transient_screenshot__";

/**
 * Process a batch of AgentInputItems. For any `function_call_result` from
 * a screenshot tool that contains `imageData` with `sendToLLM=true`:
 *   - Replace imageData with a placeholder in the tool result.
 *   - Insert a transient user message with the real image right after.
 *
 * Items that are not screenshot tool results pass through unchanged.
 */
export function shapeScreenshotItems(
  items: AgentInputItem[],
): AgentInputItem[] {
  const result: AgentInputItem[] = [];

  for (const item of items) {
    if (item.type !== "function_call_result") {
      result.push(item);
      continue;
    }

    const funcResult = item as {
      type: "function_call_result";
      name: string;
      callId: string;
      output: string;
      [key: string]: unknown;
    };

    if (!SCREENSHOT_TOOL_NAMES.has(funcResult.name)) {
      result.push(item);
      continue;
    }

    // Try to parse the output and extract imageData
    const parsed = safeJsonParse<Record<string, unknown>>(funcResult.output);
    if (!parsed) {
      result.push(item);
      continue;
    }

    const extracted = extractImageData(parsed);
    if (!extracted) {
      // No sendToLLM image data – pass through
      result.push(item);
      continue;
    }

    // 1. Rewrite the tool result with imageData stripped
    const strippedOutput = buildStrippedOutput(parsed, extracted.screenshotUid);
    const strippedItem: AgentInputItem = {
      ...item,
      output: JSON.stringify(strippedOutput),
    } as AgentInputItem;
    result.push(strippedItem);

    // 2. Insert a transient user message carrying the real image
    const toolName = funcResult.name;
    const messageText =
      toolName === "computer"
        ? "Here is the screenshot from the computer action:"
        : "Here is the screenshot you requested:";

    const userImageMessage: AgentInputItem = {
      type: "message",
      role: "user",
      content: [
        { type: "input_text", text: messageText },
        {
          type: "input_image",
          image: extracted.imageData,
          detail: "auto",
        },
      ],
      // Mark as transient so it can be pruned before persistence/compression
      providerData: { [TRANSIENT_SCREENSHOT_MARKER]: true },
    } as AgentInputItem;

    result.push(userImageMessage);
  }

  return result;
}

/**
 * Remove transient screenshot user-image messages from items.
 * Used before persistence or compression.
 */
export function pruneTransientScreenshotItems(
  items: AgentInputItem[],
): AgentInputItem[] {
  return items.filter((item) => {
    const pd = (item as { providerData?: Record<string, unknown> })
      .providerData;
    return !pd?.[TRANSIENT_SCREENSHOT_MARKER];
  });
}

/**
 * Check if an item is a transient screenshot user-image message.
 */
export function isTransientScreenshotItem(item: AgentInputItem): boolean {
  const pd = (item as { providerData?: Record<string, unknown> }).providerData;
  return !!pd?.[TRANSIENT_SCREENSHOT_MARKER];
}

// ===================== Internal helpers =====================

interface ExtractedImage {
  imageData: string;
  screenshotUid?: string;
}

/**
 * Extract imageData from parsed tool output.
 * Handles nested structures:
 *   { success, data: { imageData, sendToLLM, screenshotUid } }
 *   { success, imageData, sendToLLM, screenshotUid }
 */
function extractImageData(
  parsed: Record<string, unknown>,
): ExtractedImage | null {
  if (!parsed.success) return null;

  // Navigate possible nesting levels
  const data = parsed.data as Record<string, unknown> | undefined;
  const actual = data ?? parsed;

  // Must have sendToLLM === true
  if (actual.sendToLLM !== true) return null;

  const imageData = actual.imageData;
  if (typeof imageData !== "string" || !imageData.startsWith("data:image/")) {
    return null;
  }

  return {
    imageData,
    screenshotUid:
      typeof actual.screenshotUid === "string"
        ? actual.screenshotUid
        : undefined,
  };
}

/**
 * Build the stripped tool output object (imageData replaced with placeholder).
 */
function buildStrippedOutput(
  parsed: Record<string, unknown>,
  screenshotUid?: string,
): Record<string, unknown> {
  const data = parsed.data as Record<string, unknown> | undefined;
  const actual = data ?? parsed;

  const stripped: Record<string, unknown> = {
    ...actual,
    imageData: IMAGE_DATA_PLACEHOLDER,
  };

  if (screenshotUid) {
    stripped.screenshotUid = screenshotUid;
  }

  // If there was a `data` wrapper, preserve it
  if (data) {
    return { success: true, data: stripped };
  }
  return { success: true, ...stripped };
}
