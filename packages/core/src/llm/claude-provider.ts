import Anthropic from "@anthropic-ai/sdk";
import type {
  MessageCreateParams,
  MessageParam,
  Tool,
} from "@anthropic-ai/sdk/resources/messages";
import { ErrorCode, LLMError } from "../utils/errors.js";
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

export interface ClaudeConfig {
  apiKey: string;
  model?: string;
}

export class ClaudeProvider extends BaseLLMProvider {
  readonly name = "claude";
  readonly capabilities: LLMCapabilities = {
    streaming: true,
    functionCalling: true,
    thinking: true,
  };

  private client: Anthropic;
  private modelName: string;

  constructor(config: ClaudeConfig) {
    super(config.apiKey, "");
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.modelName = config.model || "claude-sonnet-4-5";
  }

  protected async doGenerateContent(request: LLMRequest): Promise<LLMResponse> {
    try {
      const systemPrompt = this.extractSystemPrompt(request.messages);
      const messages = this.toClaudeMessages(
        request.messages.filter((m) => m.role !== "system"),
      );

      const tools = request.tools
        ? this.convertToClaudeTools(request.tools)
        : undefined;

      const params: MessageCreateParams = {
        model: this.modelName,
        messages,
        max_tokens: request.maxTokens || 4096,
        temperature: request.temperature,
        top_p: request.topP,
      };

      if (systemPrompt) {
        params.system = systemPrompt;
      }

      if (tools && tools.length > 0) {
        params.tools = tools;
      }

      const response = await this.client.messages.create(params);

      return this.fromClaudeResult(response);
    } catch (error) {
      throw this.handleClaudeError(error);
    }
  }

