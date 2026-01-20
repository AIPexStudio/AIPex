/**
 * Non-React utilities and storage adapters
 * Safe to import from any context (background, content, React components)
 */

// Re-export types only (no runtime React dependency)
export type {
  ChatbotEventHandlers,
  Theme,
  UseAgentOptions,
  UseAgentReturn,
  UseChatConfigOptions,
  UseChatConfigReturn,
  UseChatOptions,
  UseChatReturn,
} from "@aipexstudio/aipex-react";
// Re-export storage adapter (no React dependency)
export {
  ChromeStorageAdapter,
  chromeStorageAdapter,
} from "@aipexstudio/browser-runtime";

/**
 * React hooks should be imported directly from their sources:
 * - useAgent, useChat, useChatConfig, useTheme from "@aipexstudio/aipex-react"
 * - useStorage from "@aipexstudio/browser-runtime/hooks"
 * - useTabsSync from "./use-tabs-sync.js"
 */
