import {
  type Content,
  type FunctionCallPart,
  type FunctionDeclarationSchema,
  type FunctionResponsePart,
  GoogleGenerativeAI,
  type Part,
  type TextPart,
} from "@google/generative-ai";
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

export interface GeminiConfig {
  apiKey: string;
  model?: string;
}

export class GeminiProvider extends BaseLLMProvider {
  readonly name = "gemini";
  readonly capabilities: LLMCapabilities = {
    streaming: true,
    functionCalling: true,
    thinking: false,
  };

  private client: GoogleGenerativeAI;
  private modelName: string;

  constructor(config: GeminiConfig) {
    super(config.apiKey, "");
    this.client = new GoogleGenerativeAI(config.apiKey);
    this.modelName = config.model || "gemini-2.0-flash-exp";
  }

  protected async doGenerateContent(request: LLMRequest): Promise<LLMResponse> {
    try {
      const model = this.client.getGenerativeModel({
        model: this.modelName,
        systemInstruction: this.extractSystemInstruction(request.messages),
        tools: request.tools
          ? [
              {
                functionDeclarations: request.tools.map((tool) => ({
                  name: tool.name,
                  description: tool.description,
                  parameters:
                    tool.parameters as unknown as FunctionDeclarationSchema,
                })),
              },
            ]
          : undefined,
        generationConfig: {
          temperature: request.temperature,
          maxOutputTokens: request.maxTokens,
          topP: request.topP,
        },
      });

      const contents = this.toGeminiContents(
        request.messages.filter((m) => m.role !== "system"),
      );

      const result = await model.generateContent({ contents });
      return this.fromGeminiResult(result.response);
    } catch (error) {
      throw this.handleGeminiError(error);
    }
  }

  protected async *doGenerateStream(
    request: LLMRequest,
  ): AsyncGenerator<StreamChunk> {
    try {
      const model = this.client.getGenerativeModel({
        model: this.modelName,
        systemInstruction: this.extractSystemInstruction(request.messages),
        tools: request.tools
          ? [
              {
                functionDeclarations: request.tools.map((tool) => ({
                  name: tool.name,
                  description: tool.description,
                  parameters:
                    tool.parameters as unknown as FunctionDeclarationSchema,
                })),
              },
            ]
          : undefined,
        generationConfig: {
          temperature: request.temperature,
          maxOutputTokens: request.maxTokens,
          topP: request.topP,
        },
      });

      const contents = this.toGeminiContents(
        request.messages.filter((m) => m.role !== "system"),
      );

      const result = await model.generateContentStream({ contents });
      let accumulatedText = "";

      for await (const chunk of result.stream) {
        const candidate = chunk.candidates?.[0];
        if (!candidate) continue;

        const content = candidate.content;
        if (!content?.parts) continue;

        for (const part of content.parts) {
          if ("text" in part && part.text) {
            const delta = part.text.slice(accumulatedText.length);
            if (delta) {
              accumulatedText = part.text;
              yield { type: "content", delta };
            }
          }

          if ("functionCall" in part && part.functionCall) {
            const fc = part.functionCall;
            const call: FunctionCall = {
              id: generateId(),
              name: fc.name,
              params: (fc.args as Record<string, unknown>) || {},
            };
            yield { type: "function_call", call };
          }
        }

        if (candidate.finishReason) {
          const response = await result.response;
          const usage = this.extractUsageFromResponse(response);
          yield {
            type: "done",
            finishReason: candidate.finishReason,
            usage,
          };
        }
      }
    } catch (error) {
      throw this.handleGeminiError(error);
    }
  }

  protected async doCountTokens(
    messages: UnifiedMessage[],
  ): Promise<TokenCount> {
    try {
      const model = this.client.getGenerativeModel({
        model: this.modelName,
        systemInstruction: this.extractSystemInstruction(messages),
      });

      const contents = this.toGeminiContents(
        messages.filter((m) => m.role !== "system"),
      );

      const result = await model.countTokens({ contents });
      const totalTokens = result.totalTokens || 0;

      return {
        promptTokens: totalTokens,
        completionTokens: 0,
        totalTokens,
      };
    } catch (error) {
      throw this.handleGeminiError(error);
    }
  }

  private extractSystemInstruction(messages: UnifiedMessage[]): string {
    return messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n");
  }

  private toGeminiContents(messages: UnifiedMessage[]): Content[] {
    return messages.map((msg) => {
      const parts: Part[] = [];

      if (msg.content) {
        parts.push({ text: msg.content } as TextPart);
      }

      if (msg.functionCall) {
        parts.push({
          functionCall: {
            name: msg.functionCall.name,
            args: (msg.functionCall.params as Record<string, unknown>) || {},
          },
        } as FunctionCallPart);
      }

      if (msg.functionResponse) {
        parts.push({
          functionResponse: {
            name: msg.functionResponse.name,
            response: msg.functionResponse.result,
          },
        } as FunctionResponsePart);
      }

      return {
        role:
          msg.role === "assistant"
            ? "model"
            : msg.role === "user"
              ? "user"
              : "function",
        parts,
      };
    });
  }

  private fromGeminiResult(
    response: Awaited<
      ReturnType<
        ReturnType<GoogleGenerativeAI["getGenerativeModel"]>["generateContent"]
      >
    >["response"],
  ): LLMResponse {
    const candidate = response.candidates?.[0];
    if (!candidate?.content) {
      throw new LLMError(
        "Missing candidate content",
        ErrorCode.LLM_INVALID_RESPONSE,
        this.name,
      );
    }

    let text = "";
    const functionCalls: FunctionCall[] = [];

    for (const part of candidate.content.parts) {
      if ("text" in part && part.text) {
        text += part.text;
      }

      if ("functionCall" in part && part.functionCall) {
        const fc = part.functionCall;
        functionCalls.push({
          id: generateId(),
          name: fc.name,
          params: (fc.args as Record<string, unknown>) || {},
        });
      }
    }

    const usage = this.extractUsageFromResponse(response);

    return {
      text,
      functionCalls,
      finishReason: candidate.finishReason || "STOP",
      usage,
    };
  }

  private extractUsageFromResponse(
    response: Awaited<
      ReturnType<
        ReturnType<GoogleGenerativeAI["getGenerativeModel"]>["generateContent"]
      >
    >["response"],
  ): TokenCount {
    const usage = response.usageMetadata;
    if (!usage) {
      return {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      };
    }

    return {
      promptTokens: usage.promptTokenCount || 0,
      completionTokens: usage.candidatesTokenCount || 0,
      totalTokens: usage.totalTokenCount || 0,
    };
  }

  private handleGeminiError(error: unknown): LLMError {
    if (error instanceof LLMError) {
      return error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);

    if (
      errorMessage.includes("API_KEY_INVALID") ||
      errorMessage.includes("PERMISSION_DENIED")
    ) {
      return new LLMError(errorMessage, ErrorCode.LLM_AUTH_ERROR, this.name);
    }

    if (errorMessage.includes("RESOURCE_EXHAUSTED")) {
      return new LLMError(
        errorMessage,
        ErrorCode.LLM_RATE_LIMIT,
        this.name,
        60000,
      );
    }

    if (errorMessage.includes("DEADLINE_EXCEEDED")) {
      return new LLMError(errorMessage, ErrorCode.LLM_TIMEOUT, this.name, 5000);
    }

    return new LLMError(errorMessage, ErrorCode.LLM_API_ERROR, this.name);
  }
}
