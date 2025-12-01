import type {
  AgentInputItem,
  FunctionTool,
  Agent as OpenAIAgent,
} from "@openai/agents";
import type { AiSdkModel } from "@openai/agents-extensions";
import type { Context, ContextManager } from "./context/index.js";
import type { ConversationManager } from "./conversation/manager.js";
import type { AgentError } from "./utils/errors.js";

// Re-export types from @openai/agents for convenient access
export type { FunctionTool, AiSdkModel, AgentInputItem, OpenAIAgent };

// ============================================================================
// Agent Types
// ============================================================================

export interface AIPexOptions<
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
  maxTurns?: number;

  /**
   * Disable conversation management (stateless mode).
   * When false, no session will be created or maintained.
   */
  conversation?: false;

  /**
   * Custom storage adapter for sessions.
   * Defaults to SessionStorage with InMemoryStorage if not provided.
   */
  storage?: SessionStorageAdapter;

  /**
   * Compression configuration for long conversations.
   * Requires a model for generating summaries.
   */
  compression?: CompressionOptions;

  /**
   * Fully custom ConversationManager instance.
   * When provided, storage and compression options are ignored.
   */
  conversationManager?: ConversationManager;

  /**
   * Context manager for providing additional context to the agent.
   * Contexts can come from various sources (browser, filesystem, database, etc.)
   */
  contextManager?: ContextManager;
}

export interface CompressionOptions extends CompressionConfig {
  model: AiSdkModel;
}

export interface ChatOptions {
  sessionId?: string;
  /**
   * Contexts to include with this message.
   * Can be Context objects or context IDs (strings).
   * Context IDs will be resolved using the ContextManager.
   */
  contexts?: Context[] | string[];
}

/**
 * @deprecated Use AIPexOptions instead
 */
export type AIPexAgentOptions<
  TTools extends readonly FunctionTool<any, any, any>[] = FunctionTool<
    any,
    any,
    any
  >[],
> = AIPexOptions<TTools>;

export interface AgentMetrics {
  tokensUsed: number;
  promptTokens: number;
  completionTokens: number;
  itemCount: number;
  maxTurns: number;
  duration: number;
  startTime: number;
}

export type AgentEvent =
  | { type: "session_created"; sessionId: string }
  | { type: "session_resumed"; sessionId: string; itemCount: number }
  | { type: "content_delta"; delta: string }
  | { type: "tool_call_start"; toolName: string; params: unknown }
  | { type: "tool_call_complete"; toolName: string; result: unknown }
  | { type: "tool_call_error"; toolName: string; error: Error }
  | { type: "contexts_attached"; contexts: Context[] }
  | { type: "contexts_loaded"; providerId: string; count: number }
  | { type: "context_error"; providerId: string; error: Error }
  | { type: "metrics_update"; metrics: AgentMetrics }
  | { type: "error"; error: AgentError }
  | {
      type: "execution_complete";
      finalOutput: string;
      metrics: AgentMetrics;
    };

// ============================================================================
// Session Types
// ============================================================================

export interface SessionConfig {
  systemPrompt?: string;
}

export interface ForkInfo {
  parentSessionId?: string;
  forkAtItemIndex?: number;
}

export interface SessionMetrics {
  totalTokensUsed: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  executionCount: number;
}

export interface SerializedSession {
  id: string;
  items: AgentInputItem[];
  metadata: Record<string, unknown>;
  config: SessionConfig;
  metrics: SessionMetrics;
  parentSessionId?: string;
  forkAtItemIndex?: number;
}

// ============================================================================
// Storage Types
// ============================================================================

export interface SessionSummary {
  id: string;
  preview: string;
  createdAt: number;
  lastActiveAt: number;
  itemCount?: number;
  tags?: string[];
  parentSessionId?: string;
  forkAtItemIndex?: number;
}

export interface SessionTree {
  session: SessionSummary;
  children: SessionTree[];
}

export interface SessionStorageAdapter {
  save(session: import("./conversation/session.js").Session): Promise<void>;
  load(id: string): Promise<import("./conversation/session.js").Session | null>;
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
}

export interface CompressionConfig {
  summarizeAfterItems?: number;
  keepRecentItems?: number;
  maxSummaryLength?: number;
}
