/**
 * Share Conversation Service
 * Uploads the current conversation to the hosted share API and returns
 * a shareable URL.
 */

import type { UIMessage } from "@aipexstudio/aipex-react/types";
import { WEBSITE_URL } from "../config/website";
import { getAuthCookieHeader } from "./web-auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ShareablePart {
  type: string;
  [key: string]: unknown;
}

interface ShareableMessage {
  id: string;
  role: string;
  content: { parts: ShareablePart[] };
  metadata?: Record<string, unknown>;
}

export interface ShareResult {
  url: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a UI message part to a shareable format.
 * Strips large binary payloads (screenshots) and internal-only fields.
 */
function toShareablePart(part: UIMessage["parts"][number]): ShareablePart {
  switch (part.type) {
    case "text":
      return { type: "text", text: part.text };
    case "file":
      return {
        type: "file",
        mediaType: part.mediaType,
        filename: part.filename,
        url: part.url,
      };
    case "context":
      return {
        type: "context",
        contextType: part.contextType,
        label: part.label,
        value: part.value,
        metadata: part.metadata,
      };
    case "source-url":
      return { type: "source-url", url: part.url };
    case "reasoning":
      return { type: "reasoning", text: part.text };
    case "tool":
      return {
        type: "tool",
        toolName: part.toolName,
        input: part.input,
        output: part.output,
        state: part.state,
        errorText: part.errorText,
        toolCallId: part.toolCallId,
        // Note: screenshot is intentionally omitted from share payload
      };
    default:
      return part as ShareablePart;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Share a conversation by uploading messages to the share API.
 * @returns The shareable URL on success
 * @throws On network or server errors
 */
export async function shareConversation(
  messages: UIMessage[],
): Promise<ShareResult> {
  // Filter out system messages
  const messagesToShare = messages.filter((m) => m.role !== "system");

  if (messagesToShare.length === 0) {
    throw new Error("No messages to share");
  }

  const shareableMessages: ShareableMessage[] = messagesToShare.map((msg) => ({
    id: msg.id,
    role: msg.role,
    content: { parts: msg.parts.map(toShareablePart) },
    metadata: msg.metadata,
  }));

  const cookieHeader = await getAuthCookieHeader();

  const response = await fetch(`${WEBSITE_URL}/api/share`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
    body: JSON.stringify({ messages: shareableMessages }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Share failed (${response.status}): ${text || "Unknown error"}`,
    );
  }

  const result = (await response.json()) as Record<string, unknown>;

  if (typeof result.url !== "string") {
    throw new Error("Share succeeded but no URL was returned");
  }

  return { url: result.url };
}
