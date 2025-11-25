import type { ToolResult } from "@aipexstudio/aipex-core";
import type { ComponentType, HTMLAttributes, ReactNode } from "react";

// ============ Chat Status ============

export type ChatStatus =
  | "idle"
  | "submitted"
  | "streaming"
  | "executing_tools"
  | "error";

// ============ UI Message Types ============

export type UIRole = "user" | "assistant" | "tool" | "system";

export interface UITextPart {
  type: "text";
  text: string;
}

export interface UISourceUrlPart {
  type: "source-url";
  url: string;
}

export interface UIReasoningPart {
  type: "reasoning";
  text: string;
}

export interface UIFilePart {
  type: "file";
  mediaType: string;
  filename?: string;
  url: string;
}

export type UIToolState = "pending" | "executing" | "completed" | "error";

export interface UIToolPart {
  type: "tool";
  toolName: string;
  toolCallId: string;
  input: Record<string, unknown>;
  output?: unknown;
  state: UIToolState;
  errorText?: string;
  duration?: number;
}

export interface UIContextPart {
  type: "context";
  contextType: string;
  label: string;
  value: string;
  metadata?: Record<string, unknown>;
}

export type UIPart =
  | UITextPart
  | UISourceUrlPart
  | UIReasoningPart
  | UIFilePart
  | UIToolPart
  | UIContextPart;

export interface UIMessage {
  id: string;
  role: UIRole;
  parts: UIPart[];
  timestamp?: number;
}

// ============ Context Item Types ============

export type ContextItemType =
  | "page"
  | "tab"
  | "bookmark"
  | "clipboard"
  | "screenshot"
  | "custom";

export interface ContextItem {
  id: string;
  type: ContextItemType;
  label: string;
  value: string;
  icon?: ReactNode;
  metadata?: Record<string, unknown>;
}

// ============ Chat Configuration ============

export interface ChatConfig {
  /** System prompt for the agent */
  systemPrompt?: string;
  /** Maximum number of turns before stopping */
  maxTurns?: number;
  /** Temperature for LLM responses */
  temperature?: number;
  /** Maximum tokens for LLM responses */
  maxTokens?: number;
  /** Initial messages to display */
  initialMessages?: UIMessage[];
}

// ============ Component Props Types ============

export interface MessageListProps extends HTMLAttributes<HTMLDivElement> {
  messages: UIMessage[];
  status: ChatStatus;
  onRegenerate?: () => void;
  onCopy?: (text: string) => void;
}

export interface MessageItemProps extends HTMLAttributes<HTMLDivElement> {
  message: UIMessage;
  isLast?: boolean;
  isStreaming?: boolean;
  onRegenerate?: () => void;
  onCopy?: (text: string) => void;
}

export interface InputAreaProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (text: string, files?: File[], contexts?: ContextItem[]) => void;
  onStop?: () => void;
  status: ChatStatus;
  placeholder?: string;
  disabled?: boolean;
}

export interface WelcomeScreenProps extends HTMLAttributes<HTMLDivElement> {
  onSuggestionClick: (text: string) => void;
  suggestions?: WelcomeSuggestion[];
}

export interface WelcomeSuggestion {
  icon?: ComponentType<{ className?: string }>;
  text: string;
  iconColor?: string;
  bgColor?: string;
}

export interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (settings: ChatSettings) => void;
}

export interface ChatSettings {
  aiHost?: string;
  aiToken?: string;
  aiModel?: string;
  language?: string;
  theme?: string;
}

export interface HeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  onSettingsClick?: () => void;
  onNewChat?: () => void;
}

export interface FooterProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

// ============ Slot Props Types ============

export interface MessageActionsSlotProps {
  message: UIMessage;
  onRegenerate?: () => void;
  onCopy?: (text: string) => void;
}

export interface InputToolbarSlotProps {
  status: ChatStatus;
  onStop?: () => void;
  onSubmit?: () => void;
}

export interface ModelSelectorSlotProps {
  value?: string;
  onChange?: (value: string) => void;
  models?: Array<{ name: string; value: string }>;
}

export interface ContextTagsSlotProps {
  contexts: ContextItem[];
  onRemove?: (id: string) => void;
}

export interface ToolDisplaySlotProps {
  tool: UIToolPart;
}

// ============ Slots Configuration ============

