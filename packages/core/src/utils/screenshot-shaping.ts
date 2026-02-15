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
      output: unknown;
      [key: string]: unknown;
    };

    if (!SCREENSHOT_TOOL_NAMES.has(funcResult.name)) {
      result.push(item);
      continue;
    }

    // Normalize output: the SDK wraps tool return values in
    // { type: 'text', text: '...' }, but older paths may use plain strings.
    const { jsonString, outputFormat } = extractOutputJsonString(
      funcResult.output,
    );
    if (!jsonString) {
      result.push(item);
      continue;
    }

    // Try to parse the output and extract imageData
    const parsed = safeJsonParse<Record<string, unknown>>(jsonString);
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

    // 1. Rewrite the tool result with imageData stripped,
    //    preserving the original output format (object wrapper or plain string)
    const strippedOutput = buildStrippedOutput(parsed, extracted.screenshotUid);
    const strippedJson = JSON.stringify(strippedOutput);
    const newOutput =
      outputFormat === "text_object"
        ? { type: "text", text: strippedJson }
        : strippedJson;
    const strippedItem: AgentInputItem = {
      ...item,
      output: newOutput,
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

/** Describes how the SDK stored the output value */
type OutputFormat = "plain_string" | "text_object";

/**
 * Extract the JSON string from a tool result `output` field.
 *
 * The `@openai/agents` SDK wraps tool return values through
 * `getToolCallOutputItem()`. For non-structured outputs the SDK produces:
 *   `{ type: 'text', text: '<json string>' }`
 *
 * Older code paths or tests may use a plain string instead.
 * We also handle arrays where the first element is a text object.
 */
function extractOutputJsonString(output: unknown): {
  jsonString: string | null;
  outputFormat: OutputFormat;
} {
  // Plain string (legacy / test path)
  if (typeof output === "string") {
    return { jsonString: output, outputFormat: "plain_string" };
  }

  // SDK object wrapper: { type: 'text', text: '...' }
  if (
    output !== null &&
    typeof output === "object" &&
    !Array.isArray(output) &&
    (output as Record<string, unknown>).type === "text" &&
    typeof (output as Record<string, unknown>).text === "string"
  ) {
    return {
      jsonString: (output as { text: string }).text,
      outputFormat: "text_object",
    };
  }

  // SDK array wrapper: [{ type: 'text', text: '...' }, ...]
  if (Array.isArray(output)) {
    const textEntry = output.find(
      (entry: unknown) =>
        entry !== null &&
        typeof entry === "object" &&
        (entry as Record<string, unknown>).type === "text" &&
        typeof (entry as Record<string, unknown>).text === "string",
    ) as { text: string } | undefined;
    if (textEntry) {
      return { jsonString: textEntry.text, outputFormat: "text_object" };
    }
  }

  return { jsonString: null, outputFormat: "plain_string" };
}

interface ExtractedImage {
  imageData: string;
  screenshotUid?: string;
}

/**
 * Extract imageData from parsed tool output.
 * Handles nested structures matching the old aipex pattern:
 *   { success, imageData, sendToLLM, screenshotUid }           (flat)
 *   { success, data: { imageData, sendToLLM, screenshotUid } } (one level)
 *   { data: { data: { imageData, sendToLLM, screenshotUid } } } (two levels)
 */
function extractImageData(
  parsed: Record<string, unknown>,
): ExtractedImage | null {
  if (!parsed.success) return null;

  // Navigate possible nesting levels (mirrors old aipex:
  //   middleLayer?.data || middleLayer || parsedContent)
  const actual = resolveActualData(parsed);

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
 * Navigate into a parsed tool result to reach the "actual data" layer.
 * Handles:
 *   - flat:       { success, imageData, ... }
 *   - one level:  { success, data: { imageData, ... } }
 *   - two levels: { data: { data: { imageData, ... } } }
 *
 * Mirrors the old aipex pattern:
 *   middleLayer?.data || middleLayer || parsedContent
 */
function resolveActualData(
  parsed: Record<string, unknown>,
): Record<string, unknown> {
  const middleLayer = parsed.data as Record<string, unknown> | undefined;
  if (middleLayer && typeof middleLayer === "object") {
    const innerData = middleLayer.data as Record<string, unknown> | undefined;
    if (innerData && typeof innerData === "object") {
      return innerData;
    }
    return middleLayer;
  }
  return parsed;
}

/**
 * Build the stripped tool output object (imageData replaced with placeholder).
 *
 * Always produces the `{ success: true, data: { ...actualData } }` envelope
 * to match the message format expected by the old aipex codebase.
 */
function buildStrippedOutput(
  parsed: Record<string, unknown>,
  screenshotUid?: string,
): Record<string, unknown> {
  const actual = resolveActualData(parsed);

  const stripped: Record<string, unknown> = {
    ...actual,
    imageData: IMAGE_DATA_PLACEHOLDER,
  };

  if (screenshotUid) {
    stripped.screenshotUid = screenshotUid;
  }

  // Always wrap in { success: true, data: { ... } } to match aipex convention
  return { success: true, data: stripped };
}
