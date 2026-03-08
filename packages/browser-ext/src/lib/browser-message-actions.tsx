/**
 * BrowserMessageActions
 * Custom message actions for the browser extension.
 * Renders Retry, Copy, Share Conversation, and Save as Skill inline
 * with each last assistant message (matching aipex behavior).
 */

import {
  Action,
  Actions,
} from "@aipexstudio/aipex-react/components/ai-elements/actions";
import { useChatContext } from "@aipexstudio/aipex-react/components/chatbot";
import type { MessageActionsSlotProps } from "@aipexstudio/aipex-react/types";
import {
  CopyIcon,
  PuzzleIcon,
  RefreshCcwIcon,
  Share2Icon,
} from "lucide-react";
import { useCallback, useState } from "react";
import { useConfigContext } from "@aipexstudio/aipex-react/components/chatbot";
import { useAuth } from "../auth";
import { isByokConfigured } from "./ai-provider";
import { shareConversation } from "../services/share-conversation";

export function BrowserMessageActions({
  onRegenerate,
  onCopy,
}: MessageActionsSlotProps) {
  const { messages, sendMessage } = useChatContext();
  const { user } = useAuth();
  const { settings } = useConfigContext();
  const [isSharing, setIsSharing] = useState(false);

  const isByok = isByokConfigured(settings);

  const handleShare = useCallback(async () => {
    if (isSharing) return;

    const nonSystemMessages = messages.filter((m) => m.role !== "system");
    if (nonSystemMessages.length === 0) return;

    setIsSharing(true);
    try {
      const { url } = await shareConversation(messages);
      chrome.tabs.create({ url });
    } catch (error) {
      console.error(
        "[Share] Failed:",
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setIsSharing(false);
    }
  }, [messages, isSharing]);

  const handleSaveAsSkill = useCallback(() => {
    sendMessage("use skill-creator skill to save the conversation");
  }, [sendMessage]);

  return (
    <Actions className="mt-2">
      {onCopy && (
        <Action onClick={onCopy} label="Copy">
          <CopyIcon className="size-3" />
        </Action>
      )}
      {!isByok && user && (
        <Action
          onClick={handleShare}
          disabled={isSharing}
          label={isSharing ? "Sharing..." : "Share"}
        >
          <Share2Icon className="size-3" />
        </Action>
      )}
      <Action onClick={handleSaveAsSkill} label="Save as Skill">
        <PuzzleIcon className="size-3" />
      </Action>
      {onRegenerate && (
        <Action onClick={onRegenerate} label="Retry">
          <RefreshCcwIcon className="size-3" />
        </Action>
      )}
    </Actions>
  );
}
