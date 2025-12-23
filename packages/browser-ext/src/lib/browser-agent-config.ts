/**
 * Browser-specific agent configuration helpers
 * Provides default configuration for browser extension use cases
 */

import type { AppSettings } from "@aipexstudio/aipex-core";
import { aisdk, SessionStorage } from "@aipexstudio/aipex-core";
import { createAIProvider } from "@aipexstudio/aipex-react";
import { SYSTEM_PROMPT } from "@aipexstudio/aipex-react/components/chatbot/constants";
import {
  allBrowserProviders,
  allBrowserTools,
  IndexedDBStorage,
} from "@aipexstudio/browser-runtime";
import { useCallback, useMemo } from "react";

/**
 * Create browser-specific storage instance
 */
export function useBrowserStorage() {
  return useMemo(
    () =>
      new SessionStorage(
        new IndexedDBStorage({
          dbName: "aipex-sessions",
          storeName: "sessions",
        }),
      ),
    [],
  );
}

/**
 * Create browser-specific model factory
 */
export function useBrowserModelFactory() {
  return useCallback((settings: AppSettings) => {
    const provider = createAIProvider(settings);
    return aisdk(provider(settings.aiModel!));
  }, []);
}

/**
 * Get browser-specific context providers
 */
export function useBrowserContextProviders() {
  return useMemo(() => allBrowserProviders, []);
}

/**
 * Get browser-specific tools
 */
export function useBrowserTools() {
  return useMemo(() => allBrowserTools, []);
}

/**
 * Browser-specific agent configuration
 */
export const BROWSER_AGENT_CONFIG = {
  instructions: SYSTEM_PROMPT,
  name: "AIPex Browser Assistant",
  maxTurns: 10,
} as const;
