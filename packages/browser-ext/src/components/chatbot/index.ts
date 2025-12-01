// Main component exports

// Re-export from top-level modules
export { ChatAdapter, createChatAdapter } from "../../adapters/chat-adapter";
export {
  chromeStorageAdapter,
  type UseChatConfigOptions,
  type UseChatConfigReturn,
  type UseChatOptions,
  type UseChatReturn,
  useChat,
  useChatConfig,
} from "../../hooks";
export type {
  ChatbotComponents,
  ChatbotEventHandlers,
  ChatbotSlots,
  ChatbotTheme,
  ChatbotThemeVariables,
  ChatConfig,
  ChatSettings,
  ChatStatus,
  ContextItem,
  ContextItemType,
  ContextTagsSlotProps,
  FooterProps,
  HeaderProps,
  InputAreaProps,
  InputToolbarSlotProps,
  MessageActionsSlotProps,
  MessageItemProps,
  MessageListProps,
  ModelSelectorSlotProps,
  SettingsDialogProps,
  StorageAdapter,
  ToolDisplaySlotProps,
  UIContextPart,
  UIFilePart,
  UIMessage,
  UIPart,
  UIReasoningPart,
  UIRole,
  UISourceUrlPart,
  UITextPart,
  UIToolPart,
  UIToolState,
  WelcomeScreenProps,
  WelcomeSuggestion,
} from "../../types";
// Individual component exports
export {
  DefaultHeader,
  DefaultInputArea,
  DefaultMessageItem,
  DefaultMessageList,
  DefaultSettingsDialog,
  DefaultWelcomeScreen,
  type ExtendedInputAreaProps,
  type ExtendedSettingsDialogProps,
  Header,
  InputArea,
  MessageItem,
  MessageList,
  SettingsDialog,
  WelcomeScreen,
} from "./components";
// Default export for backward compatibility
export {
  Chatbot,
  Chatbot as default,
  type ChatbotProps,
  ChatbotProvider,
} from "./components/chatbot";
// Slot component exports
export {
  CompactContextTags,
  CompactModelSelector,
  CompactToolDisplay,
  ContextTag,
  DefaultContextTags,
  DefaultInputToolbar,
  DefaultMessageActions,
  DefaultModelSelector,
  DefaultToolDisplay,
  InputToolbarWithLabel,
  MessageActionsWithFeedback,
  MinimalToolDisplay,
} from "./components/slots";
// Re-export constants for backwards compatibility
export { models, SYSTEM_PROMPT } from "./constants";
// Context exports
export {
  type ChatbotProviderProps,
  ChatContext,
  type ChatContextValue,
  ComponentsContext,
  type ComponentsContextValue,
  ConfigContext,
  type ConfigContextValue,
  ThemeContext,
  type ThemeContextValue,
  useChatContext,
  useComponentsContext,
  useConfigContext,
  useThemeContext,
} from "./core/context";
// Theme exports
export {
  colorfulTheme,
  createTheme,
  darkTheme,
  darkThemeVariables,
  defaultTheme,
  defaultThemeVariables,
  mergeThemes,
  minimalTheme,
} from "./themes";
