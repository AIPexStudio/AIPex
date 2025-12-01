import { createOpenAI } from "@ai-sdk/openai";
import {
  AIPex,
  aisdk,
  IndexedDBStorage,
  SessionStorage,
} from "@aipexstudio/aipex-core";
import { useEffect, useMemo, useState } from "react";
import { SYSTEM_PROMPT } from "~/components/chatbot/constants";
import { allBrowserTools } from "~/tools";
import type { ChatSettings } from "~/types";

export interface UseAgentOptions {
  settings: ChatSettings;
  isLoading: boolean;
}

export interface UseAgentReturn {
  agent: AIPex | undefined;
  isReady: boolean;
  error: Error | undefined;
}

/**
 * useAgent - Hook for creating and managing the AIPex agent instance
 *
 * Creates an agent based on the provided settings (aiHost, aiToken, aiModel).
 * The agent is recreated when settings change.
 */
export function useAgent({
  settings,
  isLoading,
}: UseAgentOptions): UseAgentReturn {
  const [agent, setAgent] = useState<AIPex | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);

  const isConfigured = useMemo(() => {
    return Boolean(settings.aiToken && settings.aiModel);
  }, [settings.aiToken, settings.aiModel]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isConfigured) {
      setAgent(undefined);
      setError(new Error("API token or model not configured"));
      return;
    }

    try {
      // Create OpenAI compatible provider with custom baseURL
      const openai = createOpenAI({
        baseURL: settings.aiHost || "https://api.openai.com/v1",
        apiKey: settings.aiToken,
      });

      // Create the model using aisdk
      const model = aisdk(openai(settings.aiModel));

      // Create storage for conversation persistence
      const storage = new SessionStorage(
        new IndexedDBStorage("aipex-sessions"),
      );

      // Get all available tools
      const tools = [...allBrowserTools];

      // Create the agent
      const newAgent = AIPex.create({
        name: "AIPex Assistant",
        instructions: SYSTEM_PROMPT,
        model,
        tools,
        storage,
        maxTurns: 10,
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
    isConfigured,
    settings.aiHost,
    settings.aiToken,
    settings.aiModel,
  ]);

  return {
    agent,
    isReady: Boolean(agent) && !isLoading,
    error,
  };
}
