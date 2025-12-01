import type { AIPex } from "@aipexstudio/aipex-core";
import { createContext, type ReactNode, useContext } from "react";
import type {
  ChatbotComponents,
  ChatbotEventHandlers,
  ChatbotSlots,
  ChatbotTheme,
  ChatConfig,
  ChatSettings,
  ChatStatus,
  ContextItem,
  UIMessage,
} from "../../../types";

// ============ Chat Context ============

export interface ChatContextValue {
  /** Current messages */
  messages: UIMessage[];
  /** Current status */
  status: ChatStatus;
  /** Current session ID */
  sessionId: string | null;
  /** Send a message */
  sendMessage: (
    text: string,
    files?: File[],
    contexts?: ContextItem[],
  ) => Promise<void>;
  /** Continue conversation */
  continueConversation: (text: string) => Promise<void>;
  /** Interrupt current operation */
  interrupt: () => Promise<void>;
  /** Reset chat */
  reset: () => void;
  /** Regenerate last response */
  regenerate: () => Promise<void>;
  /** Set messages directly */
  setMessages: (messages: UIMessage[]) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

/**
 * Hook to access chat state and actions
 */
export function useChatContext(): ChatContextValue {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within a ChatbotProvider");
  }
  return context;
}

export { ChatContext };

// ============ Config Context ============

export interface ConfigContextValue {
  /** Current settings */
  settings: ChatSettings;
  /** Whether settings are loading */
  isLoading: boolean;
  /** Update a setting */
  updateSetting: <K extends keyof ChatSettings>(
    key: K,
    value: ChatSettings[K],
  ) => Promise<void>;
  /** Update multiple settings */
  updateSettings: (updates: Partial<ChatSettings>) => Promise<void>;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

/**
 * Hook to access chat configuration
 */
export function useConfigContext(): ConfigContextValue {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error("useConfigContext must be used within a ChatbotProvider");
  }
  return context;
}

export { ConfigContext };

// ============ Components Context ============

export interface ComponentsContextValue {
  /** Custom components */
  components: ChatbotComponents;
  /** Custom slots */
  slots: ChatbotSlots;
}

const ComponentsContext = createContext<ComponentsContextValue>({
  components: {},
  slots: {},
});

/**
 * Hook to access custom components
 */
export function useComponentsContext(): ComponentsContextValue {
  return useContext(ComponentsContext);
}

export { ComponentsContext };

// ============ Theme Context ============

export interface ThemeContextValue {
  /** Theme configuration */
  theme: ChatbotTheme;
  /** Root className */
  className: string;
  /** CSS variables style object */
  style: Record<string, string>;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: {},
  className: "",
  style: {},
});

/**
 * Hook to access theme configuration
 */
export function useThemeContext(): ThemeContextValue {
  return useContext(ThemeContext);
}

export { ThemeContext };

// ============ Provider Props ============

export interface ChatbotProviderProps {
  /** The AIPex instance from @aipexstudio/aipex-core */
  agent: AIPex;
  /** Chat configuration */
  config?: ChatConfig;
  /** Event handlers */
  handlers?: ChatbotEventHandlers;
  /** Custom component overrides */
  components?: ChatbotComponents;
  /** Custom slot overrides */
  slots?: ChatbotSlots;
  /** Theme configuration */
  theme?: ChatbotTheme;
  /** Additional CSS class name */
  className?: string;
  /** Initial settings */
  initialSettings?: Partial<ChatSettings>;
  /** Children */
  children: ReactNode;
}
