/**
 * useAgent - Generic hook for creating and managing AIPex agent instances
 *
 * This is a flexible, configurable hook that can be customized for different use cases.
 * For browser extensions, use the browser-specific wrapper that provides browser tools and providers.
 */

import type { AppSettings } from "@aipexstudio/aipex-core";
import {
  AIPex,
  ContextManager,
  type ContextProvider,
  type FunctionTool,
  type SessionStorageAdapter,
} from "@aipexstudio/aipex-core";
import { useEffect, useRef, useState } from "react";

export interface UseAgentOptions {
  /** Chat settings (provider, token, model, etc.) */
  settings: AppSettings;

  /** Whether settings are still loading */
  isLoading: boolean;

  /** Model factory function - creates the AI model from settings */
  modelFactory: (settings: AppSettings) => any;

  /** Session storage adapter */
  storage: SessionStorageAdapter;

  /** Context providers (optional) */
  contextProviders?: ContextProvider[];

  /** Tools to register with the agent (optional) */
  tools?: FunctionTool[];

  /** System instructions (optional) */
  instructions?: string;

  /** Agent name (optional) */
  name?: string;

  /** Max turns per conversation (optional) */
  maxTurns?: number;

  /** Additional agent options */
  agentOptions?: Partial<Parameters<typeof AIPex.create>[0]>;
}

export interface UseAgentReturn {
  /** The created agent instance */
  agent: AIPex | undefined;

  /** Whether the agent is ready to use */
  isReady: boolean;

  /** Error if agent creation failed */
  error: Error | undefined;
}

/**
 * Create and manage an AIPex agent instance
 *
 * @example
 * ```typescript
 * const { agent, isReady, error } = useAgent({
 *   settings,
 *   isLoading,
 *   modelFactory: (settings) => {
 *     const provider = createAIProvider(settings);
 *     return aisdk(provider(settings.aiModel));
 *   },
 *   storage: sessionStorage,
 *   contextProviders: [bookmarksProvider, historyProvider],
 *   tools: [screenshotTool, clickTool],
 *   instructions: "You are a helpful assistant",
 * });
 * ```
 */
const NOT_CONFIGURED_ERROR_MESSAGE = "API token or model not configured";

export function useAgent({
  settings,
  isLoading,
  modelFactory,
  storage,
  contextProviders = [],
  tools = [],
  instructions,
  name = "AIPex Assistant",
  maxTurns = 2000,
  agentOptions = {},
}: UseAgentOptions): UseAgentReturn {
  const [agent, setAgent] = useState<AIPex | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);

  // Use refs for values that shouldn't trigger re-creation on every render
  const settingsRef = useRef(settings);
  const modelFactoryRef = useRef(modelFactory);
  const storageRef = useRef(storage);
  const contextProvidersRef = useRef(contextProviders);
  const toolsRef = useRef(tools);
  const agentOptionsRef = useRef(agentOptions);

  // Update refs when values change (but don't trigger effect)
  settingsRef.current = settings;
  modelFactoryRef.current = modelFactory;
  storageRef.current = storage;
  contextProvidersRef.current = contextProviders;
  toolsRef.current = tools;
  agentOptionsRef.current = agentOptions;

  // Extract key settings values that should trigger agent re-creation
  const aiToken = settings.aiToken;
  const aiModel = settings.aiModel;
  const aiProvider = settings.aiProvider;
  const byokEnabled = settings.byokEnabled;

  // For BYOK mode, require token + model. For non-BYOK (proxy) mode, always proceed.
  const isByok = Boolean(byokEnabled && aiToken?.trim());
  const isByokConfigured = isByok && Boolean(aiModel?.trim());

  useEffect(() => {
    // Wait for loading to complete
    if (isLoading) {
      return;
    }

    // Only block if BYOK is explicitly enabled but incomplete
    if (isByok && !isByokConfigured) {
      setAgent(undefined);
      setError((prev: Error | undefined) =>
        prev?.message === NOT_CONFIGURED_ERROR_MESSAGE
          ? prev
          : new Error(NOT_CONFIGURED_ERROR_MESSAGE),
      );
      return;
    }

    // Use current settings values (from closure) for agent creation
    const currentSettings = {
      ...settingsRef.current,
      aiToken,
      aiModel,
      aiProvider,
    };

    try {
      // Create the model using provided factory
      // The factory handles both BYOK and proxy mode internally
      const model = modelFactoryRef.current(currentSettings);

      let contextManager: ContextManager | undefined;
      if (contextProvidersRef.current.length > 0) {
        contextManager = new ContextManager({
          providers: contextProvidersRef.current,
          autoInitialize: true,
        });
      }

      // Create the agent
      const newAgent = AIPex.create({
        name,
        instructions: instructions ?? "You are a helpful AI assistant.",
        model,
        tools: toolsRef.current.length > 0 ? toolsRef.current : undefined,
        storage: storageRef.current,
        contextManager,
        maxTurns,
        ...agentOptionsRef.current,
      });

      setAgent(newAgent);
      setError(undefined);
    } catch (err) {
      console.error("Failed to create agent:", err);
      setAgent(undefined);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [
    isLoading,
    isByok,
    isByokConfigured,
    aiToken,
    aiModel,
    aiProvider,
    byokEnabled,
    instructions,
    name,
    maxTurns,
  ]);

  return {
    agent,
    isReady: Boolean(agent) && !isLoading,
    error,
  };
}
