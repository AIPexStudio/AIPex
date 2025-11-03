import {
  DEFAULT_AGENT_OPTIONS,
  DEFAULT_CONVERSATION_CONFIG,
  DEFAULT_LLM_MAX_TOKENS,
  DEFAULT_LLM_TEMPERATURE,
  DEFAULT_LLM_TOP_P,
} from "./defaults.js";
import type { AgentConfig, AgentOptions, ConversationConfig } from "./types.js";

export class ConfigBuilder {
  private config: Partial<AgentConfig> = {};

  useLLM(
    provider: "gemini" | "openai" | "claude",
    apiKey: string,
    model?: string,
  ): this {
    this.config.llm = {
      provider,
      apiKey,
      model,
      temperature: DEFAULT_LLM_TEMPERATURE,
      maxTokens: DEFAULT_LLM_MAX_TOKENS,
      topP: DEFAULT_LLM_TOP_P,
    };
    return this;
  }

  withModel(model: string): this {
    if (!this.config.llm) {
      throw new Error("Must call useLLM() before withModel()");
    }
    this.config.llm.model = model;
    return this;
  }

  withTemperature(temperature: number): this {
    if (!this.config.llm) {
      throw new Error("Must call useLLM() before withTemperature()");
    }
    if (temperature < 0 || temperature > 2) {
      throw new Error("Temperature must be between 0 and 2");
    }
    this.config.llm.temperature = temperature;
    return this;
  }

  withMaxTokens(maxTokens: number): this {
    if (!this.config.llm) {
      throw new Error("Must call useLLM() before withMaxTokens()");
    }
    if (maxTokens < 1) {
      throw new Error("Max tokens must be positive");
    }
    this.config.llm.maxTokens = maxTokens;
    return this;
  }

  withSystemPrompt(prompt: string): this {
    if (!this.config.agent) {
      this.config.agent = {};
    }
    this.config.agent.systemPrompt = prompt;
    return this;
  }

  withMaxTurns(maxTurns: number): this {
    if (!this.config.agent) {
      this.config.agent = {};
    }
    if (maxTurns < 1) {
      throw new Error("Max turns must be positive");
    }
    this.config.agent.maxTurns = maxTurns;
    return this;
  }

  withTimeout(timeoutMs: number): this {
    if (!this.config.agent) {
      this.config.agent = {};
    }
    if (timeoutMs < 1000) {
      throw new Error("Timeout must be at least 1000ms");
    }
    this.config.agent.timeoutMs = timeoutMs;
    return this;
  }

  withTools(...tools: string[]): this {
    if (!this.config.tools) {
      this.config.tools = {};
    }
    this.config.tools.enabled = tools;
    return this;
  }

  disableTools(...tools: string[]): this {
    if (!this.config.tools) {
      this.config.tools = {};
    }
    this.config.tools.disabled = tools;
    return this;
  }

  withStorage(storage: "memory" | "localstorage" | "indexeddb"): this {
    if (!this.config.conversation) {
      this.config.conversation = {};
    }
    this.config.conversation.storage = storage;
    return this;
  }

  withMaxHistoryLength(length: number): this {
    if (!this.config.conversation) {
      this.config.conversation = {};
    }
    if (length < 1) {
      throw new Error("Max history length must be positive");
    }
    this.config.conversation.maxHistoryLength = length;
    return this;
  }

  build(): AgentConfig {
    if (!this.config.llm) {
      throw new Error("LLM configuration is required. Call useLLM() first.");
    }

    // Apply defaults
    const agent: AgentOptions = {
      ...DEFAULT_AGENT_OPTIONS,
      ...this.config.agent,
    };

    const conversation: ConversationConfig = {
      ...DEFAULT_CONVERSATION_CONFIG,
      ...this.config.conversation,
    };

    return {
      llm: this.config.llm,
      agent,
      tools: this.config.tools,
      conversation,
    };
  }
}
