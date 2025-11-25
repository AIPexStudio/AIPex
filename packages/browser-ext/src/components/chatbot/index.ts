// Main component exports

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
export {
  Chatbot,
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
// Core exports
export {
  // Adapter
  ChatAdapter,
  type ChatbotComponents,
  type ChatbotEventHandlers,
  type ChatbotProviderProps,
  type ChatbotSlots,
  type ChatbotTheme,
  type ChatbotThemeVariables,
  type ChatConfig,
  // Context
  ChatContext,
  type ChatContextValue,
  type ChatSettings,
  // Types
  type ChatStatus,
  ComponentsContext,
  type ComponentsContextValue,
  ConfigContext,
  type ConfigContextValue,
  type ContextItem,
  type ContextItemType,
  type ContextTagsSlotProps,
  chromeStorageAdapter,
  createChatAdapter,
  type FooterProps,
  type HeaderProps,
  type InputAreaProps,
  type InputToolbarSlotProps,
  type MessageActionsSlotProps,
  type MessageItemProps,
  type MessageListProps,
  type ModelSelectorSlotProps,
  type SettingsDialogProps,
  type StorageAdapter,
  ThemeContext,
  type ThemeContextValue,
  type ToolDisplaySlotProps,
  type UIContextPart,
  type UIFilePart,
  type UIMessage,
  type UIPart,
  type UIReasoningPart,
  type UIRole,
  type UISourceUrlPart,
  type UITextPart,
  type UIToolPart,
  type UIToolState,
  type UseChatConfigOptions,
  type UseChatConfigReturn,
  type UseChatOptions,
  type UseChatReturn,
  // Hooks
  useChat,
  useChatConfig,
  useChatContext,
  useComponentsContext,
  useConfigContext,
  useThemeContext,
  type WelcomeScreenProps,
  type WelcomeSuggestion,
} from "./core";
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
