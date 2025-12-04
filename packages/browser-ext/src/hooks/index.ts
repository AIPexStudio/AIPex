// Extension-specific hooks

// Re-export commonly used hooks from other packages
export {
  type ChatbotEventHandlers,
  type Theme,
  type UseChatConfigOptions,
  type UseChatConfigReturn,
  type UseChatOptions,
  type UseChatReturn,
  useChat,
  useChatConfig,
  useTheme,
} from "@aipexstudio/aipex-react";
// Import chromeStorageAdapter from browser-runtime (browser-specific implementation)
export {
  ChromeStorageAdapter,
  chromeStorageAdapter,
  useStorage,
} from "@aipexstudio/browser-runtime";
export {
  type UseAgentOptions,
  type UseAgentReturn,
  useAgent,
} from "./use-agent.js";
export { useTabsSync } from "./use-tabs-sync.js";
