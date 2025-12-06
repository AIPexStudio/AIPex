// AI SDK
export { aisdk } from "@openai/agents-extensions";

// Agent
export { AIPex, AIPexAgent } from "./agent/index.js";

// Config
export {
  AI_PROVIDERS,
  type AIProviderConfig,
  type AIProviderKey,
  type AppSettings,
  createConversationConfig,
  DEFAULT_APP_SETTINGS,
  DEFAULT_CONVERSATION_CONFIG,
  detectProviderFromHost,
  isValidConversationStorage,
  normalizeConversationConfig,
  STORAGE_KEYS,
  type StorageKey,
} from "./config/index.js";

// Context
export { ContextManager } from "./context/manager.js";
export type {
  Context,
  ContextManagerOptions,
  ContextProvider,
  ContextProviderCapabilities,
  ContextQuery,
  ContextType,
} from "./context/types.js";
export {
  formatContextsForPrompt,
  isContext,
  resolveContexts,
} from "./context/utils.js";

// Conversation
export { ConversationCompressor } from "./conversation/compressor.js";
export { ConversationManager } from "./conversation/manager.js";
export { Session } from "./conversation/session.js";
export { SessionStorage } from "./conversation/storage.js";

// Generic Storage
export type { KeyValueStorage, WatchCallback } from "./storage/index.js";
export { InMemoryStorage } from "./storage/memory.js";

// Tools
export { calculatorTool } from "./tools/calculator.js";
export { httpFetchTool } from "./tools/http-fetch.js";
export { tool } from "./tools/index.js";
export {
  type ToolExecutionContext,
  type ToolMetadata,
  ToolRegistry,
  type UnifiedToolDefinition,
} from "./tools/registry.js";

// Types
export type {
  AfterResponsePayload,
  AgentEvent,
  AgentInputItem,
  AgentMetrics,
  AgentPlugin,
  AgentPluginContext,
  AgentPluginHooks,
  AIPexAgentOptions,
  AIPexOptions,
  AiSdkModel,
  BeforeChatPayload,
  ChatOptions,
  CompressionConfig,
  CompressionOptions,
  ConversationConfig,
  ForkInfo,
  FunctionTool,
  MetricsPayload,
  OpenAIAgent,
  SerializedSession,
  SessionConfig,
  SessionStorageAdapter,
  SessionSummary,
  SessionTree,
  ToolEventPayload,
} from "./types.js";
export {
  CancellationError,
  CancellationToken,
} from "./utils/cancellation-token.js";
// Utils
export {
  AgentError,
  ErrorCode,
  LLMError,
  LLMStreamError,
  ToolError,
  ToolTimeoutError,
  TurnCancelledError,
} from "./utils/errors.js";
export { generateId } from "./utils/id-generator.js";
export { safeJsonParse } from "./utils/json.js";
