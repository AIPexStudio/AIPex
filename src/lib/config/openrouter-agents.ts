/**
 * OpenRouter Agent Configuration
 *
 * This file defines all agents used in AIPex with their OpenRouter-compatible settings.
 * Each agent has specific parameters optimized for its role.
 */

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  // Model selection - users can override these
  defaultModel: string;
  // Whether this agent benefits from vision/multimodal capabilities
  requiresVision: boolean;
  // OpenRouter-compatible parameters
  temperature: number;
  topP: number;
  maxTokens: number;
  frequencyPenalty: number;
  presencePenalty: number;
}

/**
 * Agent Definitions
 *
 * Each agent has optimized parameters for its specific task:
 * - Planner: Higher temperature for creative problem decomposition
 * - Navigator: Low temperature for deterministic, reliable actions
 * - Analyzer: Medium temperature for balanced analysis
 * - Summarizer: Low-medium temperature for accurate summaries
 */
export const AGENTS: Record<string, AgentConfig> = {
  planner: {
    id: "planner",
    name: "Planner",
    description: "Plans and decomposes complex tasks",
    defaultModel: "anthropic/claude-sonnet-4",
    requiresVision: false,
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 4096,
    frequencyPenalty: 0.1,
    presencePenalty: 0.1,
  },
  navigator: {
    id: "navigator",
    name: "Navigator",
    description: "Executes browser actions",
    defaultModel: "anthropic/claude-sonnet-4",
    requiresVision: true,
    temperature: 0.1,
    topP: 0.95,
    maxTokens: 2048,
    frequencyPenalty: 0.0,
    presencePenalty: 0.0,
  },
  analyzer: {
    id: "analyzer",
    name: "Analyzer",
    description: "Analyzes page content",
    defaultModel: "anthropic/claude-sonnet-4",
    requiresVision: true,
    temperature: 0.3,
    topP: 0.9,
    maxTokens: 4096,
    frequencyPenalty: 0.0,
    presencePenalty: 0.1,
  },
  summarizer: {
    id: "summarizer",
    name: "Summarizer",
    description: "Creates concise summaries",
    defaultModel: "anthropic/claude-sonnet-4",
    requiresVision: false,
    temperature: 0.2,
    topP: 0.9,
    maxTokens: 2048,
    frequencyPenalty: 0.3,
    presencePenalty: 0.0,
  },
};

/**
 * OpenRouter API Configuration
 */
export const OPENROUTER_CONFIG = {
  baseUrl: "https://openrouter.ai/api/v1/chat/completions",
  // HTTP headers required by OpenRouter
  headers: {
    "HTTP-Referer": "https://aipex.app",
    "X-Title": "AIPex Browser Assistant",
  },
};

/**
 * Get agent configuration by ID
 */
export function getAgentConfig(agentId: string): AgentConfig | undefined {
  return AGENTS[agentId];
}

/**
 * Get all agent IDs
 */
export function getAgentIds(): string[] {
  return Object.keys(AGENTS);
}

/**
 * Storage keys for agent model overrides
 */
export const STORAGE_KEYS = {
  apiKey: "openrouter_api_key",
  agentModels: "openrouter_agent_models",
};

/**
 * Default agent model assignments
 */
export function getDefaultAgentModels(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(AGENTS).map(([id, config]) => [id, config.defaultModel])
  );
}
