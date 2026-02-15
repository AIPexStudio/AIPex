import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useChat, useChatConfig } from "../../../hooks";
import { useTranslation } from "../../../i18n/context";
import { fetchModelsForSelector } from "../../../lib/models";
import { cn } from "../../../lib/utils";
import type { ChatbotThemeVariables, ContextItem } from "../../../types";
import { DEFAULT_MODELS } from "../constants";
import {
  AgentContext,
  type ChatbotProviderProps,
  ChatContext,
  ComponentsContext,
  ConfigContext,
  ThemeContext,
} from "../context";
import { ConfigurationGuide } from "./configuration-guide";
import { Header } from "./header";
import { InputArea } from "./input-area";
import { MessageList } from "./message-list";
import {
  type UxAuditFormData,
  UxAuditGoalDialog,
} from "./ux-audit-goal-dialog";

/**
 * Convert theme variables to CSS style object
 */
function themeToStyle(
  variables?: ChatbotThemeVariables,
): Record<string, string> {
  if (!variables) return {};

  const style: Record<string, string> = {};
  for (const [key, value] of Object.entries(variables)) {
    if (value !== undefined) {
      style[key] = value;
    }
  }
  return style;
}

/**
 * ChatbotProvider - Provides all contexts for the chatbot
 */
export function ChatbotProvider({
  agent,
  configError,
  config,
  handlers,
  components = {},
  slots = {},
  theme = {},
  className,
  initialSettings,
  storageAdapter,
  children,
}: ChatbotProviderProps) {
  // Initialize hooks
  const chatState = useChat(agent, { config, handlers });
  const configState = useChatConfig({
    initialSettings,
    storageAdapter,
    autoLoad: true,
  });

  // Compute theme values
  const themeStyle = useMemo(
    () => themeToStyle(theme.variables),
    [theme.variables],
  );
  const themeClassName = useMemo(
    () => cn(theme.className, className),
    [theme.className, className],
  );

  // Agent context value
  const agentContextValue = useMemo(
    () => ({
      isReady: Boolean(agent),
      configError,
    }),
    [agent, configError],
  );

  // Context values
  const chatContextValue = useMemo(
    () => ({
      messages: chatState.messages,
      status: chatState.status,
      sessionId: chatState.sessionId,
      metrics: chatState.metrics,
      sendMessage: chatState.sendMessage,
      continueConversation: chatState.continueConversation,
      interrupt: chatState.interrupt,
      reset: chatState.reset,
      regenerate: chatState.regenerate,
      setMessages: chatState.setMessages,
    }),
    [chatState],
  );

  const configContextValue = useMemo(
    () => ({
      settings: configState.settings,
      isLoading: configState.isLoading,
      updateSetting: configState.updateSetting,
      updateSettings: configState.updateSettings,
    }),
    [configState],
  );

  const componentsContextValue = useMemo(
    () => ({ components, slots }),
    [components, slots],
  );

  const themeContextValue = useMemo(
    () => ({
      theme,
      className: themeClassName,
      style: themeStyle,
    }),
    [theme, themeClassName, themeStyle],
  );

  return (
    <ThemeContext.Provider value={themeContextValue}>
      <ComponentsContext.Provider value={componentsContextValue}>
        <ConfigContext.Provider value={configContextValue}>
          <AgentContext.Provider value={agentContextValue}>
            <ChatContext.Provider value={chatContextValue}>
              {children}
            </ChatContext.Provider>
          </AgentContext.Provider>
        </ConfigContext.Provider>
      </ComponentsContext.Provider>
    </ThemeContext.Provider>
  );
}

export interface ChatbotProps extends Omit<ChatbotProviderProps, "children"> {
  /** Available models for selection */
  models?: Array<{ name: string; value: string }>;
  /** Placeholder texts for typing animation */
  placeholderTexts?: string[];
  /** Header title */
  title?: string;
  /** Initial input value to pre-fill the text area */
  initialInput?: string;
}

/**
 * Chatbot - Complete chatbot UI component
 *
 * This is the main component that combines all chatbot parts.
 * It can be customized via components, slots, and theme props.
 *
 * @example
 * ```tsx
 * const agent = AIPex.create({ model, tools });
 *
 * // Basic usage
 * <Chatbot agent={agent} />
 *
 * // With customization
 * <Chatbot
 *   agent={agent}
 *   components={{ Header: MyCustomHeader }}
 *   slots={{ messageActions: (props) => <MyActions {...props} /> }}
 *   theme={{ className: "my-chatbot" }}
 * />
 * ```
 */
