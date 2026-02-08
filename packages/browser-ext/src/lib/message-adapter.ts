/**
 * Message Adapter
 * Converts between aipex-react UIMessage and browser-runtime ConversationData format
 */

import type { UIMessage as ReactUIMessage } from "@aipexstudio/aipex-react/types";
import type { UIMessage as RuntimeUIMessage } from "@aipexstudio/browser-runtime";

/**
 * Convert aipex-react UIMessage to runtime UIMessage for storage
 */
export function toStorageFormat(
  messages: ReactUIMessage[],
): RuntimeUIMessage[] {
  return messages.map((msg) => ({
    id: msg.id,
    role: msg.role === "tool" ? "assistant" : msg.role, // Map "tool" to "assistant"
    parts: msg.parts.map((part) => {
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
          // Map tool to tool_use or tool_result based on state
          if (part.output !== undefined) {
            // Avoid double-stringifying if output is already a string
            const content =
              typeof part.output === "string"
                ? part.output
                : JSON.stringify(part.output);
            return {
              type: "tool_result",
              tool_use_id: part.toolCallId,
              content,
              is_error: part.state === "error",
            };
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

          // Normal successful completion
          return {
            type: "tool",
            toolName,
            toolCallId: part.tool_use_id,
            input,
            output: parsedOutput,
            state: "completed" as const,
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
        // Skip if we've already processed this tool call
        if (processedToolCallIds.has(part.toolCallId)) {
          continue;
        }

        // Find if there's a corresponding result for this tool call
        const resultPart = convertedParts.find(
          (p) =>
            p.type === "tool" &&
            p.toolCallId === part.toolCallId &&
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

        processedToolCallIds.add(part.toolCallId);
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
