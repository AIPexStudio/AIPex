/**
 * BrowserChatHeader
 * Custom header with conversation persistence and history dropdown
 */

import { useChatContext } from "@aipexstudio/aipex-react/components/chatbot";
import { Button } from "@aipexstudio/aipex-react/components/ui/button";
import { useTranslation } from "@aipexstudio/aipex-react/i18n/context";
import { getRuntime } from "@aipexstudio/aipex-react/lib/runtime";
import { cn } from "@aipexstudio/aipex-react/lib/utils";
import type { HeaderProps } from "@aipexstudio/aipex-react/types";
import { conversationStorage } from "@aipexstudio/browser-runtime";
import { PlusIcon, SettingsIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConversationHistory } from "./conversation-history";
import { fromStorageFormat, toStorageFormat } from "./message-adapter";
import { useAuth, UserProfile } from "../auth";

export function BrowserChatHeader({
  title = "AIPex",
  onSettingsClick,
  onNewChat,
  className,
  children,
  ...props
}: HeaderProps) {
  const { t } = useTranslation();
  const runtime = getRuntime();
  const { messages, setMessages, interrupt } = useChatContext();
  const { user, login, isLoading: isAuthLoading } = useAuth();

  const [currentConversationId, setCurrentConversationId] = useState<
    string | undefined
  >();

  // Persistence: debounced save/update on messages change
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save for 1 second
    saveTimeoutRef.current = setTimeout(async () => {
      // Only save if we have non-system messages
      const nonSystemMessages = messages.filter((msg) => msg.role !== "system");
      if (nonSystemMessages.length === 0) return;

      try {
        if (currentConversationId) {
          // Update existing conversation
          await conversationStorage.updateConversation(
            currentConversationId,
            toStorageFormat(messages),
          );
        } else if (nonSystemMessages.length >= 2) {
          // Create new conversation only when we have at least user message + assistant response
          const conversationId = await conversationStorage.saveConversation(
            toStorageFormat(messages),
          );
          if (conversationId) {
            setCurrentConversationId(conversationId);
            console.log(
              "💾 New conversation created and saved:",
              conversationId,
            );
          }
        }
      } catch (error) {
        console.error("❌ Failed to save conversation:", error);
      }
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [messages, currentConversationId]);

  const handleOpenOptions = useCallback(() => {
    if (onSettingsClick) {
      onSettingsClick();
    } else if (runtime?.openOptionsPage) {
      runtime.openOptionsPage();
    }
  }, [onSettingsClick, runtime]);

  const handleConversationSelect = async (conversationId: string) => {
    try {
      const conversation =
        await conversationStorage.getConversation(conversationId);
      if (!conversation) {
        console.warn("⚠️ Conversation not found:", conversationId);
        return;
      }

      // Interrupt any ongoing operation
      if (interrupt) {
        await interrupt();
      }

      // Set the current conversation ID first
      setCurrentConversationId(conversationId);

      // Restore messages to UI state (convert from storage format)
      setMessages(fromStorageFormat(conversation.messages));

      console.log(
        "✅ Conversation restored:",
        conversationId,
        conversation.title,
      );
    } catch (error) {
      console.error("❌ Failed to restore conversation:", error);
    }
  };

  const handleNewChat = useCallback(() => {
    // Clear current conversation ID so next save creates new conversation
    setCurrentConversationId(undefined);

    // Call the passed onNewChat (resets messages and clears input)
    onNewChat?.();
  }, [onNewChat]);

  return (
    <div
      className={cn(
        "flex items-center justify-between border-b px-4 py-2",
        className,
      )}
      {...props}
    >
      {/* Left side - Settings */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpenOptions}
        className="gap-2"
      >
        <SettingsIcon className="size-4" />
        {t("common.settings")}
      </Button>

      {/* Center - History */}
      <ConversationHistory
        currentConversationId={currentConversationId}
        onConversationSelect={handleConversationSelect}
        onNewConversation={handleNewChat}
      />

      {/* Right side - New Chat and User Profile */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNewChat}
          className="gap-2"
        >
          <PlusIcon className="size-4" />
          {t("common.newChat")}
        </Button>

        {/* User Profile or Login Button */}
        {!isAuthLoading && (
          user ? (
            <UserProfile />
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={login}
              className="gap-2"
            >
              Sign In
            </Button>
          )
        )}
      </div>

      {children}
    </div>
  );
}