  protected async *doGenerateStream(
    request: LLMRequest,
  ): AsyncGenerator<StreamChunk> {
    try {
      const systemPrompt = this.extractSystemPrompt(request.messages);
      const messages = this.toClaudeMessages(
        request.messages.filter((m) => m.role !== "system"),
      );

      const tools = request.tools
        ? this.convertToClaudeTools(request.tools)
        : undefined;

      const params: MessageCreateParams = {
        model: this.modelName,
        messages,
        max_tokens: request.maxTokens || 4096,
        temperature: request.temperature,
        top_p: request.topP,
        stream: true,
      };

      if (systemPrompt) {
        params.system = systemPrompt;
      }

      if (tools && tools.length > 0) {
        params.tools = tools;
      }

      const stream = await this.client.messages.create(params);

      let _accumulatedText = "";
      const usage: TokenCount = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      };

      // Track tool use blocks by index
      interface ToolUseBlock {
        id: string;
        name: string;
        input: string;
      }
      const toolUseBlocks = new Map<number, ToolUseBlock>();

      for await (const event of stream) {
        if (event.type === "content_block_start") {
          const block = event.content_block;
          if (block.type === "tool_use") {
            toolUseBlocks.set(event.index, {
              id: block.id,
              name: block.name,
              input: "",
            });
          }
        } else if (event.type === "content_block_delta") {
          const delta = event.delta;
          if (delta.type === "text_delta") {
            const text = delta.text;
            _accumulatedText += text;
            yield { type: "content", delta: text };
          } else if (delta.type === "input_json_delta") {
            // Accumulate tool input JSON
            const toolUse = toolUseBlocks.get(event.index);
            if (toolUse) {
              toolUse.input += delta.partial_json;
            }
          }
        } else if (event.type === "content_block_stop") {
          // Check if this is a tool use block
          const toolUse = toolUseBlocks.get(event.index);
          if (toolUse) {
            const call: FunctionCall = {
              id: toolUse.id,
              name: toolUse.name,
              params: JSON.parse(toolUse.input || "{}") as Record<
                string,
                unknown
              >,
            };
            yield { type: "function_call", call };
            toolUseBlocks.delete(event.index);
          }
        } else if (event.type === "message_delta") {
          if (event.usage) {
            usage.completionTokens = event.usage.output_tokens || 0;
          }
        } else if (event.type === "message_start") {
          const message = event.message;
          if (message.usage) {
            usage.promptTokens = message.usage.input_tokens || 0;
          }
        } else if (event.type === "message_stop") {
          usage.totalTokens = usage.promptTokens + usage.completionTokens;
          yield {
            type: "done",
            finishReason: "stop",
            usage,
          };
        }
      }
    } catch (error) {
      throw this.handleClaudeError(error);
    }
  }

  protected async doCountTokens(
    messages: UnifiedMessage[],
  ): Promise<TokenCount> {
    try {
      const systemPrompt = this.extractSystemPrompt(messages);
      const claudeMessages = this.toClaudeMessages(
        messages.filter((m) => m.role !== "system"),
      );

      // Claude doesn't have a direct token counting API
      // We'll make a request with max_tokens=1 to get the prompt token count
      const params: MessageCreateParams = {
        model: this.modelName,
        messages: claudeMessages,
        max_tokens: 1,
      };

      if (systemPrompt) {
        params.system = systemPrompt;
      }

      const response = await this.client.messages.create(params);

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
        promptTokens: usage.input_tokens || 0,
        completionTokens: usage.output_tokens || 0,
        totalTokens: (usage.input_tokens || 0) + (usage.output_tokens || 0),
      };
    } catch (error) {
      throw this.handleClaudeError(error);
    }
  }

  private extractSystemPrompt(messages: UnifiedMessage[]): string {
    return messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n");
  }

  private toClaudeMessages(messages: UnifiedMessage[]): MessageParam[] {
    const result: MessageParam[] = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];

      if (msg.role === "user") {
        if (msg.functionResponse) {
          // Function response becomes a tool_result message
          result.push({
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: msg.functionResponse.id,
                content: JSON.stringify(msg.functionResponse.result),
              },
            ],
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
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: msg.functionResponse.id,
                content: JSON.stringify(msg.functionResponse.result),
              },
            ],
          });
        }
      } else if (msg.role === "assistant") {
        if (msg.functionCall) {
          // Collect all consecutive assistant messages with function calls
          const toolUses: any[] = [];
          let j = i;
          const contentBeforeCalls = msg.content || "";

          while (
            j < messages.length &&
            messages[j].role === "assistant" &&
            messages[j].functionCall
          ) {
            toolUses.push({
              type: "tool_use",
              id: messages[j].functionCall!.id,
              name: messages[j].functionCall!.name,
              input: messages[j].functionCall!.params,
            });
            j++;
          }

          const content: any[] = [];
          if (contentBeforeCalls) {
            content.push({
              type: "text",
              text: contentBeforeCalls,
            });
          }
          content.push(...toolUses);

          result.push({
            role: "assistant",
            content,
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

  private convertToClaudeTools(tools: LLMRequest["tools"]): Tool[] | undefined {
    if (!tools || tools.length === 0) return undefined;

    return tools.map(
      (tool) =>
        ({
          name: tool.name,
          description: tool.description,
          input_schema: tool.parameters as any,
        }) as Tool,
    );
  }

  private fromClaudeResult(response: Anthropic.Message): LLMResponse {
    let text = "";
    const functionCalls: FunctionCall[] = [];

    for (const block of response.content) {
      if (block.type === "text") {
        text += block.text;
      } else if (block.type === "tool_use") {
        functionCalls.push({
          id: block.id,
          name: block.name,
          params: (block.input as Record<string, unknown>) || {},
        });
      }
    }

    const usage: TokenCount = {
      promptTokens: response.usage.input_tokens || 0,
      completionTokens: response.usage.output_tokens || 0,
      totalTokens:
        (response.usage.input_tokens || 0) +
        (response.usage.output_tokens || 0),
    };

    return {
      text,
      functionCalls,
      finishReason: response.stop_reason || "end_turn",
      usage,
    };
  }

  private handleClaudeError(error: unknown): LLMError {
    if (error instanceof LLMError) {
      return error;
    }

    // Handle Anthropic SDK errors
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
