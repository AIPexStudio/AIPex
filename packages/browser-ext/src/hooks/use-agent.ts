/**
 * Browser-specific useAgent wrapper
 *
 * This wraps the generic useAgent hook from aipex-react with browser-specific
 * configuration (browser tools, context providers, storage).
 */

import { aisdk, SessionStorage } from "@aipexstudio/aipex-core";
import {
  createAIProvider,
  type UseAgentReturn,
  useAgent as useAgentCore,
} from "@aipexstudio/aipex-react";
import { SYSTEM_PROMPT } from "@aipexstudio/aipex-react/components/chatbot/constants";
import type { ChatSettings } from "@aipexstudio/aipex-react/types";
import {
  allBrowserProviders,
  allBrowserTools,
  IndexedDBStorage,
} from "@aipexstudio/browser-runtime";
import { useMemo, useRef } from "react";

export interface UseAgentOptions {
  settings: ChatSettings;
  isLoading: boolean;
}

export type { UseAgentReturn };

/**
 * Browser extension specific useAgent hook
 *
 * Automatically configures the agent with:
 * - Browser context providers (bookmarks, history, tabs, etc.)
 * - Browser tools (screenshot, click, scroll, etc.)
 * - IndexedDB storage for conversation persistence
 *
 * @example
 * ```typescript
 * const { agent, isReady, error } = useAgent({
 *   settings: { aiProvider: "openai", aiToken: "...", aiModel: "gpt-4" },
 *   isLoading: false,
 * });
 * ```
 */
export function useAgent({
  settings,
  isLoading,
}: UseAgentOptions): UseAgentReturn {
  // Create storage instance (memoized)
  const storage = useMemo(
    () =>
      new SessionStorage(
        new IndexedDBStorage({
          dbName: "aipex-sessions",
          storeName: "sessions",
        }),
      ),
    [],
  );

  // Model factory function - use useRef to maintain stable reference
  const modelFactoryRef = useRef((settings: ChatSettings) => {
    const provider = createAIProvider(settings);
    return aisdk(provider(settings.aiModel!));
  });

  // Stable references for context providers and tools to prevent infinite loops
  const contextProvidersRef = useRef(allBrowserProviders);
  const toolsRef = useRef(allBrowserTools);

  // Use the generic hook with browser-specific configuration
  return useAgentCore({
    settings,
    isLoading,
    modelFactory: modelFactoryRef.current,
    storage,
    contextProviders: contextProvidersRef.current,
    tools: toolsRef.current as any,
    instructions: SYSTEM_PROMPT,
    name: "AIPex Browser Assistant",
    maxTurns: 10,
  });
}
