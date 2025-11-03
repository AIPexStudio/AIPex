import type { AgentOptions, ConversationConfig } from "./types.js";

export const DEFAULT_AGENT_OPTIONS: Required<AgentOptions> = {
  systemPrompt: "You are a helpful AI assistant.",
  maxTurns: 10,
  timeoutMs: 300000, // 5 minutes
  streaming: true,
};

export const DEFAULT_CONVERSATION_CONFIG: Required<ConversationConfig> = {
  storage: "memory",
  maxHistoryLength: 100,
  maxContextTokens: 10000,
  keepRecentTurns: 10,
};

export const DEFAULT_LLM_TEMPERATURE = 0.7;
export const DEFAULT_LLM_MAX_TOKENS = 2048;
export const DEFAULT_LLM_TOP_P = 1.0;
