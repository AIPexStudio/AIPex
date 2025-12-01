import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Loader } from "@/components/ai-elements/loader";
import { cn } from "~/lib/utils";
import type { MessageListProps } from "~/types";
import { useComponentsContext } from "../core/context";
import { MessageItem } from "./message-item";
import { WelcomeScreen } from "./welcome-screen";

/**
 * Default MessageList component
 */
export function DefaultMessageList({
  messages,
  status,
  onRegenerate,
  onCopy,
  onSuggestionClick,
  className,
  ...props
}: MessageListProps & {
  onSuggestionClick?: (text: string) => void;
}) {
  const { slots } = useComponentsContext();

  // Filter out system messages for display
  const displayMessages = messages.filter((m) => m.role !== "system");

  return (
    <div className={cn("flex-1 overflow-hidden", className)} {...props}>
      <Conversation className="h-full">
        <ConversationContent>
          {displayMessages.length === 0 ? (
            <WelcomeScreen
              onSuggestionClick={(text) => {
                onSuggestionClick?.(text);
              }}
            />
          ) : (
            displayMessages.map((message, index) => (
              <MessageItem
                key={message.id}
                message={message}
                isLast={index === displayMessages.length - 1}
                isStreaming={status === "streaming"}
                onRegenerate={onRegenerate}
                onCopy={onCopy}
              />
            ))
          )}
          {/* Loading indicator */}
          {status === "submitted" &&
            (slots.loadingIndicator ? slots.loadingIndicator() : <Loader />)}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
    </div>
  );
}

/**
 * MessageList - Renders either custom or default message list
 */
export function MessageList(
  props: MessageListProps & { onSuggestionClick?: (text: string) => void },
) {
  const { components } = useComponentsContext();

  const CustomComponent = components.MessageList;
  if (CustomComponent) {
    return <CustomComponent {...props} />;
  }

  return <DefaultMessageList {...props} />;
}
