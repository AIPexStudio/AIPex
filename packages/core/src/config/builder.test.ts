import { describe, expect, it } from "vitest";
import { ConfigBuilder } from "./builder.js";

describe("ConfigBuilder", () => {
  it("should build default conversation config", () => {
    const config = new ConfigBuilder().build();

    expect(config.enabled).toBe(true);
    expect(config.storage).toBe("memory");
    expect(config.maxHistoryLength).toBe(100);
  });

  it("should set storage type", () => {
    const config = new ConfigBuilder().withStorage("indexeddb").build();

    expect(config.storage).toBe("indexeddb");
  });

  it("should set max history length", () => {
    const config = new ConfigBuilder().withMaxHistoryLength(50).build();

    expect(config.maxHistoryLength).toBe(50);
  });

  it("should validate max history length", () => {
    const builder = new ConfigBuilder();

    expect(() => builder.withMaxHistoryLength(0)).toThrow(
      "Max history length must be positive",
    );
    expect(() => builder.withMaxHistoryLength(-1)).toThrow(
      "Max history length must be positive",
    );
  });

  it("should set max context tokens", () => {
    const config = new ConfigBuilder().withMaxContextTokens(8000).build();

    expect(config.maxContextTokens).toBe(8000);
  });

  it("should validate max context tokens", () => {
    const builder = new ConfigBuilder();

    expect(() => builder.withMaxContextTokens(0)).toThrow(
      "Max context tokens must be positive",
    );
    expect(() => builder.withMaxContextTokens(-1)).toThrow(
      "Max context tokens must be positive",
    );
  });

  it("should enable compression", () => {
    const config = new ConfigBuilder().withCompression(true).build();

    expect(config.compression).toBeDefined();
    expect(config.compression?.summarizeAfterTurns).toBe(10);
  });

  it("should disable compression", () => {
    const config = new ConfigBuilder().withCompression(false).build();

    expect(config.compression).toBeUndefined();
  });

  it("should build with multiple options", () => {
    const config = new ConfigBuilder()
      .withStorage("indexeddb")
      .withMaxHistoryLength(200)
      .withMaxContextTokens(16000)
      .withCompression(true)
      .build();

    expect(config.storage).toBe("indexeddb");
    expect(config.maxHistoryLength).toBe(200);
    expect(config.maxContextTokens).toBe(16000);
    expect(config.compression).toBeDefined();
  });
});
