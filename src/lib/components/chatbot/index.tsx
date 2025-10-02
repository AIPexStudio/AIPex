import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Loader } from "@/components/ai-elements/loader";
import { Message, MessageAvatar, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Response } from "@/components/ai-elements/response";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useMount } from "ahooks";
import type { ChatStatus } from "ai";
import { ClockIcon, CopyIcon, PlusIcon, RefreshCcwIcon, SettingsIcon } from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { models } from "./constants";
import { MessageHandler, type MessageHandlerConfig } from "./message-handler";
import type { UIMessage } from "./types";
import { Action, Actions } from "@/components/ai-elements/actions";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Source, Sources, SourcesContent, SourcesTrigger } from "@/components/ai-elements/sources";
import { useStorage } from "~/lib/storage";
import { getAllTools } from "~/lib/services/tool-registry";

const ChatBot = () => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [status, setStatus] = useState<"idle" | "submitted" | "streaming" | "error">("idle");
  const [messageQueue, setMessageQueue] = useState<UIMessage[]>([]);
  const messageHandlerRef = useRef<MessageHandler | null>(null);

  const [aiHost] = useStorage("aiHost", import.meta.env.VITE_AI_HOST || "https://api.openai.com/v1/chat/completions");
  const [aiToken] = useStorage("aiToken", import.meta.env.VITE_AI_TOKEN);
  const [aiModel, setAiModel] = useStorage("aiModel", import.meta.env.VITE_AI_MODEL);
 

  // Track cleanup functions outside of the handler
  const unsubscribeFunctionsRef = useRef<(() => void)[]>([]);

  // Initialize message handler and subscribe to events
  useEffect(() => {
    if (!messageHandlerRef.current) {
      // Create new handler only if it doesn't exist
      const config: MessageHandlerConfig = {
        initialModel: aiModel,
        initialTools: getAllTools().map((tool) => ({
          type: "function",
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema,
          },
        })),
        initialAiHost: aiHost,
        initialAiToken: aiToken,
      };

      messageHandlerRef.current = new MessageHandler(config);

      const unsubscribeMessages = messageHandlerRef.current.subscribe(
        "messages_updated",
        (newMessages) => {
          setMessages(newMessages);
        }
      );
      const unsubscribeStatus = messageHandlerRef.current.subscribe(
        "status_changed",
        (newStatus) => {
          setStatus(newStatus);
        }
      );
      const unsubscribeQueue = messageHandlerRef.current.subscribe("queue_changed", (newQueue) => {
        setMessageQueue(newQueue);
      });

      // Store cleanup functions
      unsubscribeFunctionsRef.current = [unsubscribeMessages, unsubscribeStatus, unsubscribeQueue];

      // Set initial state from handler
      setMessages(messageHandlerRef.current.getMessages());
      setStatus(messageHandlerRef.current.getStatus());
      setMessageQueue(messageHandlerRef.current.getQueue());
    } else {
      // Update existing handler configuration instead of recreating
      messageHandlerRef.current.updateConfig({
        initialModel: aiModel,
      });
    }

    return () => {
      // Cleanup only when component unmounts
      unsubscribeFunctionsRef.current.forEach((fn) => fn());
      unsubscribeFunctionsRef.current = [];
      if (messageHandlerRef.current) {
        messageHandlerRef.current.destroy();
        messageHandlerRef.current = null;
      }
    };
  }, [aiModel]);

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    messageHandlerRef.current?.sendMessage(message.text || "Sent with attachments");
    setInput("");
  };

  const handleRegenerate = () => {
    messageHandlerRef.current?.regenerate();
  };

  const handleStop = () => {
    messageHandlerRef.current?.stopStream();
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleNewChat = () => {
    if (messageHandlerRef.current) {
      messageHandlerRef.current.abort();
    }
    setMessages([]);
    setInput("");
  };

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-lg border bg-background"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="text-sm font-medium">ZCP Assistant</div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Conversation className="h-full">
          <ConversationContent>
            {messages.map((message, messageIndex) => (
              <div key={message.id}>
                {message.role === "assistant" &&
                  message.parts.filter((part) => part.type === "source-url").length > 0 && (
                    <Sources>
                      <SourcesTrigger
                        count={message.parts.filter((part) => part.type === "source-url").length}
                      />
                      {message.parts
                        .filter((part) => part.type === "source-url")
                        .map((part, i) => (
                          <SourcesContent key={`${message.id}-${i}`}>
                            <Source key={`${message.id}-${i}`} href={part.url} title={part.url} />
                          </SourcesContent>
                        ))}
                    </Sources>
                  )}
                {message.parts.map((part, i) => {
                  switch (part.type) {
                    case "text":
                      const isLastMessage = messageIndex === messages.length - 1;
                      return (
                        <Fragment key={`${message.id}-${i}`}>
                          <Message from={message.role as "user" | "assistant" | "system"}>
                            <MessageContent>
                              <Response>{part.text}</Response>
                            </MessageContent>
                          </Message>
                          {message.role === "assistant" && isLastMessage && (
                            <Actions className="mt-2">
                              <Action onClick={() => handleRegenerate()} label="Retry">
                                <RefreshCcwIcon className="size-3" />
                              </Action>
                              <Action onClick={() => handleCopy(part.text)} label="Copy">
                                <CopyIcon className="size-3" />
                              </Action>
                            </Actions>
                          )}
                        </Fragment>
                      );
                    case "tool":
                      return (
                        <Tool key={`${message.id}-${i}`} defaultOpen={false}>
                          <ToolHeader type={`tool-${part.toolName}`} state={part.state} />
                          <ToolContent>
                            <ToolInput input={part.input} />
                            <ToolOutput
                              output={
                                part.output ? (
                                  <Response>
                                    {part.output}
                                  </Response>
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
                          key={`${message.id}-${i}`}
                          className="w-full"
                          isStreaming={
                            status === "streaming" &&
                            i === message.parts.length - 1 &&
                            message.id === messages.at(-1)?.id
                          }
                        >
                          <ReasoningTrigger />
                          <ReasoningContent>{part.text}</ReasoningContent>
                        </Reasoning>
                      );
                    default:
                      return null;
                  }
                })}
              </div>
            ))}
            {status === "submitted" && <Loader />}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>

      <div className="border-t p-4">
        <PromptInput onSubmit={handleSubmit} className="mt-4" globalDrop multiple>
          <PromptInputBody>
            <PromptInputAttachments>
              {(attachment) => <PromptInputAttachment data={attachment} />}
            </PromptInputAttachments>
            <PromptInputTextarea onChange={(e) => setInput(e.target.value)} value={input} />
            {/* Queue indicator */}
            {messageQueue.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-muted/50 rounded-md mt-2">
                <ClockIcon className="size-4" />
                <span>
                  {messageQueue.length} message{messageQueue.length > 1 ? "s" : ""} queued
                </span>
              </div>
            )}
          </PromptInputBody>
          <PromptInputToolbar>
            <PromptInputTools>
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger />
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
              <PromptInputModelSelect
                onValueChange={(value) => {
                  setAiModel(value);
                }}
                value={aiModel}
              >
                <PromptInputModelSelectTrigger>
                  <PromptInputModelSelectValue />
                </PromptInputModelSelectTrigger>
                <PromptInputModelSelectContent>
                  {models.map((model) => (
                    <PromptInputModelSelectItem key={model.value} value={model.value}>
                      {model.name}
                    </PromptInputModelSelectItem>
                  ))}
                </PromptInputModelSelectContent>
              </PromptInputModelSelect>
            </PromptInputTools>
            {(() => {
              const submitStatus: ChatStatus | undefined =
                status === "idle" ? undefined : (status as ChatStatus);
              return (
                <PromptInputSubmit
                  disabled={!input && !submitStatus}
                  status={submitStatus}
                  onClick={status === "streaming" ? handleStop : undefined}
                />
              );
            })()}
          </PromptInputToolbar>
        </PromptInput>
      </div>
    </div>
  );
};

export default ChatBot;
