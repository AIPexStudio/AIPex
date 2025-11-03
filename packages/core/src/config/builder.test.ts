import { describe, expect, it } from "vitest";
import { ConfigBuilder } from "./builder.js";

describe("ConfigBuilder", () => {
  it("should build basic config", () => {
    const config = new ConfigBuilder().useLLM("gemini", "test-api-key").build();

    expect(config.llm.provider).toBe("gemini");
    expect(config.llm.apiKey).toBe("test-api-key");
    expect(config.agent).toBeDefined();
    expect(config.conversation).toBeDefined();
  });

  it("should throw error if LLM not configured", () => {
    const builder = new ConfigBuilder();

    expect(() => builder.build()).toThrow("LLM configuration is required");
  });

  it("should set custom model", () => {
    const config = new ConfigBuilder()
      .useLLM("gemini", "test-key")
      .withModel("gemini-pro")
      .build();

    expect(config.llm.model).toBe("gemini-pro");
  });

  it("should set custom temperature", () => {
    const config = new ConfigBuilder()
      .useLLM("gemini", "test-key")
      .withTemperature(0.5)
      .build();

    expect(config.llm.temperature).toBe(0.5);
  });

  it("should validate temperature range", () => {
    const builder = new ConfigBuilder().useLLM("gemini", "test-key");

    expect(() => builder.withTemperature(-0.1)).toThrow(
      "Temperature must be between 0 and 2",
    );
    expect(() => builder.withTemperature(2.1)).toThrow(
      "Temperature must be between 0 and 2",
    );
  });

  it("should set max tokens", () => {
    const config = new ConfigBuilder()
      .useLLM("gemini", "test-key")
      .withMaxTokens(4096)
      .build();

    expect(config.llm.maxTokens).toBe(4096);
  });

  it("should validate max tokens", () => {
    const builder = new ConfigBuilder().useLLM("gemini", "test-key");

    expect(() => builder.withMaxTokens(0)).toThrow(
      "Max tokens must be positive",
    );
  });

  it("should set system prompt", () => {
    const config = new ConfigBuilder()
      .useLLM("gemini", "test-key")
      .withSystemPrompt("You are helpful")
      .build();

    expect(config.agent?.systemPrompt).toBe("You are helpful");
  });

  it("should set max turns", () => {
    const config = new ConfigBuilder()
      .useLLM("gemini", "test-key")
      .withMaxTurns(20)
      .build();

    expect(config.agent?.maxTurns).toBe(20);
  });

  it("should validate max turns", () => {
    const builder = new ConfigBuilder().useLLM("gemini", "test-key");

    expect(() => builder.withMaxTurns(0)).toThrow("Max turns must be positive");
  });

  it("should set timeout", () => {
    const config = new ConfigBuilder()
      .useLLM("gemini", "test-key")
      .withTimeout(60000)
      .build();

    expect(config.agent?.timeoutMs).toBe(60000);
  });

  it("should validate timeout", () => {
    const builder = new ConfigBuilder().useLLM("gemini", "test-key");

    expect(() => builder.withTimeout(500)).toThrow(
      "Timeout must be at least 1000ms",
    );
  });

  it("should enable specific tools", () => {
    const config = new ConfigBuilder()
      .useLLM("gemini", "test-key")
      .withTools("http_fetch", "calculator")
      .build();

    expect(config.tools?.enabled).toEqual(["http_fetch", "calculator"]);
  });

  it("should disable specific tools", () => {
    const config = new ConfigBuilder()
      .useLLM("gemini", "test-key")
      .disableTools("dangerous_tool")
      .build();

    expect(config.tools?.disabled).toEqual(["dangerous_tool"]);
  });

  it("should set storage type", () => {
    const config = new ConfigBuilder()
      .useLLM("gemini", "test-key")
      .withStorage("localstorage")
      .build();

    expect(config.conversation?.storage).toBe("localstorage");
  });

  it("should set max history length", () => {
    const config = new ConfigBuilder()
      .useLLM("gemini", "test-key")
      .withMaxHistoryLength(50)
      .build();

    expect(config.conversation?.maxHistoryLength).toBe(50);
  });

  it("should validate max history length", () => {
    const builder = new ConfigBuilder().useLLM("gemini", "test-key");

    expect(() => builder.withMaxHistoryLength(0)).toThrow(
      "Max history length must be positive",
    );
  });

  it("should chain multiple configurations", () => {
    const config = new ConfigBuilder()
      .useLLM("gemini", "test-key", "gemini-pro")
      .withTemperature(0.8)
      .withMaxTokens(4096)
      .withSystemPrompt("You are an expert")
      .withMaxTurns(15)
      .withTools("http_fetch")
      .withStorage("memory")
      .build();

    expect(config.llm.provider).toBe("gemini");
    expect(config.llm.model).toBe("gemini-pro");
    expect(config.llm.temperature).toBe(0.8);
    expect(config.llm.maxTokens).toBe(4096);
    expect(config.agent?.systemPrompt).toBe("You are an expert");
    expect(config.agent?.maxTurns).toBe(15);
    expect(config.tools?.enabled).toEqual(["http_fetch"]);
    expect(config.conversation?.storage).toBe("memory");
  });

  it("should apply default values", () => {
    const config = new ConfigBuilder().useLLM("gemini", "test-key").build();

    expect(config.agent?.maxTurns).toBeDefined();
    expect(config.agent?.streaming).toBeDefined();
    expect(config.conversation?.maxHistoryLength).toBeDefined();
  });

  it("should throw if withModel called before useLLM", () => {
    const builder = new ConfigBuilder();

    expect(() => builder.withModel("test")).toThrow(
      "Must call useLLM() before withModel()",
    );
  });

  it("should throw if withTemperature called before useLLM", () => {
    const builder = new ConfigBuilder();

    expect(() => builder.withTemperature(0.5)).toThrow(
      "Must call useLLM() before withTemperature()",
    );
  });
});
