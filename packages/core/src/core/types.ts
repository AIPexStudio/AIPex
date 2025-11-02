export enum TurnState {
  INIT = "init",
  LLM_CALLING = "llm_calling",
  TOOL_EXECUTING = "tool_executing",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  FAILED = "failed",
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface RateLimitSnapshot {
  provider: string;
  remaining: number;
  limit: number;
  resetAt: number;
}
