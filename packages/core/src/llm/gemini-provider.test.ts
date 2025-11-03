import { beforeEach, describe, expect, it, vi } from "vitest";
import { LLMError } from "../utils/errors.js";
import { GeminiProvider } from "./gemini-provider.js";

const mockGenerateContent = vi.fn();
const mockGenerateContentStream = vi.fn();
const mockCountTokens = vi.fn();

vi.mock("@google/genai", () => {
  return {
    GoogleGenAI: class {
      models = {
        generateContent: mockGenerateContent,
        generateContentStream: mockGenerateContentStream,
        countTokens: mockCountTokens,
      };
    },
  };
});

describe("GeminiProvider", () => {
  let provider: GeminiProvider;

  beforeEach(() => {
    vi.clearAllMocks();

    provider = new GeminiProvider({
      apiKey: "test-api-key",
      model: "gemini-2.0-flash-exp",
    });
  });

  describe("constructor", () => {
    it("should initialize with correct defaults", () => {
      expect(provider.name).toBe("gemini");
      expect(provider.capabilities.streaming).toBe(true);
      expect(provider.capabilities.functionCalling).toBe(true);
    });

    it("should use custom model if provided", () => {
      const customProvider = new GeminiProvider({
        apiKey: "test-key",
        model: "gemini-pro",
      });
      expect(customProvider).toBeDefined();
    });
  });

  describe("generateContent", () => {
    it("should generate content successfully", async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: "Hello, I am an AI assistant." }],
            },
            finishReason: "STOP",
          },
        ],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 20,
          totalTokenCount: 30,
        },
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await provider.generateContent({
        messages: [{ role: "user", content: "Hello" }],
      });

      expect(result.text).toBe("Hello, I am an AI assistant.");
      expect(result.functionCalls).toEqual([]);
      expect(result.finishReason).toBe("STOP");
      expect(result.usage.totalTokens).toBe(30);
    });

    it("should handle function calls in response", async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  functionCall: {
                    name: "get_weather",
                    args: { city: "Tokyo" },
                  },
                },
              ],
            },
            finishReason: "STOP",
          },
        ],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 20,
          totalTokenCount: 30,
        },
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      const result = await provider.generateContent({
        messages: [{ role: "user", content: "What's the weather in Tokyo?" }],
      });

      expect(result.functionCalls).toHaveLength(1);
      expect(result.functionCalls[0].name).toBe("get_weather");
      expect(result.functionCalls[0].params).toEqual({ city: "Tokyo" });
    });

    it("should handle system instructions", async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: "Response" }],
            },
            finishReason: "STOP",
          },
        ],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 20,
          totalTokenCount: 30,
        },
      };

      mockGenerateContent.mockResolvedValue(mockResponse);

      await provider.generateContent({
        messages: [
          { role: "system", content: "You are a helpful assistant" },
          { role: "user", content: "Hello" },
        ],
      });

      expect(mockGenerateContent).toHaveBeenCalled();
    });

    it("should throw LLMError on API error", async () => {
      vi.useFakeTimers();
      mockGenerateContent.mockRejectedValue(
        new Error("PERMISSION_DENIED: API key invalid"),
      );

      const promise = expect(
        provider.generateContent({
          messages: [{ role: "user", content: "Hello" }],
        }),
      ).rejects.toThrow(LLMError);

      await vi.runAllTimersAsync();
      await promise;

      vi.useRealTimers();
    });

    it("should throw on missing candidate content", async () => {
      mockGenerateContent.mockResolvedValue({
        candidates: [{}],
      });

      await expect(
        provider.generateContent({
          messages: [{ role: "user", content: "Hello" }],
        }),
      ).rejects.toThrow(LLMError);
    });
  });

  describe("generateStream", () => {
    it("should stream content chunks", async () => {
      async function* mockStreamGenerator() {
        yield {
          candidates: [
            {
              content: {
                parts: [{ text: "Hello" }],
              },
            },
          ],
        };
        yield {
          candidates: [
            {
              content: {
                parts: [{ text: "Hello World" }],
              },
            },
          ],
        };
        yield {
          candidates: [
            {
              content: {
                parts: [{ text: "Hello World!" }],
              },
              finishReason: "STOP",
              usageMetadata: {
                totalTokenCount: 10,
                promptTokenCount: 5,
                candidatesTokenCount: 5,
              },
            },
          ],
        };
      }

      mockGenerateContentStream.mockResolvedValue(mockStreamGenerator());

      const chunks: string[] = [];
      for await (const chunk of provider.generateStream({
        messages: [{ role: "user", content: "Hello" }],
      })) {
        if (chunk.type === "content") {
          chunks.push(chunk.delta);
        }
      }

      expect(chunks).toEqual(["Hello", " World", "!"]);
    });

    it("should handle function calls in stream", async () => {
      async function* mockStreamGenerator() {
        yield {
          candidates: [
            {
              content: {
                parts: [
                  {
                    functionCall: {
                      name: "test_fn",
                      args: { key: "value" },
                    },
                  },
                ],
              },
              finishReason: "STOP",
              usageMetadata: {
                totalTokenCount: 10,
                promptTokenCount: 5,
                candidatesTokenCount: 5,
              },
            },
          ],
        };
      }

      mockGenerateContentStream.mockResolvedValue(mockStreamGenerator());

      const functionCalls = [];
      for await (const chunk of provider.generateStream({
        messages: [{ role: "user", content: "Test" }],
      })) {
        if (chunk.type === "function_call") {
          functionCalls.push(chunk.call);
        }
      }

      expect(functionCalls).toHaveLength(1);
      expect(functionCalls[0].name).toBe("test_fn");
    });

    it("should throw LLMError on stream error", async () => {
      mockGenerateContentStream.mockRejectedValue(
        new Error("RESOURCE_EXHAUSTED: Rate limit exceeded"),
      );

      const generator = provider.generateStream({
        messages: [{ role: "user", content: "Hello" }],
      });

      await expect(generator.next()).rejects.toThrow(LLMError);
    });

    it("should handle empty candidates gracefully", async () => {
      async function* mockStreamGenerator() {
        yield {
          candidates: [],
        };
        yield {
          candidates: [
            {
              content: {
                parts: [{ text: "Hello" }],
              },
              finishReason: "STOP",
              usageMetadata: {
                totalTokenCount: 10,
                promptTokenCount: 5,
                candidatesTokenCount: 5,
              },
            },
          ],
        };
      }

      mockGenerateContentStream.mockResolvedValue(mockStreamGenerator());

      const chunks: string[] = [];
      for await (const chunk of provider.generateStream({
        messages: [{ role: "user", content: "Hello" }],
      })) {
        if (chunk.type === "content") {
          chunks.push(chunk.delta);
        }
      }

      expect(chunks).toEqual(["Hello"]);
    });
  });

  describe("countTokens", () => {
    it("should count tokens correctly", async () => {
      mockCountTokens.mockResolvedValue({
        totalTokens: 150,
      });

      const result = await provider.countTokens([
        { role: "user", content: "Hello" },
      ]);

      expect(result.totalTokens).toBe(150);
      expect(result.promptTokens).toBe(150);
    });

    it("should handle system messages", async () => {
      mockCountTokens.mockResolvedValue({
        totalTokens: 200,
      });

      await provider.countTokens([
        { role: "system", content: "You are helpful" },
        { role: "user", content: "Hello" },
      ]);

      expect(mockCountTokens).toHaveBeenCalled();
    });

    it("should throw on API error", async () => {
      mockCountTokens.mockRejectedValue(
        new Error("DEADLINE_EXCEEDED: Request timeout"),
      );

      await expect(
        provider.countTokens([{ role: "user", content: "Hello" }]),
      ).rejects.toThrow(LLMError);
    });

    it("should handle missing totalTokens", async () => {
      mockCountTokens.mockResolvedValue({});

      const result = await provider.countTokens([
        { role: "user", content: "Hello" },
      ]);

      expect(result.totalTokens).toBe(0);
    });
  });

  describe("error handling", () => {
    it("should handle API_KEY_INVALID error", async () => {
      vi.useFakeTimers();
      mockGenerateContent.mockRejectedValue(
        new Error("API_KEY_INVALID: Invalid API key"),
      );

      const promise = expect(
        provider.generateContent({
          messages: [{ role: "user", content: "Hello" }],
        }),
      ).rejects.toThrow(expect.objectContaining({ code: "LLM_AUTH_ERROR" }));

      await vi.runAllTimersAsync();
      await promise;

      vi.useRealTimers();
    });

    it("should handle RESOURCE_EXHAUSTED error", async () => {
      vi.useFakeTimers();
      mockGenerateContent.mockRejectedValue(
        new Error("RESOURCE_EXHAUSTED: Rate limit"),
      );

      const promise = expect(
        provider.generateContent({
          messages: [{ role: "user", content: "Hello" }],
        }),
      ).rejects.toThrow(
        expect.objectContaining({ code: "LLM_RATE_LIMIT", retryDelay: 60000 }),
      );

      await vi.runAllTimersAsync();
      await promise;

      vi.useRealTimers();
    });

    it("should handle DEADLINE_EXCEEDED error", async () => {
      vi.useFakeTimers();
      mockGenerateContent.mockRejectedValue(
        new Error("DEADLINE_EXCEEDED: Timeout"),
      );

      const promise = expect(
        provider.generateContent({
          messages: [{ role: "user", content: "Hello" }],
        }),
      ).rejects.toThrow(
        expect.objectContaining({ code: "LLM_TIMEOUT", retryDelay: 5000 }),
      );

      await vi.runAllTimersAsync();
      await promise;

      vi.useRealTimers();
    });
  });
});