export interface ChatbotSlots {
  /** Custom message actions (regenerate, copy, etc.) */
  messageActions?: (props: MessageActionsSlotProps) => ReactNode;
  /** Custom input toolbar */
  inputToolbar?: (props: InputToolbarSlotProps) => ReactNode;
  /** Custom model selector */
  modelSelector?: (props: ModelSelectorSlotProps) => ReactNode;
  /** Custom context tags display */
  contextTags?: (props: ContextTagsSlotProps) => ReactNode;
  /** Custom tool display */
  toolDisplay?: (props: ToolDisplaySlotProps) => ReactNode;
  /** Custom header content */
  headerContent?: () => ReactNode;
  /** Custom footer content */
  footerContent?: () => ReactNode;
  /** Custom empty state / welcome screen */
  emptyState?: (props: WelcomeScreenProps) => ReactNode;
  /** Custom loading indicator */
  loadingIndicator?: () => ReactNode;
}

// ============ Components Configuration ============

export interface ChatbotComponents {
  /** Replace the entire message list */
  MessageList?: ComponentType<MessageListProps>;
  /** Replace individual message items */
  MessageItem?: ComponentType<MessageItemProps>;
  /** Replace the input area */
  InputArea?: ComponentType<InputAreaProps>;
  /** Replace the welcome screen */
  WelcomeScreen?: ComponentType<WelcomeScreenProps>;
  /** Replace the settings dialog */
  SettingsDialog?: ComponentType<SettingsDialogProps>;
  /** Replace the header */
  Header?: ComponentType<HeaderProps>;
  /** Replace the footer */
  Footer?: ComponentType<FooterProps>;
}

// ============ Theme Types ============

export interface ChatbotTheme {
  /** CSS class name for the root container */
  className?: string;
  /** CSS variables for theming */
  variables?: ChatbotThemeVariables;
}

export interface ChatbotThemeVariables {
  /** Primary color */
  "--chatbot-primary"?: string;
  /** Primary foreground color */
  "--chatbot-primary-foreground"?: string;
  /** Secondary color */
  "--chatbot-secondary"?: string;
  /** Secondary foreground color */
  "--chatbot-secondary-foreground"?: string;
  /** Background color */
  "--chatbot-background"?: string;
  /** Foreground color */
  "--chatbot-foreground"?: string;
  /** Muted color */
  "--chatbot-muted"?: string;
  /** Muted foreground color */
  "--chatbot-muted-foreground"?: string;
  /** Border color */
  "--chatbot-border"?: string;
  /** Border radius */
  "--chatbot-radius"?: string;
  /** User message background */
  "--chatbot-user-bg"?: string;
  /** User message text color */
  "--chatbot-user-fg"?: string;
  /** Assistant message background */
  "--chatbot-assistant-bg"?: string;
  /** Assistant message text color */
  "--chatbot-assistant-fg"?: string;
  /** Custom CSS variables */
  [key: `--chatbot-${string}`]: string | undefined;
}

// ============ Event Handlers ============

export interface ChatbotEventHandlers {
  /** Called when a message is sent */
  onMessageSent?: (message: UIMessage) => void;
  /** Called when a response is received */
  onResponseReceived?: (message: UIMessage) => void;
  /** Called when an error occurs */
  onError?: (error: Error) => void;
  /** Called when status changes */
  onStatusChange?: (status: ChatStatus) => void;
  /** Called when a tool is executed */
  onToolExecute?: (toolName: string, input: Record<string, unknown>) => void;
  /** Called when a tool completes */
  onToolComplete?: (toolName: string, result: ToolResult) => void;
}

// ============ useChat Hook Types ============

export interface UseChatOptions {
  /** Chat configuration */
  config?: ChatConfig;
  /** Event handlers */
  handlers?: ChatbotEventHandlers;
}

export interface UseChatReturn {
  /** Current messages */
  messages: UIMessage[];
  /** Current chat status */
  status: ChatStatus;
  /** Current session ID */
  sessionId: string | null;
  /** Send a new message */
  sendMessage: (
    text: string,
    files?: File[],
    contexts?: ContextItem[],
  ) => Promise<void>;
  /** Continue the conversation */
  continueConversation: (text: string) => Promise<void>;
  /** Interrupt current operation */
  interrupt: () => Promise<void>;
  /** Reset the chat */
  reset: () => void;
  /** Regenerate last response */
  regenerate: () => Promise<void>;
  /** Set messages directly */
  setMessages: (messages: UIMessage[]) => void;
}

// ============ Adapter Types ============

export interface ChatAdapterState {
  messages: UIMessage[];
  currentAssistantMessageId: string | null;
  status: ChatStatus;
}

export interface ChatAdapterOptions {
  /** Called when messages are updated */
  onMessagesUpdate?: (messages: UIMessage[]) => void;
  /** Called when status changes */
  onStatusChange?: (status: ChatStatus) => void;
}
