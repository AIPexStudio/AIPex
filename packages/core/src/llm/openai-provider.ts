import OpenAI from "openai";
import type {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import { ErrorCode, LLMError } from "../utils/errors.js";
import { generateId } from "../utils/id-generator.js";
import { BaseLLMProvider } from "./base-provider.js";
import type {
  FunctionCall,
  LLMCapabilities,
  LLMRequest,
  LLMResponse,
  StreamChunk,
  TokenCount,
  UnifiedMessage,
} from "./types.js";

export interface OpenAIConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export class OpenAIProvider extends BaseLLMProvider {
  readonly name = "openai";
  readonly capabilities: LLMCapabilities;

  private client: OpenAI;
  private modelName: string;

  constructor(config: OpenAIConfig) {
    super(config.apiKey, config.baseUrl);
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
    this.modelName = config.model || "gpt-5";
    this.capabilities = this.getCapabilitiesForModel(this.modelName);
  }

  private getCapabilitiesForModel(model: string): LLMCapabilities {
    const isO1Series = model.startsWith("o1-") || model.startsWith("o1");

    if (isO1Series) {
      return {
        streaming: false,
        functionCalling: false,
        thinking: true,
      };
    }

    return {
      streaming: true,
      functionCalling: true,
      thinking: false,
    };
  }

  protected async doGenerateContent(request: LLMRequest): Promise<LLMResponse> {
    try {
      const messages = this.toOpenAIMessages(request.messages);
      const tools = request.tools
        ? this.convertToOpenAITools(request.tools)
        : undefined;

      const params: ChatCompletionCreateParamsNonStreaming = {
        model: this.modelName,
        messages,
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        top_p: request.topP,
      };

      if (tools && tools.length > 0 && this.capabilities.functionCalling) {
        params.tools = tools;
      }

      const response = await this.client.chat.completions.create(params);

      return this.fromOpenAIResult(response);
    } catch (error) {
      throw this.handleOpenAIError(error);
    }
  }

  protected async *doGenerateStream(
    request: LLMRequest,
  ): AsyncGenerator<StreamChunk> {
    try {
      const messages = this.toOpenAIMessages(request.messages);
      const tools = request.tools
        ? this.convertToOpenAITools(request.tools)
        : undefined;

      const params = {
        model: this.modelName,
        messages,
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        top_p: request.topP,
        stream: true as const,
        tools:
          tools && tools.length > 0 && this.capabilities.functionCalling
            ? tools
            : undefined,
      };

      const stream = await this.client.chat.completions.create(params);

      let _accumulatedText = "";
      interface ToolCallAccumulator {
        id?: string;
        type?: string;
        function?: {
          name: string;
          arguments: string;
        };
      }
      const toolCallsMap = new Map<number, ToolCallAccumulator>();

      for await (const chunk of stream) {
        const choice = chunk.choices?.[0];
        if (!choice) continue;

        const delta = choice.delta;

        // Handle content delta
        if (delta.content) {
          _accumulatedText += delta.content;
          yield { type: "content", delta: delta.content };
        }

        // Handle tool calls delta
        if (delta.tool_calls) {
          for (const toolCallDelta of delta.tool_calls) {
            const index = toolCallDelta.index;
            const existing = toolCallsMap.get(index) || {};

            if (toolCallDelta.id) {
              existing.id = toolCallDelta.id;
            }
            if (toolCallDelta.type) {
              existing.type = toolCallDelta.type;
            }
            if (toolCallDelta.function) {
              if (!existing.function) {
                existing.function = { name: "", arguments: "" };
              }
              if (toolCallDelta.function.name) {
                existing.function.name = toolCallDelta.function.name;
              }
              if (toolCallDelta.function.arguments) {
                existing.function.arguments += toolCallDelta.function.arguments;
              }
            }

            toolCallsMap.set(index, existing);
          }
        }

        // Handle finish reason
        if (choice.finish_reason) {
          // Yield all accumulated tool calls
          for (const toolCall of toolCallsMap.values()) {
            if (toolCall.function?.name) {
              const call: FunctionCall = {
                id: toolCall.id || generateId(),
                name: toolCall.function.name,
                params: this.parseToolArguments(
                  toolCall.function.arguments || "{}",
                ),
              };
              yield { type: "function_call", call };
            }
          }

          const usage = this.extractUsageFromChunk(chunk);
          yield {
            type: "done",
            finishReason: choice.finish_reason,
            usage,
          };
        }
      }
    } catch (error) {
      throw this.handleOpenAIError(error);
    }
  }

  protected async doCountTokens(
    messages: UnifiedMessage[],
  ): Promise<TokenCount> {
    try {
      // OpenAI doesn't have a direct token counting API endpoint
      // We'll make a request with max_tokens=1 to get the prompt token count
      const openaiMessages = this.toOpenAIMessages(messages);

      const response = await this.client.chat.completions.create({
        model: this.modelName,
        messages: openaiMessages,
        max_tokens: 1,
      });

      const usage = response.usage;
      if (!usage) {
        // Fallback estimation: ~4 chars per token
        const totalChars = messages.reduce(
          (sum, msg) => sum + (msg.content?.length || 0),
          0,
        );
        const estimatedTokens = Math.ceil(totalChars / 4);
        return {
          promptTokens: estimatedTokens,
          completionTokens: 0,
          totalTokens: estimatedTokens,
        };
      }

      return {
        promptTokens: usage.prompt_tokens || 0,
        completionTokens: usage.completion_tokens || 0,
        totalTokens: usage.total_tokens || 0,
      };
    } catch (error) {
      throw this.handleOpenAIError(error);
    }
  }

  private toOpenAIMessages(
    messages: UnifiedMessage[],
  ): ChatCompletionMessageParam[] {
    const result: ChatCompletionMessageParam[] = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];

      if (msg.role === "system") {
        result.push({
          role: "system",
          content: msg.content || "",
        });
      } else if (msg.role === "user") {
        if (msg.functionResponse) {
          // Function response becomes a tool message
          result.push({
            role: "tool",
            content: JSON.stringify(msg.functionResponse.result),
            tool_call_id: msg.functionResponse.id,
          });
        } else if (msg.content) {
          result.push({
            role: "user",
            content: msg.content,
          });
        }
      } else if (msg.role === "function") {
        // Handle function role for backwards compatibility
        if (msg.functionResponse) {
          result.push({
            role: "tool",
            content: JSON.stringify(msg.functionResponse.result),
            tool_call_id: msg.functionResponse.id,
          });
        }
      } else if (msg.role === "assistant") {
        // Check if this is the start of a sequence of assistant messages with function calls
        if (msg.functionCall) {
          // Collect all consecutive assistant messages with function calls
          const toolCalls: any[] = [];
          let j = i;
          let contentBeforeCalls = msg.content || null;

          // Look for a preceding assistant message with content but no functionCall
          if (i > 0 && messages[i - 1].role === "assistant" && !messages[i - 1].functionCall && messages[i - 1].content) {
            contentBeforeCalls = messages[i - 1].content;
            // Remove the last added message since we'll merge it
            result.pop();
          }

          while (j < messages.length && messages[j].role === "assistant" && messages[j].functionCall) {
            toolCalls.push({
              id: messages[j].functionCall!.id,
              type: "function" as const,
              function: {
                name: messages[j].functionCall!.name,
                arguments: JSON.stringify(messages[j].functionCall!.params),
              },
            });
            j++;
          }

          result.push({
            role: "assistant",
            content: contentBeforeCalls,
            tool_calls: toolCalls,
          });

          // Skip the messages we just processed
          i = j - 1;
        } else if (msg.content) {
          // Regular assistant message with content only
          result.push({
            role: "assistant",
            content: msg.content,
          });
        }
      }
    }

    return result;
  }

  private convertToOpenAITools(
    tools: LLMRequest["tools"],
  ): ChatCompletionTool[] | undefined {
    if (!tools || tools.length === 0) return undefined;

    return tools.map((tool) => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  private fromOpenAIResult(
    response: OpenAI.Chat.Completions.ChatCompletion,
  ): LLMResponse {
    const choice = response.choices?.[0];
    if (!choice?.message) {
      throw new LLMError(
        "Missing choice message",
        ErrorCode.LLM_INVALID_RESPONSE,
        this.name,
      );
    }

    const message = choice.message;
    const text = message.content || "";
    const functionCalls: FunctionCall[] = [];

    // Handle tool calls
    if (message.tool_calls) {
      for (const toolCall of message.tool_calls) {
        if (toolCall.type === "function") {
          functionCalls.push({
            id: toolCall.id,
            name: toolCall.function.name,
            params: this.parseToolArguments(toolCall.function.arguments),
          });
        }
      }
    }

    const usage = this.extractUsageFromResponse(response);

    return {
      text,
      functionCalls,
      finishReason: choice.finish_reason || "stop",
      usage,
    };
  }

  private parseToolArguments(args: string): Record<string, unknown> {
    try {
      return JSON.parse(args);
    } catch {
      return {};
    }
  }

  private extractUsageFromResponse(
    response: OpenAI.Chat.Completions.ChatCompletion,
  ): TokenCount {
    const usage = response.usage;
    if (!usage) {
      return {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      };
    }

    return {
      promptTokens: usage.prompt_tokens || 0,
      completionTokens: usage.completion_tokens || 0,
      totalTokens: usage.total_tokens || 0,
    };
  }

  private extractUsageFromChunk(
    chunk: OpenAI.Chat.Completions.ChatCompletionChunk,
  ): TokenCount {
    const usage = chunk.usage;
    if (!usage) {
      return {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      };
    }

    return {
      promptTokens: usage.prompt_tokens || 0,
      completionTokens: usage.completion_tokens || 0,
      totalTokens: usage.total_tokens || 0,
    };
  }

  private handleOpenAIError(error: unknown): LLMError {
    if (error instanceof LLMError) {
      return error;
    }

    // Handle OpenAI SDK errors
    if (error && typeof error === "object" && "status" in error) {
      const status = (error as any).status;
      const errorObj = error as any;
      const message =
        errorObj.message ||
        (errorObj instanceof Error ? errorObj.message : String(error));

      if (status === 401 || status === 403) {
        return new LLMError(message, ErrorCode.LLM_AUTH_ERROR, this.name);
      }

      if (status === 429) {
        return new LLMError(
          message,
          ErrorCode.LLM_RATE_LIMIT,
          this.name,
          60000,
        );
      }

      if (status === 408 || status === 504) {
        return new LLMError(message, ErrorCode.LLM_TIMEOUT, this.name, 5000);
      }

      return new LLMError(message, ErrorCode.LLM_API_ERROR, this.name);
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    return new LLMError(errorMessage, ErrorCode.LLM_API_ERROR, this.name);
  }
}
