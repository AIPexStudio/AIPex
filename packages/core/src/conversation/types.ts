import type {
  FunctionCall,
  FunctionResponse,
  UnifiedMessage,
} from "../llm/types.js";

export interface CompletedTurn {
  id: string;
  userMessage: UnifiedMessage;
  assistantMessage: UnifiedMessage;
  functionCalls: FunctionCall[];
  functionResults: FunctionResponse[];
  timestamp: number;
  metadata?: {
    duration?: number;
    tokensUsed?: number;
    [key: string]: unknown;
  };
}

export interface SessionStats {
  totalTurns: number;
  totalTokens: number;
  avgTurnDuration: number;
  toolCallCount: number;
  createdAt: number;
  lastActiveAt: number;
}

export interface SessionConfig {
  systemPrompt?: string;
  maxHistoryLength?: number;
  maxContextTokens?: number;
  keepRecentTurns?: number;
}

export interface SessionMetadata {
  createdAt: number;
  lastActiveAt: number;
  [key: string]: unknown;
}

export interface SerializedSession {
  id: string;
  turns: CompletedTurn[];
  systemPrompt?: string;
  metadata: SessionMetadata;
  config: SessionConfig;
}
