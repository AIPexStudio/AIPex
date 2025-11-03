import type { CompletedTurn } from "./types.js";
/**
 * Preview maximum length (in characters)
 */
export const MAX_PREVIEW_LENGTH = 100;

/**
 * Extract preview from user message
 */
export function extractPreview(message: string): string {
  if (!message || message.trim().length === 0) {
    return "";
  }

  let preview = message.trim();

  if (preview.length > MAX_PREVIEW_LENGTH) {
    preview = `${preview.slice(0, MAX_PREVIEW_LENGTH)}...`;
  }

  return preview;
}

/**
 * Extract first user message from session
 */
export function getFirstUserMessage(
  turns: CompletedTurn[],
): string | undefined {
  const firstTurn = turns[0];
  if (!firstTurn) {
    return undefined;
  }

  return firstTurn.userMessage.content;
}

/**
 * Generate default preview (when no user message exists)
 */
export function generateDefaultPreview(createdAt: number): string {
  const date = new Date(createdAt);
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `Conversation ${dateStr}`;
}
