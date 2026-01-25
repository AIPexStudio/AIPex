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
            return {
              type: "tool_result",
              tool_use_id: part.toolCallId,
              content: JSON.stringify(part.output),
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
 * Convert runtime UIMessage back to aipex-react UIMessage for display
 */
export function fromStorageFormat(
  messages: RuntimeUIMessage[],
): ReactUIMessage[] {
  return messages.map((msg) => ({
    id: msg.id,
    role: msg.role as ReactUIMessage["role"],
    parts: msg.parts.map((part) => {
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
          return {
            type: "tool",
            toolName: part.name,
            toolCallId: part.id,
            input: part.input,
            state: "completed" as const,
          };
        case "tool_result":
          return {
            type: "tool",
            toolName: "unknown",
            toolCallId: part.tool_use_id,
            input: {},
            output: part.content,
            state: part.is_error ? ("error" as const) : ("completed" as const),
          };
        default:
          return { type: "text", text: "[unknown]" };
      }
    }),
    timestamp: msg.timestamp,
  })) as ReactUIMessage[];
}
