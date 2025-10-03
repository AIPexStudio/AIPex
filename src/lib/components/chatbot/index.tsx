import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Loader } from "@/components/ai-elements/loader";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputContextTag,
  PromptInputContextTags,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
  usePromptInputContexts,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ChatStatus } from "ai";
import { ClockIcon, CopyIcon, RefreshCcwIcon, SettingsIcon, PlusIcon } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import { models, SYSTEM_PROMPT } from "./constants";
import { MessageHandler, type MessageHandlerConfig } from "./message-handler";
import type { UIMessage } from "./types";
import { Action, Actions } from "@/components/ai-elements/actions";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/components/ai-elements/reasoning";
import { Source, Sources, SourcesContent, SourcesTrigger } from "@/components/ai-elements/sources";
import { useStorage } from "~/lib/storage";
import { getAllTools } from "~/lib/services/tool-registry";
import { useTranslation, useLanguageChanger } from "~/lib/i18n/hooks";
import type { Language } from "~/lib/i18n/types";
import { getAllAvailableContexts } from "~/lib/context-providers";

const formatToolOutput = (output: any) => {
  return `
  \`\`\`${typeof output === "string" ? "text" : "json"}
  ${typeof output === "string" ? output : JSON.stringify(output, null, 2)}
  \`\`\`
  `;
};

const ChatBot = () => {
  const { t, language } = useTranslation()
  const changeLanguage = useLanguageChanger()
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [status, setStatus] = useState<"idle" | "submitted" | "streaming" | "error">("idle");
  const [messageQueue, setMessageQueue] = useState<UIMessage[]>([]);
  const messageHandlerRef = useRef<MessageHandler | null>(null);

  const [aiHost, setAiHost] = useStorage("aiHost", import.meta.env.VITE_AI_HOST || "https://api.openai.com/v1/chat/completions");
  const [aiToken, setAiToken] = useStorage("aiToken", import.meta.env.VITE_AI_TOKEN);
  const [aiModel, setAiModel] = useStorage("aiModel", import.meta.env.VITE_AI_MODEL);

  // Settings dialog state
  const [showSettings, setShowSettings] = useState(false);
  const [tempAiHost, setTempAiHost] = useState("");
  const [tempAiToken, setTempAiToken] = useState("");
  const [tempAiModel, setTempAiModel] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const placeholderList = [
    t("input.placeholder1"),
    t("input.placeholder2"),
    t("input.placeholder3")
  ];
 

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
        initialMessages: [{ role: "system", id: "system", parts: [{ type: "text", text: SYSTEM_PROMPT }] }],
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
    const hasContexts = Boolean(message.contexts?.length);

    if (!(hasText || hasAttachments || hasContexts)) {
      return;
    }

    // Build message with contexts
    let fullMessage = "";
    
    // Add contexts if present
    if (hasContexts && message.contexts) {
      fullMessage += "Context:\n";
      message.contexts.forEach((ctx) => {
        fullMessage += `\n[${ctx.type}] ${ctx.label}:\n${ctx.value}\n`;
      });
      fullMessage += "\n---\n\n";
    }
    
    // Add user text
    fullMessage += message.text || "";
    
    // Handle attachments (TODO: integrate with message)
    if (hasAttachments) {
      fullMessage += "\n\n(Includes attachments)";
    }

    messageHandlerRef.current?.sendMessage(fullMessage);
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

  const handleOpenSettings = () => {
    setTempAiHost(aiHost || "");
    setTempAiToken(aiToken || "");
    setTempAiModel(aiModel || "");
    setShowSettings(true);
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      setAiHost(tempAiHost);
      setAiToken(tempAiToken);
      setAiModel(tempAiModel);
      setShowSettings(false);
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-lg border bg-background"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleOpenSettings}
          className="gap-2"
        >
          <SettingsIcon className="size-4" />
          {t("common.settings")}
        </Button>
        <div className="text-sm font-medium">{t("common.title")}</div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNewChat}
          className="gap-2"
        >
          <PlusIcon className="size-4" />
          {t("common.newChat")}
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        <Conversation className="h-full">
          <ConversationContent>
            {messages.filter((message) => message.role !== "system").map((message, messageIndex) => (
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
                                    {formatToolOutput(part.output)}
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
                            message.id === messages[messages.length - 1]?.id
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
            {/* Context Tags */}
            <PromptInputContextTags>
              {(context) => <PromptInputContextTag data={context} />}
            </PromptInputContextTags>
            
            <PromptInputAttachments>
              {(attachment) => <PromptInputAttachment data={attachment} />}
            </PromptInputAttachments>
            
            <ContextLoader />
            
            <PromptInputTextarea 
              placeholder={t("input.newLine")} 
              enableTypingAnimation={true} 
              placeholderTexts={placeholderList} 
              onChange={(e) => setInput(e.target.value)} 
              value={input} 
            />
            
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

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t("settings.title")}</DialogTitle>
            <DialogDescription>{t("settings.subtitle")}</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Language Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("settings.language")}</label>
              <Select value={language} onValueChange={(value) => changeLanguage(value as Language)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t("language.en")}</SelectItem>
                  <SelectItem value="zh">{t("language.zh")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* AI Host */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("settings.aiHost")}</label>
              <Input
                value={tempAiHost}
                onChange={(e) => setTempAiHost(e.target.value)}
                placeholder={t("settings.hostPlaceholder")}
              />
            </div>

            {/* AI Token */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("settings.aiToken")}</label>
              <Input
                type="password"
                value={tempAiToken}
                onChange={(e) => setTempAiToken(e.target.value)}
                placeholder={t("settings.tokenPlaceholder")}
              />
            </div>

            {/* AI Model */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("settings.aiModel")}</label>
              <Input
                value={tempAiModel}
                onChange={(e) => setTempAiModel(e.target.value)}
                placeholder={t("settings.modelPlaceholder")}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSettings(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSaveSettings}
              disabled={isSaving}
            >
              {isSaving ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Helper component to load available contexts
function ContextLoader() {
  const contexts = usePromptInputContexts();
  
  useEffect(() => {
    // Load available contexts on mount
    getAllAvailableContexts().then((available) => {
      contexts.setAvailableContexts(available);
    }).catch((error) => {
      console.error("Failed to load contexts:", error);
    });
  }, []);
  
  return null;
}

export default ChatBot;
