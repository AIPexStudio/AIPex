/**
 * ConversationHistory Component
 * Clock-icon dropdown that lists recent conversations with select/delete/new actions
 */

import { Button } from "@aipexstudio/aipex-react/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@aipexstudio/aipex-react/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@aipexstudio/aipex-react/components/ui/tooltip";
import { useTranslation } from "@aipexstudio/aipex-react/i18n/context";
import { cn } from "@aipexstudio/aipex-react/lib/utils";
import {
  type ConversationData,
  conversationStorage,
} from "@aipexstudio/browser-runtime";
import { ClockIcon, MessageSquareIcon, Trash2Icon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface ConversationHistoryProps {
  currentConversationId?: string;
  onConversationSelect: (conversationId: string) => void;
  onNewConversation: () => void;
  className?: string;
}

export function ConversationHistory({
  currentConversationId,
  onConversationSelect,
  onNewConversation,
  className,
}: ConversationHistoryProps) {
  const { t } = useTranslation();
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      const allConversations = await conversationStorage.getAllConversations();
      setConversations(allConversations);
    } catch (error) {
      console.error("❌ Failed to load conversations:", error);
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  const handleDeleteConversation = async (
    conversationId: string,
    event: React.MouseEvent,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      await conversationStorage.deleteConversation(conversationId);
      await loadConversations();

      // If the deleted conversation was current, start a new one
      if (conversationId === currentConversationId) {
        onNewConversation();
      }
    } catch (error) {
      console.error("❌ Failed to delete conversation:", error);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      if (diffInMinutes <= 1) {
        return t("conversationHistory.timeFormat.justNow");
      }
      return t("conversationHistory.timeFormat.minutesAgo", {
        count: diffInMinutes,
      });
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      if (hours === 1) {
        return t("conversationHistory.timeFormat.hourAgo");
      }
      return t("conversationHistory.timeFormat.hoursAgo", { count: hours });
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays === 1) {
        return t("conversationHistory.timeFormat.yesterday");
      }
      if (diffInDays < 7) {
        return t("conversationHistory.timeFormat.daysAgo", {
          count: diffInDays,
        });
      }
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    }
  };

  if (isLoading) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled
            className={cn("animate-pulse", className)}
          >
            <ClockIcon className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t("conversationHistory.loading")}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className={className}>
              <ClockIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t("conversationHistory.title")}</p>
        </TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="start" className="w-80">
        {conversations.length === 0 ? (
          <div className="px-3 py-6 text-center text-muted-foreground">
            <MessageSquareIcon className="mx-auto size-8 mb-2 opacity-50" />
            <p className="text-sm">{t("conversationHistory.noHistory")}</p>
          </div>
        ) : (
          <>
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b">
              {t("conversationHistory.recentConversations")} (
              {conversations.length}/5)
            </div>
            {conversations.map((conversation) => (
              <DropdownMenuItem
                key={conversation.id}
                className={cn(
                  "flex items-start gap-3 p-3 cursor-pointer hover:bg-accent focus:bg-accent group",
                  currentConversationId === conversation.id && "bg-accent/50",
                )}
                onClick={() => onConversationSelect(conversation.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquareIcon className="size-3.5 flex-shrink-0 text-muted-foreground" />
                    <span className="text-sm font-medium truncate">
                      {conversation.title}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {conversation.messages.length}{" "}
                      {t("conversationHistory.messagesCount")}
                    </span>
                    <span>{formatDate(conversation.updatedAt)}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 flex-shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleDeleteConversation(conversation.id, e)}
                >
                  <Trash2Icon className="size-3" />
                </Button>
              </DropdownMenuItem>
            ))}
            {conversations.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onNewConversation}
                  className="flex items-center gap-2 p-3 text-sm font-medium cursor-pointer"
                >
                  <MessageSquareIcon className="size-4" />
                  {t("conversationHistory.newConversation")}
                </DropdownMenuItem>
              </>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
