import { describe, expect, it } from "vitest";
import { AI_PROVIDERS, detectProviderFromHost } from "./ai-providers.js";

describe("Runcrate provider", () => {
  it("uses the OpenAI-compatible endpoint", () => {
    expect(AI_PROVIDERS.runcrate.host).toBe("https://api.runcrate.ai/v1");
    expect(AI_PROVIDERS.runcrate.providerType).toBe("openai");
    expect(AI_PROVIDERS.runcrate.models.length).toBeGreaterThan(0);
  });

  it("is detected from its host", () => {
    expect(detectProviderFromHost("https://api.runcrate.ai/v1")).toBe(
      "runcrate",
    );
  });
});
