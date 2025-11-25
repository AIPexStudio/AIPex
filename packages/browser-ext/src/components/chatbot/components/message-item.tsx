import { CopyIcon, RefreshCcwIcon } from "lucide-react";
import { Fragment } from "react";
import { Action, Actions } from "@/components/ai-elements/actions";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Response } from "@/components/ai-elements/response";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { cn } from "~/lib/utils";
import { useComponentsContext } from "../core/context";
import type {
  MessageItemProps,
  UISourceUrlPart,
  UIToolPart,
} from "../core/types";

/**
 * Format tool output for display
 */
function formatToolOutput(output: unknown): string {
  return `
\`\`\`${typeof output === "string" ? "text" : "json"}
${typeof output === "string" ? output : JSON.stringify(output, null, 2)}
\`\`\`
`;
}

/**
 * Get icon for context type
 */
function getContextIcon(contextType: string): string {
  const icons: Record<string, string> = {
    page: "🌐",
    tab: "📄",
    bookmark: "🔖",
    clipboard: "📋",
    screenshot: "📷",
  };
  return icons[contextType] || "📝";
}

/**
 * Map UI tool state to tool component state
 */
function mapToolState(
  state: UIToolPart["state"],
):
  | "input-streaming"
  | "input-available"
  | "executing"
  | "output-available"
  | "output-error" {
  switch (state) {
    case "pending":
      return "input-available";
    case "executing":
      return "executing";
    case "completed":
      return "output-available";
    case "error":
      return "output-error";
    default:
      return "input-available";
  }
}

/**
 * Default MessageItem component
 */
export function DefaultMessageItem({
  message,
  isLast = false,
  isStreaming = false,
  onRegenerate,
  onCopy,
  className,
  ...props
}: MessageItemProps) {
  const { slots } = useComponentsContext();

  // Filter out system messages
  if (message.role === "system") {
    return null;
  }

  // Render sources if present
  const sourceUrls = message.parts.filter(
    (part): part is UISourceUrlPart => part.type === "source-url",
  );

  return (
    <div className={className} {...props}>
      {/* Sources */}
      {message.role === "assistant" && sourceUrls.length > 0 && (
        <Sources>
          <SourcesTrigger count={sourceUrls.length} />
          {sourceUrls.map((part, i) => (
            <SourcesContent key={`${message.id}-source-${i}`}>
              <Source href={part.url} title={part.url} />
            </SourcesContent>
          ))}
        </Sources>
      )}

      {/* Message parts */}
      {message.parts.map((part, i) => {
        const key = `${message.id}-${i}`;

        switch (part.type) {
          case "text":
            return (
              <Fragment key={key}>
                <Message from={message.role as "user" | "assistant" | "system"}>
                  <MessageContent>
                    <Response>{part.text}</Response>
                  </MessageContent>
                </Message>
                {/* Actions for last assistant message */}
                {message.role === "assistant" &&
                  isLast &&
                  (slots.messageActions ? (
                    slots.messageActions({
                      message,
                      onRegenerate,
                      onCopy: () => onCopy?.(part.text),
                    })
                  ) : (
                    <Actions className="mt-2">
                      {onRegenerate && (
                        <Action onClick={onRegenerate} label="Retry">
                          <RefreshCcwIcon className="size-3" />
                        </Action>
                      )}
                      {onCopy && (
                        <Action onClick={() => onCopy(part.text)} label="Copy">
                          <CopyIcon className="size-3" />
                        </Action>
                      )}
                    </Actions>
                  ))}
              </Fragment>
            );

          case "file":
            return (
              <Message
                key={key}
                from={message.role as "user" | "assistant" | "system"}
              >
                <MessageContent>
                  {part.mediaType.startsWith("image/") ? (
                    <div className="max-w-md">
                      <img
                        src={part.url}
                        alt={part.filename || "Attached image"}
                        className="rounded-lg border border-gray-200 dark:border-gray-700"
                      />
                      {part.filename && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {part.filename}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <p className="text-sm">
                        📎 {part.filename || "Attached file"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {part.mediaType}
                      </p>
                    </div>
                  )}
                </MessageContent>
              </Message>
            );

          case "tool":
            // Check for custom tool display slot
            if (slots.toolDisplay) {
              return (
                <Fragment key={key}>
                  {slots.toolDisplay({ tool: part })}
                </Fragment>
              );
            }

            return (
              <Tool key={key} defaultOpen={false}>
                <ToolHeader
                  type={`tool-${part.toolName}`}
                  state={mapToolState(part.state)}
                />
                <ToolContent>
                  <ToolInput input={part.input} />
                  <ToolOutput
                    output={
                      part.output ? (
                        <Response>{formatToolOutput(part.output)}</Response>
                      ) : undefined
                    }
                    errorText={part.errorText}
                  />
                </ToolContent>
              </Tool>
            );

          case "reasoning":
            return (
              <Reasoning
                key={key}
                className="w-full"
                isStreaming={isStreaming && isLast}
              >
                <ReasoningTrigger />
                <ReasoningContent>{part.text}</ReasoningContent>
              </Reasoning>
            );

          case "context":
            return (
              <div
                key={key}
                className={cn(
                  "flex w-full items-end gap-2 py-2",
                  message.role === "user"
                    ? "justify-end"
                    : "flex-row-reverse justify-end",
                )}
              >
                <div className="flex items-center gap-2 max-w-[80%] px-3 py-1.5 text-sm rounded-md bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-colors">
                  <span className="text-primary flex-shrink-0">
                    {getContextIcon(part.contextType)}
                  </span>
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-medium text-foreground truncate">
                      {part.label}
                    </span>
                    {part.metadata?.url && (
                      <span className="text-xs text-muted-foreground truncate">
                        {String(part.metadata.url)}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground bg-background/50 px-1.5 py-0.5 rounded flex-shrink-0">
                    {part.contextType}
                  </span>
                </div>
              </div>
            );

          case "source-url":
            // Already handled above
            return null;

          default:
            return null;
        }
      })}
    </div>
  );
}

/**
 * MessageItem - Renders either custom or default message item
 */
export function MessageItem(props: MessageItemProps) {
  const { components } = useComponentsContext();

  const CustomComponent = components.MessageItem;
  if (CustomComponent) {
    return <CustomComponent {...props} />;
  }

  return <DefaultMessageItem {...props} />;
}
