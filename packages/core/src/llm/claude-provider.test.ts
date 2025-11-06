import { beforeEach, describe, expect, it, vi } from "vitest";
import { LLMError } from "../utils/errors.js";
import { ClaudeProvider } from "./claude-provider.js";

const mockCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class {
      messages = {
        create: mockCreate,
      };
    },
  };
});

describe("ClaudeProvider", () => {
  let provider: ClaudeProvider;

  beforeEach(() => {
    vi.clearAllMocks();

    provider = new ClaudeProvider({
      apiKey: "test-api-key",
      model: "claude-3-5-sonnet-20241022",
    });
  });

  describe("constructor", () => {
    it("should initialize with correct defaults", () => {
      expect(provider.name).toBe("claude");
      expect(provider.capabilities.streaming).toBe(true);
      expect(provider.capabilities.functionCalling).toBe(true);
      expect(provider.capabilities.thinking).toBe(true);
    });

    it("should use custom model if provided", () => {
      const customProvider = new ClaudeProvider({
        apiKey: "test-key",
        model: "claude-3-opus-20240229",
      });
      expect(customProvider).toBeDefined();
    });
  });

  describe("generateContent", () => {
    it("should generate content successfully", async () => {
      const mockResponse = {
        id: "msg_123",
        type: "message",
        role: "assistant",
        content: [
          {
            type: "text",
            text: "Hello, I am an AI assistant.",
          },
        ],
        model: "claude-3-5-sonnet-20241022",
        stop_reason: "end_turn",
        usage: {
          input_tokens: 10,
          output_tokens: 20,
        },
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await provider.generateContent({
        messages: [{ role: "user", content: "Hello" }],
      });

      expect(result.text).toBe("Hello, I am an AI assistant.");
      expect(result.functionCalls).toEqual([]);
      expect(result.finishReason).toBe("end_turn");
      expect(result.usage.totalTokens).toBe(30);
    });

    it("should handle function responses with tool_result", async () => {
      const mockResponse = {
        id: "msg_123",
        type: "message",
        role: "assistant",
        content: [
          {
            type: "text",
            text: "The weather is sunny.",
          },
        ],
        model: "claude-3-5-sonnet-20241022",
        stop_reason: "end_turn",
        usage: {
          input_tokens: 15,
          output_tokens: 10,
        },
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await provider.generateContent({
        messages: [
          { role: "user", content: "What's the weather?" },
          {
            role: "assistant",
            content: "",
            functionCall: {
              id: "call_1",
              name: "get_weather",
              params: { city: "Tokyo" },
            },
          },
          {
            role: "user",
            content: "",
            functionResponse: {
              id: "call_1",
              name: "get_weather",
              result: { temperature: 25, condition: "sunny" },
            },
          },
        ],
      });

      expect(mockCreate).toHaveBeenCalled();
      const callArgs = mockCreate.mock.calls[0][0];
      const messages = callArgs.messages;

      const toolResultMessage = messages.find(
        (m: any) =>
          Array.isArray(m.content) &&
          m.content.some((c: any) => c.type === "tool_result"),
      );
      expect(toolResultMessage).toBeDefined();

      expect(result.text).toBe("The weather is sunny.");
    });

    it("should handle tool calls in response", async () => {
      const mockResponse = {
        id: "msg_123",
        type: "message",
        role: "assistant",
        content: [
          {
            type: "tool_use",
            id: "toolu_123",
            name: "get_weather",
            input: { city: "Tokyo" },
          },
        ],
        model: "claude-3-5-sonnet-20241022",
        stop_reason: "tool_use",
        usage: {
          input_tokens: 10,
          output_tokens: 20,
        },
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await provider.generateContent({
        messages: [{ role: "user", content: "What's the weather in Tokyo?" }],
      });

      expect(result.functionCalls).toHaveLength(1);
      expect(result.functionCalls[0].name).toBe("get_weather");
      expect(result.functionCalls[0].params).toEqual({ city: "Tokyo" });
    });

    it("should convert tool parameters correctly", async () => {
      const mockResponse = {
        id: "msg_123",
        type: "message",
        role: "assistant",
        content: [
          {
            type: "text",
            text: "Response",
          },
        ],
        model: "claude-3-5-sonnet-20241022",
        stop_reason: "end_turn",
        usage: {
          input_tokens: 10,
          output_tokens: 5,
        },
      };

      mockCreate.mockResolvedValue(mockResponse);

      const toolParameters = {
        type: "object",
        properties: {
          city: { type: "string", description: "City name" },
          units: { type: "string", enum: ["celsius", "fahrenheit"] },
        },
        required: ["city"],
      };

      await provider.generateContent({
        messages: [{ role: "user", content: "Weather?" }],
        tools: [
          {
            name: "get_weather",
            description: "Get weather for a city",
            parameters: toolParameters,
          },
        ],
      });

      expect(mockCreate).toHaveBeenCalled();
      const callArgs = mockCreate.mock.calls[0][0];
      const tools = callArgs.tools;

      expect(tools).toBeDefined();
      expect(tools[0]).toEqual({
        name: "get_weather",
        description: "Get weather for a city",
        input_schema: toolParameters,
      });
    });

    it("should handle system instructions", async () => {
      const mockResponse = {
        id: "msg_123",
        type: "message",
        role: "assistant",
        content: [
          {
            type: "text",
            text: "Response",
          },
        ],
        model: "claude-3-5-sonnet-20241022",
        stop_reason: "end_turn",
        usage: {
          input_tokens: 10,
          output_tokens: 20,
        },
      };

      mockCreate.mockResolvedValue(mockResponse);

      await provider.generateContent({
        messages: [
          { role: "system", content: "You are a helpful assistant" },
          { role: "user", content: "Hello" },
        ],
      });

      expect(mockCreate).toHaveBeenCalled();
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.system).toBe("You are a helpful assistant");
    });

    it("should throw LLMError on API error", async () => {
      vi.useFakeTimers();
      mockCreate.mockRejectedValue({
        status: 401,
        message: "Invalid API key",
      });

      const promise = expect(
        provider.generateContent({
          messages: [{ role: "user", content: "Hello" }],
        }),
      ).rejects.toThrow(LLMError);

      await vi.runAllTimersAsync();
      await promise;

      vi.useRealTimers();
    });
  });

  describe("generateStream", () => {
    it("should stream content chunks", async () => {
      async function* mockStreamGenerator() {
        yield {
          type: "message_start",
          message: {
            id: "msg_123",
            type: "message",
            role: "assistant",
            content: [],
            model: "claude-3-5-sonnet-20241022",
            usage: {
              input_tokens: 10,
              output_tokens: 0,
            },
          },
        };
        yield {
          type: "content_block_start",
          index: 0,
          content_block: {
            type: "text",
            text: "",
          },
        };
        yield {
          type: "content_block_delta",
          index: 0,
          delta: {
            type: "text_delta",
            text: "Hello",
          },
        };
        yield {
          type: "content_block_delta",
          index: 0,
          delta: {
            type: "text_delta",
            text: " World",
          },
        };
        yield {
          type: "content_block_delta",
          index: 0,
          delta: {
            type: "text_delta",
            text: "!",
          },
        };
        yield {
          type: "content_block_stop",
          index: 0,
          content_block: {
            type: "text",
            text: "Hello World!",
          },
        };
        yield {
          type: "message_delta",
          delta: {
            stop_reason: "end_turn",
          },
          usage: {
            output_tokens: 5,
          },
        };
        yield {
          type: "message_stop",
        };
      }

      mockCreate.mockResolvedValue(mockStreamGenerator());

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

    it("should handle tool calls in stream", async () => {
      async function* mockStreamGenerator() {
        yield {
          type: "message_start",
          message: {
            id: "msg_123",
            type: "message",
            role: "assistant",
            content: [],
            model: "claude-3-5-sonnet-20241022",
            usage: {
              input_tokens: 10,
              output_tokens: 0,
            },
          },
        };
        yield {
          type: "content_block_start",
          index: 0,
          content_block: {
            type: "tool_use",
            id: "toolu_123",
            name: "test_fn",
            input: {},
          },
        };
        yield {
          type: "content_block_delta",
          index: 0,
          delta: {
            type: "input_json_delta",
            partial_json: '{"key":',
          },
        };
        yield {
          type: "content_block_delta",
          index: 0,
          delta: {
            type: "input_json_delta",
            partial_json: '"value"}',
          },
        };
        yield {
          type: "content_block_stop",
          index: 0,
          content_block: {
            type: "tool_use",
            id: "toolu_123",
            name: "test_fn",
            input: { key: "value" },
          },
        };
        yield {
          type: "message_delta",
          delta: {
            stop_reason: "tool_use",
          },
          usage: {
            output_tokens: 5,
          },
        };
        yield {
          type: "message_stop",
        };
      }

      mockCreate.mockResolvedValue(mockStreamGenerator());

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
      expect(functionCalls[0].params).toEqual({ key: "value" });
    });

    it("should throw LLMError on stream error", async () => {
      mockCreate.mockRejectedValue({
        status: 429,
        message: "Rate limit exceeded",
      });

      const generator = provider.generateStream({
        messages: [{ role: "user", content: "Hello" }],
      });

      await expect(generator.next()).rejects.toThrow(LLMError);
    });
  });

  describe("countTokens", () => {
    it("should count tokens correctly", async () => {
      mockCreate.mockResolvedValue({
        id: "msg_123",
        type: "message",
        role: "assistant",
        content: [
          {
            type: "text",
            text: "x",
          },
        ],
        model: "claude-3-5-sonnet-20241022",
        stop_reason: "end_turn",
        usage: {
          input_tokens: 150,
          output_tokens: 1,
        },
      });

      const result = await provider.countTokens([
        { role: "user", content: "Hello" },
      ]);

      expect(result.promptTokens).toBe(150);
      expect(result.completionTokens).toBe(1);
      expect(result.totalTokens).toBe(151);
    });

    it("should handle system messages", async () => {
      mockCreate.mockResolvedValue({
        id: "msg_123",
        type: "message",
        role: "assistant",
        content: [
          {
            type: "text",
            text: "x",
          },
        ],
        model: "claude-3-5-sonnet-20241022",
        stop_reason: "end_turn",
        usage: {
          input_tokens: 200,
          output_tokens: 1,
        },
      });

      await provider.countTokens([
        { role: "system", content: "You are helpful" },
        { role: "user", content: "Hello" },
      ]);

      expect(mockCreate).toHaveBeenCalled();
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.system).toBe("You are helpful");
    });

    it("should throw on API error", async () => {
      mockCreate.mockRejectedValue({
        status: 408,
        message: "Request timeout",
      });

      await expect(
        provider.countTokens([{ role: "user", content: "Hello" }]),
      ).rejects.toThrow(LLMError);
    });

    it("should estimate tokens when usage is missing", async () => {
      mockCreate.mockResolvedValue({
        id: "msg_123",
        type: "message",
        role: "assistant",
        content: [
          {
            type: "text",
            text: "x",
          },
        ],
        model: "claude-3-5-sonnet-20241022",
        stop_reason: "end_turn",
      });

      const result = await provider.countTokens([
        { role: "user", content: "Hello World" },
      ]);

      expect(result.totalTokens).toBeGreaterThan(0);
    });
  });

  describe("error handling", () => {
    it("should handle 401 auth error", async () => {
      vi.useFakeTimers();
      mockCreate.mockRejectedValue({
        status: 401,
        message: "Invalid API key",
      });

      const promise = expect(
        provider.generateContent({
          messages: [{ role: "user", content: "Hello" }],
        }),
      ).rejects.toThrow(expect.objectContaining({ code: "LLM_AUTH_ERROR" }));

      await vi.runAllTimersAsync();
      await promise;

      vi.useRealTimers();
    });

    it("should handle 429 rate limit error", async () => {
      vi.useFakeTimers();
      mockCreate.mockRejectedValue({
        status: 429,
        message: "Rate limit exceeded",
      });

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

    it("should handle 504 timeout error", async () => {
      vi.useFakeTimers();
      mockCreate.mockRejectedValue({
        status: 504,
        message: "Gateway timeout",
      });

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
