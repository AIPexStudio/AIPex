import type { FunctionTool, Agent as OpenAIAgent } from "@openai/agents";
import type { AiSdkModel } from "@openai/agents-extensions";
import type { ConversationManager } from "./conversation/manager.js";
import type { Session } from "./conversation/session.js";

// ============================================================================
// Message Types
// ============================================================================

export interface Message {
  role: "system" | "user" | "assistant" | "function";
  content: string;
}

// ============================================================================
// Agent Types
// ============================================================================

// Re-export FunctionTool from @openai/agents for convenient access
export type { FunctionTool, AiSdkModel };

export interface AIPexAgentOptions<
  TTools extends readonly FunctionTool<any, any, any>[] = FunctionTool<
    any,
    any,
    any
  >[],
> {
  name?: string;
  instructions: string;
  /**
   * AI model to use. Create using aisdk() with a provider:
   *
   * @example
   * // OpenAI
   * import { openai } from '@ai-sdk/openai';
   * model: aisdk(openai('gpt-4o'))
   *
   * // Anthropic Claude
   * import { anthropic } from '@ai-sdk/anthropic';
   * model: aisdk(anthropic('claude-sonnet-4-20250514'))
   *
   * // Google Gemini
   * import { google } from '@ai-sdk/google';
   * model: aisdk(google('gemini-2.5-flash'))
   *
   * // OpenRouter
   * import { createOpenRouter } from '@openrouter/ai-sdk-provider';
   * const openRouter = createOpenRouter();
   * model: aisdk(openRouter('openai/gpt-4o'))
   */
  model: AiSdkModel;
  tools?: TTools;
  conversationManager?: ConversationManager;
  maxTurns?: number;
  maxTokens?: number;
}

export interface AgentMetrics {
  tokensUsed: number;
  maxTokens?: number;
  promptTokens: number;
  completionTokens: number;
  turnCount: number;
  maxTurns: number;
  toolCallCount: number;
  duration: number;
  startTime: number;
}

export type AgentEvent =
  | { type: "session_created"; sessionId: string }
  | { type: "session_resumed"; sessionId: string; turnCount: number }
  | { type: "content_delta"; delta: string }
  | { type: "tool_call_start"; toolName: string; params: unknown }
  | { type: "tool_call_complete"; toolName: string; result: ToolResult }
  | { type: "tool_call_error"; toolName: string; error: Error }
  | { type: "turn_complete"; turnNumber: number }
  | { type: "metrics_update"; metrics: AgentMetrics }
  | {
      type: "execution_complete";
      turns: number;
      finalOutput: string;
      metrics: AgentMetrics;
    };

export interface ToolResult {
  data: unknown;
  tokensUsed?: number;
  duration?: number;
}

export type { OpenAIAgent };

// ============================================================================
// Conversation Types
// ============================================================================

export interface FunctionCall {
  id: string;
  name: string;
  params: Record<string, unknown>;
}

export interface FunctionResponse {
  id: string;
  name: string;
  result: Record<string, unknown>;
}

export interface CompletedTurn {
  id: string;
  userMessage: Message;
  assistantMessage: Message;
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
  messageCount: number;
  turnCount: number;
  toolCallCount: number;
  totalTokens: number;
  totalDuration: number;
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
  totalTurns?: number;
  totalTokens?: number;
  tags?: string[];
  [key: string]: unknown;
}

export interface ForkInfo {
  parentSessionId?: string;
  forkAtTurn?: number;
}

export interface SerializedSession {
  id: string;
  turns: CompletedTurn[];
  systemPrompt?: string;
  metadata: Record<string, unknown>;
  config: SessionConfig;
  preview?: string;
  parentSessionId?: string;
  forkAtTurn?: number;
}

// ============================================================================
// Storage Types
// ============================================================================

export interface SessionSummary {
  id: string;
  preview: string;
  createdAt: number;
  lastActiveAt: number;
  turnCount?: number;
  tags?: string[];
  parentSessionId?: string;
  forkAtTurn?: number;
}

export interface SessionTree {
  session: SessionSummary;
  children: SessionTree[];
}

export interface SessionStorageAdapter {
  save(session: Session): Promise<void>;
  load(id: string): Promise<Session | null>;
  delete(id: string): Promise<void>;
  listAll(): Promise<SessionSummary[]>;
  getSessionTree(rootId?: string): Promise<SessionTree[]>;
  getChildren(parentId: string): Promise<SessionSummary[]>;
}

// ============================================================================
// Config Types
// ============================================================================

export interface ConversationConfig {
  enabled?: boolean;
  storage?: "memory" | "indexeddb";
  maxHistoryLength?: number;
  maxContextTokens?: number;
  keepRecentTurns?: number;
  compression?: CompressionConfig;
}

export interface CompressionConfig {
  summarizeAfterTurns?: number;
  keepRecentTurns?: number;
  maxSummaryLength?: number;
}

export type SummarizerFunction = (text: string) => Promise<string>;
