import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Loader } from "@/components/ai-elements/loader";
import { cn } from "~/lib/utils";
import { useComponentsContext } from "../core/context";
import type { MessageListProps } from "../core/types";
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
                // This will be handled by the parent
                const event = new CustomEvent("chatbot:suggestion", {
                  detail: { text },
                });
                window.dispatchEvent(event);
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
