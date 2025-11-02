export interface AgentConfig {
  llm: LLMConfig;
  agent?: AgentOptions;
  tools?: ToolsConfig;
  conversation?: ConversationConfig;
}

export interface LLMConfig {
  provider: "gemini" | "openai" | "claude";
  model?: string;
  apiKey: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export interface AgentOptions {
  systemPrompt?: string;
  maxTurns?: number;
  timeoutMs?: number;
  streaming?: boolean;
}

export interface ToolsConfig {
  enabled?: string[];
  disabled?: string[];
}

export interface ConversationConfig {
  storage?: "memory" | "localstorage" | "indexeddb";
  maxHistoryLength?: number;
  maxContextTokens?: number;
  keepRecentTurns?: number;
}
