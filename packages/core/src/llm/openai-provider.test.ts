import { beforeEach, describe, expect, it, vi } from "vitest";
import { LLMError } from "../utils/errors.js";
import { OpenAIProvider } from "./openai-provider.js";

const mockCreate = vi.fn();

vi.mock("openai", () => {
  return {
    default: class {
      chat = {
        completions: {
          create: mockCreate,
        },
      };
    },
  };
});

describe("OpenAIProvider", () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    vi.clearAllMocks();

    provider = new OpenAIProvider({
      apiKey: "test-api-key",
      model: "gpt-4o",
    });
  });

  describe("constructor", () => {
    it("should initialize with correct defaults", () => {
      expect(provider.name).toBe("openai");
      expect(provider.capabilities.streaming).toBe(true);
      expect(provider.capabilities.functionCalling).toBe(true);
      expect(provider.capabilities.thinking).toBe(false);
    });

    it("should use custom model if provided", () => {
      const customProvider = new OpenAIProvider({
        apiKey: "test-key",
        model: "gpt-4-turbo",
      });
      expect(customProvider).toBeDefined();
    });

    it("should set capabilities for o1 models", () => {
      const o1Provider = new OpenAIProvider({
        apiKey: "test-key",
        model: "o1-preview",
      });
      expect(o1Provider.capabilities.streaming).toBe(false);
      expect(o1Provider.capabilities.functionCalling).toBe(false);
      expect(o1Provider.capabilities.thinking).toBe(true);
    });
  });

  describe("generateContent", () => {
    it("should generate content successfully", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              role: "assistant",
              content: "Hello, I am an AI assistant.",
            },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await provider.generateContent({
        messages: [{ role: "user", content: "Hello" }],
      });

      expect(result.text).toBe("Hello, I am an AI assistant.");
      expect(result.functionCalls).toEqual([]);
      expect(result.finishReason).toBe("stop");
      expect(result.usage.totalTokens).toBe(30);
    });

    it("should handle function responses with tool messages", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              role: "assistant",
              content: "The weather is sunny.",
            },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 15,
          completion_tokens: 10,
          total_tokens: 25,
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

      const toolMessage = messages.find((m: any) => m.role === "tool");
      expect(toolMessage).toBeDefined();
      expect(toolMessage.tool_call_id).toBe("call_1");
      expect(JSON.parse(toolMessage.content)).toEqual({
        temperature: 25,
        condition: "sunny",
      });

      expect(result.text).toBe("The weather is sunny.");
    });

    it("should filter out messages with no content or tool calls", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              role: "assistant",
              content: "Response",
            },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      };

      mockCreate.mockResolvedValue(mockResponse);

      await provider.generateContent({
        messages: [
          { role: "user", content: "Hello" },
          { role: "assistant", content: "" },
          { role: "user", content: "Are you there?" },
        ],
      });

      expect(mockCreate).toHaveBeenCalled();
      const callArgs = mockCreate.mock.calls[0][0];
      const messages = callArgs.messages;

      expect(messages.length).toBe(2);
      expect(messages.every((m: any) => m.content)).toBe(true);
    });

    it("should handle tool calls in response", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: "call_abc123",
                  type: "function",
                  function: {
                    name: "get_weather",
                    arguments: '{"city":"Tokyo"}',
                  },
                },
              ],
            },
            finish_reason: "tool_calls",
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await provider.generateContent({
        messages: [{ role: "user", content: "What's the weather in Tokyo?" }],
        tools: [
          {
            name: "get_weather",
            description: "Get weather for a city",
            parameters: {
              type: "object",
              properties: {
                city: { type: "string" },
              },
              required: ["city"],
            },
          },
        ],
      });

      expect(result.functionCalls).toHaveLength(1);
      expect(result.functionCalls[0].name).toBe("get_weather");
      expect(result.functionCalls[0].params).toEqual({ city: "Tokyo" });
    });

    it("should convert tool parameters correctly", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              role: "assistant",
              content: "Response",
            },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
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
        type: "function",
        function: {
          name: "get_weather",
          description: "Get weather for a city",
          parameters: toolParameters,
        },
      });
    });

    it("should handle system messages", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              role: "assistant",
              content: "Response",
            },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
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
      const messages = callArgs.messages;

      expect(messages[0].role).toBe("system");
      expect(messages[0].content).toBe("You are a helpful assistant");
    });

    it("should throw LLMError on API error", async () => {
      vi.useFakeTimers();
      const error = new Error("Invalid API key") as any;
      error.status = 401;
      mockCreate.mockRejectedValue(error);

      const promise = expect(
        provider.generateContent({
          messages: [{ role: "user", content: "Hello" }],
        }),
      ).rejects.toThrow(LLMError);

      await vi.runAllTimersAsync();
      await promise;

      vi.useRealTimers();
    });

    it("should throw on missing choice message", async () => {
      mockCreate.mockResolvedValue({
        choices: [{}],
      });

      await expect(
        provider.generateContent({
          messages: [{ role: "user", content: "Hello" }],
        }),
      ).rejects.toThrow(LLMError);
    });

    it("should handle invalid tool arguments", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: "call_abc123",
                  type: "function",
                  function: {
                    name: "get_weather",
                    arguments: "invalid json",
                  },
                },
              ],
            },
            finish_reason: "tool_calls",
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };

      mockCreate.mockResolvedValue(mockResponse);

      const result = await provider.generateContent({
        messages: [{ role: "user", content: "Test" }],
      });

      expect(result.functionCalls).toHaveLength(1);
      expect(result.functionCalls[0].params).toEqual({});
    });

    it("should merge consecutive assistant messages with function calls", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              role: "assistant",
              content: "Done",
            },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 20,
          completion_tokens: 5,
          total_tokens: 25,
        },
      };

      mockCreate.mockResolvedValue(mockResponse);

      await provider.generateContent({
        messages: [
          { role: "user", content: "Calculate 5+3 and 10*2" },
          { role: "assistant", content: "I'll calculate both" },
          {
            role: "assistant",
            content: "",
            functionCall: {
              id: "call_1",
              name: "calculator",
              params: { operation: "add", a: 5, b: 3 },
            },
          },
          {
            role: "assistant",
            content: "",
            functionCall: {
              id: "call_2",
              name: "calculator",
              params: { operation: "multiply", a: 10, b: 2 },
            },
          },
          {
            role: "function",
            content: "8",
            functionResponse: {
              id: "call_1",
              name: "calculator",
              result: { value: 8 },
            },
          },
          {
            role: "function",
            content: "20",
            functionResponse: {
              id: "call_2",
              name: "calculator",
              result: { value: 20 },
            },
          },
        ],
      });

      expect(mockCreate).toHaveBeenCalled();
      const callArgs = mockCreate.mock.calls[0][0];
      const messages = callArgs.messages;

      // Should merge: 1 user + 1 assistant with tool_calls + 2 tool responses
      expect(messages.length).toBe(4);

      // Check merged assistant message
      const assistantMsg = messages.find((m: any) => m.role === "assistant");
      expect(assistantMsg).toBeDefined();
      expect(assistantMsg.content).toBe("I'll calculate both");
      expect(assistantMsg.tool_calls).toHaveLength(2);
      expect(assistantMsg.tool_calls[0].function.name).toBe("calculator");
      expect(assistantMsg.tool_calls[1].function.name).toBe("calculator");

      // Check tool responses
      const toolMessages = messages.filter((m: any) => m.role === "tool");
      expect(toolMessages).toHaveLength(2);
      expect(toolMessages[0].tool_call_id).toBe("call_1");
      expect(toolMessages[1].tool_call_id).toBe("call_2");
    });

    it("should handle function role messages", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              role: "assistant",
              content: "The result is 42",
            },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 15,
          completion_tokens: 10,
          total_tokens: 25,
        },
      };

      mockCreate.mockResolvedValue(mockResponse);

      await provider.generateContent({
        messages: [
          { role: "user", content: "Calculate something" },
          {
            role: "assistant",
            content: "",
            functionCall: {
              id: "call_1",
              name: "calculator",
              params: { x: 42 },
            },
          },
          {
            role: "function",
            content: JSON.stringify({ result: 42 }),
            functionResponse: {
              id: "call_1",
              name: "calculator",
              result: { result: 42 },
            },
          },
        ],
      });

      expect(mockCreate).toHaveBeenCalled();
      const callArgs = mockCreate.mock.calls[0][0];
      const messages = callArgs.messages;

      // Check that function role is converted to tool role
      const toolMessage = messages.find((m: any) => m.role === "tool");
      expect(toolMessage).toBeDefined();
      expect(toolMessage.tool_call_id).toBe("call_1");
      expect(JSON.parse(toolMessage.content)).toEqual({ result: 42 });
    });

    it("should handle assistant message with only function call (no prior content)", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              role: "assistant",
              content: "Result received",
            },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 15,
          completion_tokens: 10,
          total_tokens: 25,
        },
      };

      mockCreate.mockResolvedValue(mockResponse);

      await provider.generateContent({
        messages: [
          { role: "user", content: "What's 2+2?" },
          {
            role: "assistant",
            content: "",
            functionCall: {
              id: "call_1",
              name: "calculator",
              params: { operation: "add", a: 2, b: 2 },
            },
          },
          {
            role: "function",
            content: "4",
            functionResponse: {
              id: "call_1",
              name: "calculator",
              result: { value: 4 },
            },
          },
        ],
      });

      expect(mockCreate).toHaveBeenCalled();
      const callArgs = mockCreate.mock.calls[0][0];
      const messages = callArgs.messages;

      const assistantMsg = messages.find((m: any) => m.role === "assistant");
      expect(assistantMsg).toBeDefined();
      expect(assistantMsg.content).toBe(null); // Should be null when no content
      expect(assistantMsg.tool_calls).toHaveLength(1);
    });

    it("should not merge non-consecutive assistant messages with function calls", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              role: "assistant",
              content: "Done",
            },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 20,
          completion_tokens: 5,
          total_tokens: 25,
        },
      };

      mockCreate.mockResolvedValue(mockResponse);

      await provider.generateContent({
        messages: [
          { role: "user", content: "First calculation" },
          {
            role: "assistant",
            content: "",
            functionCall: {
              id: "call_1",
              name: "calculator",
              params: { x: 1 },
            },
          },
          {
            role: "function",
            content: "1",
            functionResponse: {
              id: "call_1",
              name: "calculator",
              result: { value: 1 },
            },
          },
          { role: "user", content: "Second calculation" },
          {
            role: "assistant",
            content: "",
            functionCall: {
              id: "call_2",
              name: "calculator",
              params: { x: 2 },
            },
          },
          {
            role: "function",
            content: "2",
            functionResponse: {
              id: "call_2",
              name: "calculator",
              result: { value: 2 },
            },
          },
        ],
      });

      expect(mockCreate).toHaveBeenCalled();
      const callArgs = mockCreate.mock.calls[0][0];
      const messages = callArgs.messages;

      // Should have 2 separate assistant messages (they're separated by user/tool messages)
      const assistantMessages = messages.filter(
        (m: any) => m.role === "assistant",
      );
      expect(assistantMessages).toHaveLength(2);
      expect(assistantMessages[0].tool_calls).toHaveLength(1);
      expect(assistantMessages[1].tool_calls).toHaveLength(1);
    });
  });

  describe("generateStream", () => {
    it("should stream content chunks", async () => {
      async function* mockStreamGenerator() {
        yield {
          choices: [
            {
              delta: {
                content: "Hello",
              },
            },
          ],
        };
        yield {
          choices: [
            {
              delta: {
                content: " World",
              },
            },
          ],
        };
        yield {
          choices: [
            {
              delta: {
                content: "!",
              },
              finish_reason: "stop",
            },
          ],
          usage: {
            total_tokens: 10,
            prompt_tokens: 5,
            completion_tokens: 5,
          },
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
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    id: "call_abc",
                    type: "function",
                    function: {
                      name: "test_fn",
                      arguments: "",
                    },
                  },
                ],
              },
            },
          ],
        };
        yield {
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    function: {
                      arguments: '{"key":',
                    },
                  },
                ],
              },
            },
          ],
        };
        yield {
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    function: {
                      arguments: '"value"}',
                    },
                  },
                ],
              },
              finish_reason: "tool_calls",
            },
          ],
          usage: {
            total_tokens: 10,
            prompt_tokens: 5,
            completion_tokens: 5,
          },
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

    it("should handle multiple tool calls in stream", async () => {
      async function* mockStreamGenerator() {
        yield {
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    index: 0,
                    id: "call_1",
                    type: "function",
                    function: {
                      name: "fn1",
                      arguments: '{"a":1}',
                    },
                  },
                ],
              },
            },
          ],
        };
        yield {
          choices: [
            {
              delta: {
                tool_calls: [
                  {
                    index: 1,
                    id: "call_2",
                    type: "function",
                    function: {
                      name: "fn2",
                      arguments: '{"b":2}',
                    },
                  },
                ],
              },
              finish_reason: "tool_calls",
            },
          ],
          usage: {
            total_tokens: 10,
            prompt_tokens: 5,
            completion_tokens: 5,
          },
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

      expect(functionCalls).toHaveLength(2);
      expect(functionCalls[0].name).toBe("fn1");
      expect(functionCalls[1].name).toBe("fn2");
    });

    it("should throw LLMError on stream error", async () => {
      const error = new Error("Rate limit exceeded") as any;
      error.status = 429;
      mockCreate.mockRejectedValue(error);

      const generator = provider.generateStream({
        messages: [{ role: "user", content: "Hello" }],
      });

      await expect(generator.next()).rejects.toThrow(LLMError);
    });

    it("should handle empty choices gracefully", async () => {
      async function* mockStreamGenerator() {
        yield {
          choices: [],
        };
        yield {
          choices: [
            {
              delta: {
                content: "Hello",
              },
              finish_reason: "stop",
            },
          ],
          usage: {
            total_tokens: 10,
            prompt_tokens: 5,
            completion_tokens: 5,
          },
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

      expect(chunks).toEqual(["Hello"]);
    });
  });

  describe("countTokens", () => {
    it("should count tokens correctly", async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              role: "assistant",
              content: "x",
            },
            finish_reason: "length",
          },
        ],
        usage: {
          prompt_tokens: 150,
          completion_tokens: 1,
          total_tokens: 151,
        },
      });

      const result = await provider.countTokens([
        { role: "user", content: "Hello" },
      ]);

      expect(result.promptTokens).toBe(150);
      expect(result.totalTokens).toBe(151);
    });

    it("should handle system messages", async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              role: "assistant",
              content: "x",
            },
            finish_reason: "length",
          },
        ],
        usage: {
          prompt_tokens: 200,
          completion_tokens: 1,
          total_tokens: 201,
        },
      });

      await provider.countTokens([
        { role: "system", content: "You are helpful" },
        { role: "user", content: "Hello" },
      ]);

      expect(mockCreate).toHaveBeenCalled();
    });

    it("should throw on API error", async () => {
      const error = new Error("Request timeout") as any;
      error.status = 504;
      mockCreate.mockRejectedValue(error);

      await expect(
        provider.countTokens([{ role: "user", content: "Hello" }]),
      ).rejects.toThrow(LLMError);
    });

    it("should handle missing usage with estimation", async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              role: "assistant",
              content: "x",
            },
            finish_reason: "length",
          },
        ],
      });

      const result = await provider.countTokens([
        { role: "user", content: "Hello" },
      ]);

      expect(result.totalTokens).toBeGreaterThan(0);
      expect(result.promptTokens).toBeGreaterThan(0);
    });
  });

  describe("error handling", () => {
    it("should handle 401 authentication error", async () => {
      vi.useFakeTimers();
      const error = new Error("Invalid API key") as any;
      error.status = 401;
      mockCreate.mockRejectedValue(error);

      const promise = expect(
        provider.generateContent({
          messages: [{ role: "user", content: "Hello" }],
        }),
      ).rejects.toThrow(expect.objectContaining({ code: "LLM_AUTH_ERROR" }));

      await vi.runAllTimersAsync();
      await promise;

      vi.useRealTimers();
    });

    it("should handle 403 authentication error", async () => {
      vi.useFakeTimers();
      const error = new Error("Permission denied") as any;
      error.status = 403;
      mockCreate.mockRejectedValue(error);

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
      const error = new Error("Rate limit exceeded") as any;
      error.status = 429;
      mockCreate.mockRejectedValue(error);

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
      const error = new Error("Gateway timeout") as any;
      error.status = 504;
      mockCreate.mockRejectedValue(error);

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

    it("should handle 408 timeout error", async () => {
      vi.useFakeTimers();
      const error = new Error("Request timeout") as any;
      error.status = 408;
      mockCreate.mockRejectedValue(error);

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

    it("should handle generic errors", async () => {
      vi.useFakeTimers();
      const error = new Error("Something went wrong") as any;
      error.status = 500;
      mockCreate.mockRejectedValue(error);

      const promise = expect(
        provider.generateContent({
          messages: [{ role: "user", content: "Hello" }],
        }),
      ).rejects.toThrow(expect.objectContaining({ code: "LLM_API_ERROR" }));

      await vi.runAllTimersAsync();
      await promise;

      vi.useRealTimers();
    });
  });
});
