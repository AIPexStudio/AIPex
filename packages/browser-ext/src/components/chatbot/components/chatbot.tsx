import { useCallback, useContext, useMemo, useState } from "react";
import { chromeStorageAdapter, useChat, useChatConfig } from "~/hooks";
import { cn } from "~/lib/utils";
import type { ChatbotThemeVariables, ContextItem } from "~/types";
import { DEFAULT_MODELS } from "../constants";
import {
  type ChatbotProviderProps,
  ChatContext,
  ComponentsContext,
  ConfigContext,
  ThemeContext,
} from "../core/context";
import { Header } from "./header";
import { InputArea } from "./input-area";
import { MessageList } from "./message-list";
import { SettingsDialog } from "./settings-dialog";

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
  config,
  handlers,
  components = {},
  slots = {},
  theme = {},
  className,
  initialSettings,
  children,
}: ChatbotProviderProps) {
  // Initialize hooks
  const chatState = useChat(agent, { config, handlers });
  const configState = useChatConfig({
    initialSettings,
    storageAdapter: chromeStorageAdapter,
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

  // Context values
  const chatContextValue = useMemo(
    () => ({
      messages: chatState.messages,
      status: chatState.status,
      sessionId: chatState.sessionId,
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
          <ChatContext.Provider value={chatContextValue}>
            {children}
          </ChatContext.Provider>
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
  config,
  handlers,
  components,
  slots,
  theme,
  className,
  initialSettings,
  models = DEFAULT_MODELS,
  placeholderTexts,
  title = "AIPex",
}: ChatbotProps) {
  return (
    <ChatbotProvider
      agent={agent}
      config={config}
      handlers={handlers}
      components={components}
      slots={slots}
      theme={theme}
      className={className}
      initialSettings={initialSettings}
    >
      <ChatbotContent
        models={models}
        placeholderTexts={placeholderTexts}
        title={title}
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
}: {
  models: Array<{ name: string; value: string }>;
  placeholderTexts?: string[];
  title: string;
}) {
  const themeCtx = useContext(ThemeContext);
  const chatCtx = useContext(ChatContext);

  const { className, style } = themeCtx;
  const { messages, status, sendMessage, interrupt, reset, regenerate } =
    chatCtx;

  const [input, setInput] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const handleSubmit = useCallback(
    (text: string, files?: File[], contexts?: ContextItem[]) => {
      void sendMessage(text, files, contexts);
      setInput("");
    },
    [sendMessage],
  );

  const handleSuggestion = useCallback(
    (text: string) => {
      void sendMessage(text);
    },
    [sendMessage],
  );

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  const handleNewChat = useCallback(() => {
    reset();
    setInput("");
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
      <Header
        title={title}
        onSettingsClick={() => setShowSettings(true)}
        onNewChat={handleNewChat}
      />

      {/* Message List */}
      <MessageList
        messages={messages}
        status={status}
        onRegenerate={regenerate}
        onCopy={handleCopy}
        onSuggestionClick={handleSuggestion}
      />

      {/* Input Area */}
      <InputArea
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        onStop={interrupt}
        status={status}
        models={models}
        placeholderTexts={placeholderTexts}
      />

      {/* Settings Dialog */}
      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
    </div>
  );
}
