/**
 * Utilities for detecting screenshot tools and extracting image data
 * from tool results.
 */

/** Tool names that produce screenshot image data */
const SCREENSHOT_TOOL_NAMES = new Set([
  "capture_screenshot",
  "capture_screenshot_with_highlight",
  "capture_tab_screenshot",
]);

/** URL prefix used in markdown for screenshot references */
export const AIPEX_SCREENSHOT_URL_PREFIX = "https://aipex-screenshot.invalid/";

/** Regex matching [[screenshot:...]] placeholders */
const SCREENSHOT_PLACEHOLDER_REGEX = /\[\[screenshot:([^\]]+)\]\]/g;

/** Validate that a uid looks like a screenshot uid */
export function isValidScreenshotUid(uid: string): boolean {
  return /^screenshot_\d+_[a-z0-9]{1,20}$/i.test(uid);
}

/**
 * Check if a tool is a screenshot/capture tool.
 */
export function isCaptureScreenshotTool(toolName: string): boolean {
  return SCREENSHOT_TOOL_NAMES.has(toolName);
}

export interface ScreenshotExtraction {
  /** Base64 data URL if available (may be null if already stripped) */
  imageData: string | null;
  /** Whether the screenshot was intended for LLM vision */
  sendToLLM: boolean;
  /** Unique identifier for loading from IndexedDB storage */
  screenshotUid: string | null;
}

/**
 * Extract screenshot info from a tool result.
 * Works with capture_screenshot and capture_tab_screenshot tools.
 *
 * Supports multiple result formats:
 * - Object: { success, imageData, sendToLLM, screenshotUid }
 * - Nested object: { success, data: { imageData, sendToLLM, screenshotUid } }
 * - SDK structured array: [{ type: "text", text: JSON }, { type: "image", image: dataUrl }]
 *
 * Returns screenshot details if found, null if this is not a screenshot result.
 */
export function extractScreenshotFromToolResult(
  toolName: string,
  result: unknown,
): ScreenshotExtraction | null {
  if (!isCaptureScreenshotTool(toolName)) return null;

  try {
    const content =
      typeof result === "string" ? JSON.parse(result) : result;
    if (content === null || content === undefined) return null;

    // SDK structured array format:
    // [{ type: "text", text: '{"success":true,...}' }, { type: "image", image: "data:..." }]
    if (Array.isArray(content)) {
      return extractFromStructuredArray(content);
    }

    if (typeof content !== "object") return null;

    const obj = content as Record<string, unknown>;

    // Handle nested structure: { success, data: { imageData, sendToLLM } }
    // or direct: { success, imageData, sendToLLM }
    const middleLayer = obj.data as Record<string, unknown> | undefined;
    const actualData =
      (middleLayer?.data as Record<string, unknown>) ?? middleLayer ?? obj;

    if (!obj.success) return null;

    // Extract screenshotUid (always present if tool saved to IndexedDB)
    const screenshotUid =
      typeof actualData.screenshotUid === "string"
        ? actualData.screenshotUid
        : null;

    // Extract imageData (may be a real data URL or a placeholder)
    const rawImageData = actualData.imageData;
    const imageData =
      typeof rawImageData === "string" &&
      rawImageData.startsWith("data:image/")
        ? rawImageData
        : null;

    const sendToLLM = actualData.sendToLLM === true;

    // Return if we have at least a uid or image data
    if (screenshotUid || imageData) {
      return { imageData, sendToLLM, screenshotUid };
    }
  } catch {
    // parse failed – ignore
  }

  return null;
}

/**
 * Extract screenshot from SDK structured array format.
 */
function extractFromStructuredArray(
  arr: unknown[],
): ScreenshotExtraction | null {
  let imageData: string | null = null;
  let screenshotUid: string | null = null;
  let sendToLLM = false;

  for (const item of arr) {
    if (typeof item !== "object" || item === null) continue;
    const part = item as Record<string, unknown>;

    if (part.type === "image" && typeof part.image === "string") {
      if (part.image.startsWith("data:image/")) {
        imageData = part.image;
      }
    }

    if (part.type === "text" && typeof part.text === "string") {
      try {
        const parsed = JSON.parse(part.text) as Record<string, unknown>;
        if (parsed.sendToLLM === true) sendToLLM = true;
        if (typeof parsed.screenshotUid === "string") {
          screenshotUid = parsed.screenshotUid;
        }
      } catch {
        // ignore
      }
    }
  }

  if (imageData) {
    return { imageData, sendToLLM: sendToLLM || true, screenshotUid };
  }
  return null;
}

/**
 * Transform [[screenshot:...]] placeholders in text into markdown images
 * with the special aipex-screenshot.invalid URL prefix.
 *
 * Supported formats:
 * - [[screenshot:screenshot_123_abc]]  → ![](https://aipex-screenshot.invalid/screenshot_123_abc)
 * - [[screenshot:1]]                   → 1-based index into screenshotUidList
 */
export function transformScreenshotPlaceholders(
  text: string,
  screenshotUidList: string[],
): string {
  return text.replace(
    SCREENSHOT_PLACEHOLDER_REGEX,
    (match: string, content: string) => {
      const trimmed = content.trim();

      // Case 1: Direct uid
      if (isValidScreenshotUid(trimmed)) {
        return `![](${AIPEX_SCREENSHOT_URL_PREFIX}${trimmed})`;
      }

      // Case 2: Numeric 1-based index
      const index = parseInt(trimmed, 10);
      if (
        !isNaN(index) &&
        index >= 1 &&
        index <= screenshotUidList.length
      ) {
        const uid = screenshotUidList[index - 1];
        if (uid && isValidScreenshotUid(uid)) {
          return `![](${AIPEX_SCREENSHOT_URL_PREFIX}${uid})`;
        }
      }

      // Invalid – leave as-is
      return match;
    },
  );
}
