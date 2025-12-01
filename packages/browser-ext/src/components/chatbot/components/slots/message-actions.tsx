import {
  CopyIcon,
  RefreshCcwIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
} from "lucide-react";
import { Action, Actions } from "@/components/ai-elements/actions";
import type { MessageActionsSlotProps } from "~/types";

/**
 * Default message actions slot component
 */
export function DefaultMessageActions({
  message,
  onRegenerate,
  onCopy,
}: MessageActionsSlotProps) {
  // Find text content for copy
  const textContent = message.parts
    .filter((p) => p.type === "text")
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("\n");

  return (
    <Actions className="mt-2">
      {onRegenerate && (
        <Action onClick={onRegenerate} label="Retry">
          <RefreshCcwIcon className="size-3" />
        </Action>
      )}
      {onCopy && textContent && (
        <Action onClick={() => onCopy(textContent)} label="Copy">
          <CopyIcon className="size-3" />
        </Action>
      )}
    </Actions>
  );
}

/**
 * Extended message actions with feedback buttons
 */
export function MessageActionsWithFeedback({
  message,
  onRegenerate,
  onCopy,
  onFeedback,
}: MessageActionsSlotProps & {
  onFeedback?: (messageId: string, type: "up" | "down") => void;
}) {
  const textContent = message.parts
    .filter((p) => p.type === "text")
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("\n");

  return (
    <Actions className="mt-2">
      {onRegenerate && (
        <Action onClick={onRegenerate} label="Retry">
          <RefreshCcwIcon className="size-3" />
        </Action>
      )}
      {onCopy && textContent && (
        <Action onClick={() => onCopy(textContent)} label="Copy">
          <CopyIcon className="size-3" />
        </Action>
      )}
      {onFeedback && (
        <>
          <Action
            onClick={() => onFeedback(message.id, "up")}
            label="Good response"
          >
            <ThumbsUpIcon className="size-3" />
          </Action>
          <Action
            onClick={() => onFeedback(message.id, "down")}
            label="Bad response"
          >
            <ThumbsDownIcon className="size-3" />
          </Action>
        </>
      )}
    </Actions>
  );
}
