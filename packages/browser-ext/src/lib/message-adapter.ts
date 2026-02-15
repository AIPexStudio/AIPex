/**
 * Message Adapter
 * Converts between aipex-react UIMessage and browser-runtime ConversationData format
 */

import type { UIMessage as ReactUIMessage } from "@aipexstudio/aipex-react/types";
import type { UIMessage as RuntimeUIMessage } from "@aipexstudio/browser-runtime";

/** Tool names whose results may include screenshot image data */
const SCREENSHOT_TOOL_NAMES = new Set([
  "capture_screenshot",
  "capture_screenshot_with_highlight",
  "capture_tab_screenshot",
]);

/** Placeholder that replaces base64 imageData in stored tool results */
const IMAGE_DATA_PLACEHOLDER =
  "[Image data removed - see following user message]";

interface ScreenshotToolInfo {
  /** The base64 data URL if present (may be null if already stripped) */
  imageData: string | null;
  /** The screenshot uid if present */
  screenshotUid: string | null;
}

/**
 * Navigate into the parsed tool result to find the "actual data" layer.
 * Handles nesting: { data: { ... } }, { data: { data: { ... } } }, or flat.
 */
function getScreenshotActualData(
  parsedOutput: unknown,
): Record<string, unknown> | null {
  if (typeof parsedOutput !== "object" || parsedOutput === null) return null;
  const obj = parsedOutput as Record<string, unknown>;
  const middleLayer = obj.data as Record<string, unknown> | undefined;
  return (middleLayer?.data as Record<string, unknown>) ?? middleLayer ?? obj;
}

/**
 * Extract screenshot info (imageData + screenshotUid) from a parsed tool result.
 */
function extractScreenshotInfo(
  toolName: string,
  parsedOutput: unknown,
): ScreenshotToolInfo | null {
  if (!SCREENSHOT_TOOL_NAMES.has(toolName)) return null;
  const actual = getScreenshotActualData(parsedOutput);
  if (!actual) return null;

  const imageData =
    typeof actual.imageData === "string" &&
    actual.imageData.startsWith("data:image/")
      ? actual.imageData
      : null;
  const screenshotUid =
    typeof actual.screenshotUid === "string" ? actual.screenshotUid : null;

  if (!imageData && !screenshotUid) return null;
  return { imageData, screenshotUid };
}

/**
 * Strip base64 imageData from a screenshot tool result string, replacing it
 * with a placeholder. Returns the stripped string (or the original if not applicable).
 */
function stripImageDataFromToolOutput(
  toolName: string,
  content: string,
): string {
  if (!SCREENSHOT_TOOL_NAMES.has(toolName)) return content;

  const parsed = safeJsonParse<Record<string, unknown>>(content);
  if (!parsed) return content;

  const actual = getScreenshotActualData(parsed);
  if (!actual) return content;

  if (
    typeof actual.imageData !== "string" ||
    !actual.imageData.startsWith("data:image/")
  ) {
    return content;
  }

  // Replace imageData in the actual data layer
  actual.imageData = IMAGE_DATA_PLACEHOLDER;
  return JSON.stringify(parsed);
}

/**
 * Convert aipex-react UIMessage to runtime UIMessage for storage
 */
export function toStorageFormat(
  messages: ReactUIMessage[],
): RuntimeUIMessage[] {
  return messages.map((msg) => ({
    id: msg.id,
    role: msg.role === "tool" ? "assistant" : msg.role, // Map "tool" to "assistant"
    parts: msg.parts.flatMap((part) => {
      switch (part.type) {
        case "text":
          return { type: "text", text: part.text };
        case "file":
          // Map file to image (store URL as imageData)
          return {
            type: "image",
            imageData: part.url,
            imageTitle: part.filename,
          };
        case "tool":
          // Map tool to tool_use + tool_result pair (when completed)
          // or just tool_use (when pending/executing).
          // Emitting both ensures fromStorageFormat can correlate them
          // to restore the proper toolName and input.
          if (part.output !== undefined) {
            // Avoid double-stringifying if output is already a string.
            let content =
              typeof part.output === "string"
                ? part.output
                : JSON.stringify(part.output);

            // Strip base64 imageData from screenshot tool results before
            // persisting to keep stored conversations small and avoid
            // storing large blobs. The screenshotUid is preserved in the
            // output so images can be loaded from IndexedDB on restore.
            content = stripImageDataFromToolOutput(part.toolName, content);

            return [
              {
                type: "tool_use",
                id: part.toolCallId,
                name: part.toolName,
                input: part.input as Record<string, unknown>,
              },
              {
                type: "tool_result",
                tool_use_id: part.toolCallId,
                content,
                is_error: part.state === "error",
              },
            ];
          }
          return {
            type: "tool_use",
            id: part.toolCallId,
            name: part.toolName,
            input: part.input as Record<string, unknown>,
          };
        default:
          // For context, source-url, reasoning - store as text
          if ("text" in part) {
            return { type: "text", text: part.text };
          }
          // Fallback: store as text with type info
          return { type: "text", text: `[${part.type}]` };
      }
    }),
    timestamp: msg.timestamp,
  })) as RuntimeUIMessage[];
}

/**
 * Safely parse a JSON string, returning undefined on failure
 */
function safeJsonParse<T>(value: unknown): T | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

/**
 * Check if a tool result indicates a business-level failure.
 * Many tools return { success: false, error: "..." } instead of throwing.
 */
