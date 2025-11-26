import type { CompressionConfig, ConversationConfig } from "../types.js";

export const DEFAULT_CONVERSATION_CONFIG: ConversationConfig = {
  enabled: true,
  storage: "memory",
  maxHistoryLength: 100,
  maxContextTokens: 4000,
  keepRecentTurns: 10,
};

export const DEFAULT_COMPRESSION_CONFIG: CompressionConfig = {
  summarizeAfterTurns: 10,
  keepRecentTurns: 5,
  maxSummaryLength: 500,
};