export function Chatbot({
  agent,
  configError,
  config,
  handlers,
  components,
  slots,
  theme,
  className,
  initialSettings,
  storageAdapter,
  models = DEFAULT_MODELS,
  placeholderTexts,
  title = "AIPex",
  initialInput,
}: ChatbotProps) {
  return (
    <ChatbotProvider
      agent={agent}
      configError={configError}
      config={config}
      handlers={handlers}
      components={components}
      slots={slots}
      theme={theme}
      className={className}
      initialSettings={initialSettings}
      storageAdapter={storageAdapter}
    >
      <ChatbotContent
        models={models}
        placeholderTexts={placeholderTexts}
        title={title}
        initialInput={initialInput}
      />
    </ChatbotProvider>
  );
}

/**
 * Internal component that uses the contexts
 */
function ChatbotContent({
  models,
  placeholderTexts,
  title,
  initialInput: initialInputProp,
}: {
  models: Array<{ name: string; value: string }>;
  placeholderTexts?: string[];
  title: string;
  initialInput?: string;
}) {
  const themeCtx = useContext(ThemeContext);
  const chatCtx = useContext(ChatContext);
  const agentCtx = useContext(AgentContext);

  const { className, style } = themeCtx;
  const { messages, status, sendMessage, interrupt, reset, regenerate } =
    chatCtx || {};
  const { isReady: isAgentReady } = agentCtx || {};

  const { t } = useTranslation();
  const [input, setInput] = useState(initialInputProp ?? "");
  const [inputResetCount, setInputResetCount] = useState(0);
  const [isUxAuditDialogOpen, setIsUxAuditDialogOpen] = useState(false);

  // Fetch server model list on mount, fall back to prop-provided models
  const [fetchedModels, setFetchedModels] = useState<
    Array<{ name: string; value: string }> | null
  >(null);
  useEffect(() => {
    let cancelled = false;
    fetchModelsForSelector()
      .then((serverModels) => {
        if (!cancelled && serverModels.length > 0) {
          setFetchedModels(serverModels);
        }
      })
      .catch(() => {
        // Fallback to prop-provided models — already used below
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const effectiveModels = fetchedModels ?? models;

  const handleSubmit = useCallback(
    (text: string, files?: File[], contexts?: ContextItem[]) => {
      void sendMessage?.(text, files, contexts);
      setInput("");
    },
    [sendMessage],
  );

  const handleSuggestion = useCallback(
    (text: string) => {
      void sendMessage?.(text);
    },
    [sendMessage],
  );

  const handleUxAuditClick = useCallback(() => {
    setIsUxAuditDialogOpen(true);
  }, []);

  const handleUxAuditSubmit = useCallback(
    (formData: UxAuditFormData) => {
      const platformDisplay = t(`uxAuditGoal.platform.${formData.platform}`);
      const targetUsersLine = formData.targetUsers
        ? `\n**Target Users:** ${formData.targetUsers}`
        : "";

      const messageText = t("uxAuditGoal.messageTemplate")
        .replace("{{url}}", formData.targetLink)
        .replace("{{platform}}", platformDisplay)
        .replace("{{jtbd}}", formData.jtbd)
        .replace("{{targetUsersLine}}", targetUsersLine);

      void sendMessage?.(messageText);
    },
    [t, sendMessage],
  );

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  const handleNewChat = useCallback(() => {
    reset?.();
    setInput("");
    setInputResetCount((count) => count + 1);
  }, [reset]);

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-lg border bg-background",
        className,
      )}
      style={style}
    >
      {/* Header */}
      <Header title={title} onNewChat={handleNewChat} />

      {/* Show configuration guide when agent is not ready */}
      {!isAgentReady ? (
        <ConfigurationGuide className="flex-1" />
      ) : (
        <>
          {/* Message List */}
          <MessageList
            messages={messages || []}
            status={status || "idle"}
            onRegenerate={regenerate}
            onCopy={handleCopy}
            onSuggestionClick={handleSuggestion}
            onUxAuditClick={handleUxAuditClick}
          />

          {/* Input Area */}
          <InputArea
            key={inputResetCount}
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            onStop={interrupt}
            status={status || "idle"}
            models={effectiveModels}
            placeholderTexts={placeholderTexts}
          />
        </>
      )}

      {/* UX Audit Goal Dialog */}
      <UxAuditGoalDialog
        open={isUxAuditDialogOpen}
        onOpenChange={setIsUxAuditDialogOpen}
        onSubmit={handleUxAuditSubmit}
      />
    </div>
  );
}