function extractBusinessFailure(
  result: unknown,
): { errorMessage: string } | null {
  if (result === null || result === undefined) {
    return null;
  }

  if (typeof result !== "object") {
    return null;
  }

  const obj = result as Record<string, unknown>;

  // Check for common failure patterns: { success: false, error: ... }
  if (obj.success === false) {
    // Extract error message
    if (typeof obj.error === "string" && obj.error.length > 0) {
      return { errorMessage: obj.error };
    }
    if (typeof obj.message === "string" && obj.message.length > 0) {
      return { errorMessage: obj.message };
    }
    // Generic failure message
    return { errorMessage: "Operation failed" };
  }

  return null;
}

/**
 * Convert runtime UIMessage back to aipex-react UIMessage for display.
 * This function:
 * - Correlates tool_use and tool_result parts by id to restore proper toolName and input
 * - Parses JSON-stringified tool content
 * - Detects {success: false, error} patterns and sets state/errorText accordingly
 */
export function fromStorageFormat(
  messages: RuntimeUIMessage[],
): ReactUIMessage[] {
  return messages.map((msg) => {
    // First pass: build a map of tool_use parts by their ID
    const toolUseMap = new Map<
      string,
      { name: string; input: Record<string, unknown> }
    >();
    for (const part of msg.parts) {
      if (part.type === "tool_use") {
        toolUseMap.set(part.id, {
          name: part.name,
          input: part.input,
        });
      }
    }

    // Second pass: convert parts with proper correlation
    const convertedParts = msg.parts.map((part) => {
      switch (part.type) {
        case "text":
          return { type: "text", text: part.text };
        case "image":
          // Map image back to file
          return {
            type: "file",
            mediaType: "image/png", // Default
            filename: part.imageTitle,
            url: part.imageData,
          };
        case "tool_use":
          // We'll merge this with tool_result if both exist,
          // but if no result, show as executing/pending
          return {
            type: "tool",
            toolName: part.name,
            toolCallId: part.id,
            input: part.input,
            state: "pending" as const,
          };
        case "tool_result": {
          // Correlate with tool_use to get proper toolName and input
          const toolUseInfo = toolUseMap.get(part.tool_use_id);
          const toolName = toolUseInfo?.name ?? "unknown";
          const input = toolUseInfo?.input ?? {};

          // Parse the content - it may be JSON-stringified
          let parsedOutput: unknown = part.content;
          const parsed = safeJsonParse<unknown>(part.content);
          if (parsed !== undefined) {
            parsedOutput = parsed;
          }

          // Check for is_error flag first
          if (part.is_error) {
            // Extract error message from the parsed output if possible
            let errorText = "Tool execution failed";
            if (typeof parsedOutput === "string" && parsedOutput.length > 0) {
              errorText = parsedOutput;
            } else if (
              typeof parsedOutput === "object" &&
              parsedOutput !== null
            ) {
              const obj = parsedOutput as Record<string, unknown>;
              if (typeof obj.error === "string") {
                errorText = obj.error;
              } else if (typeof obj.message === "string") {
                errorText = obj.message;
              }
            }
            return {
              type: "tool",
              toolName,
              toolCallId: part.tool_use_id,
              input,
              output: parsedOutput,
              state: "error" as const,
              errorText,
            };
          }

          // Check for business-level failure ({success: false, error: ...})
          const failureInfo = extractBusinessFailure(parsedOutput);
          if (failureInfo) {
            return {
              type: "tool",
              toolName,
              toolCallId: part.tool_use_id,
              input,
              output: parsedOutput,
              state: "error" as const,
              errorText: failureInfo.errorMessage,
            };
          }

          // Normal successful completion – restore screenshot data
          const screenshotInfo = extractScreenshotInfo(toolName, parsedOutput);
          return {
            type: "tool",
            toolName,
            toolCallId: part.tool_use_id,
            input,
            output: parsedOutput,
            state: "completed" as const,
            // Restore screenshotUid so UI can load from IndexedDB
            ...(screenshotInfo?.screenshotUid
              ? { screenshotUid: screenshotInfo.screenshotUid }
              : {}),
            // Restore inline screenshot only if actual base64 is present
            // (not when it's been replaced with a placeholder)
            ...(screenshotInfo?.imageData
              ? { screenshot: screenshotInfo.imageData }
              : {}),
          };
        }
        default:
          return { type: "text", text: "[unknown]" };
      }
    });

    // Third pass: merge tool_use with tool_result if both exist for the same call
    // This avoids showing duplicate tool parts
    const mergedParts: (typeof convertedParts)[number][] = [];
    const processedToolCallIds = new Set<string>();

    for (const part of convertedParts) {
      if (part.type === "tool") {
        const toolCallId = part.toolCallId;
        // Skip if toolCallId is missing or we've already processed this tool call
        if (!toolCallId || processedToolCallIds.has(toolCallId)) {
          continue;
        }

        // Find if there's a corresponding result for this tool call
        const resultPart = convertedParts.find(
          (p) =>
            p.type === "tool" &&
            p.toolCallId === toolCallId &&
            p.state !== "pending" &&
            p !== part,
        );

        if (resultPart && resultPart.type === "tool") {
          // Use the result part (which has the full info)
          mergedParts.push(resultPart);
        } else {
          // No result, use the original part
          mergedParts.push(part);
        }

        processedToolCallIds.add(toolCallId);
      } else {
        mergedParts.push(part);
      }
    }

    return {
      id: msg.id,
      role: msg.role as ReactUIMessage["role"],
      parts: mergedParts,
      timestamp: msg.timestamp,
    };
  }) as ReactUIMessage[];
}
