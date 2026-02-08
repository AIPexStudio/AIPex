import type {
  AgentMetrics,
  AIPex,
  AppSettings,
  KeyValueStorage,
} from "@aipexstudio/aipex-core";
import { createContext, type ReactNode, useContext } from "react";
import type {
  ChatbotComponents,
  ChatbotEventHandlers,
  ChatbotSlots,
  ChatbotTheme,
  ChatConfig,
  ChatStatus,
  ContextItem,
  UIMessage,
} from "../../types";

// ============ Chat Context ============

export interface ChatContextValue {
  /** Current messages */
  messages: UIMessage[];
  /** Current status */
  status: ChatStatus;
  /** Current session ID */
  sessionId: string | null;
  /** Latest token metrics from most recent execution */
  metrics: AgentMetrics | null;
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
  settings: AppSettings;
  /** Whether settings are loading */
  isLoading: boolean;
  /** Update a setting */
  updateSetting: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => Promise<void>;
  /** Update multiple settings */
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
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

// ============ Chatbot Style Context ============

export interface ChatbotStyleContextValue {
  /** Theme configuration */
  theme: ChatbotTheme;
  /** Root className */
  className: string;
  /** CSS variables style object */
  style: Record<string, string>;
}

/**
 * @deprecated Use ChatbotStyleContextValue instead
 */
export type ThemeContextValue = ChatbotStyleContextValue;

const ChatbotStyleContext = createContext<ChatbotStyleContextValue>({
  theme: {},
  className: "",
  style: {},
});

/**
 * @deprecated Use useChatbotStyleContext instead
 */
export const ThemeContext = ChatbotStyleContext;

/**
 * Hook to access chatbot style/theme configuration
 */
export function useChatbotStyleContext(): ChatbotStyleContextValue {
  return useContext(ChatbotStyleContext);
}

/**
 * @deprecated Use useChatbotStyleContext instead
 */
export function useThemeContext(): ChatbotStyleContextValue {
  return useChatbotStyleContext();
}

// ============ Agent Context ============

export interface AgentContextValue {
  /** Whether the agent is configured and ready */
  isReady: boolean;
  /** Configuration error if agent creation failed */
  configError?: Error;
}

const AgentContext = createContext<AgentContextValue>({
  isReady: false,
  configError: undefined,
});

/**
 * Hook to access agent state
 */
export function useAgentContext(): AgentContextValue {
  return useContext(AgentContext);
}

export { AgentContext };

// ============ Provider Props ============

export interface ChatbotProviderProps {
  /** The AIPex instance from @aipexstudio/aipex-core (undefined when not configured) */
  agent: AIPex | undefined;
  /** Configuration error message */
  configError?: Error;
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
  initialSettings?: Partial<AppSettings>;
  /** Storage adapter for persisting settings (defaults to localStorage) */
  storageAdapter?: KeyValueStorage<unknown>;
  /** Children */
  children: ReactNode;
}
