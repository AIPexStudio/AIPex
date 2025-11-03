import { describe, expect, it } from "vitest";
import { createLLMProvider } from "./factory.js";
import { GeminiProvider } from "./gemini-provider.js";

describe("ProviderFactory", () => {
  it("should create Gemini provider", () => {
    const provider = createLLMProvider({
      provider: "gemini",
      apiKey: "test-key",
    });

    expect(provider).toBeInstanceOf(GeminiProvider);
    expect(provider.name).toBe("gemini");
  });

  it("should pass model to Gemini provider", () => {
    const provider = createLLMProvider({
      provider: "gemini",
      apiKey: "test-key",
      model: "gemini-pro",
    });

    expect(provider).toBeInstanceOf(GeminiProvider);
  });

  it("should throw for unknown provider", () => {
    expect(() =>
      createLLMProvider({
        provider: "unknown" as any,
        apiKey: "test-key",
      }),
    ).toThrow("Unknown provider");
  });
});
