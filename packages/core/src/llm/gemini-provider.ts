import {
  type Content,
  type Tool as GeminiTool,
  type GenerateContentResponse,
  type GenerateContentResponseUsageMetadata,
  GoogleGenAI,
  type Part,
  type Schema,
  Type,
} from "@google/genai";
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

  private client: GoogleGenAI;
  private modelName: string;

  constructor(config: GeminiConfig) {
    super(config.apiKey, "");
    this.client = new GoogleGenAI({ apiKey: config.apiKey });
    this.modelName = config.model || "gemini-2.0-flash-exp";
  }

  protected async doGenerateContent(request: LLMRequest): Promise<LLMResponse> {
    try {
      const systemInstruction = this.extractSystemInstruction(request.messages);
      const contents = this.toGeminiContents(
        request.messages.filter((m) => m.role !== "system"),
      );

      const tools = request.tools
        ? this.convertToGeminiTools(request.tools)
        : undefined;

      const response = await this.client.models.generateContent({
        model: this.modelName,
        contents,
        config: {
          systemInstruction: systemInstruction || undefined,
          tools,
          temperature: request.temperature,
          maxOutputTokens: request.maxTokens,
          topP: request.topP,
        },
      });

      return this.fromGeminiResult(response);
    } catch (error) {
      throw this.handleGeminiError(error);
    }
  }

  protected async *doGenerateStream(
    request: LLMRequest,
  ): AsyncGenerator<StreamChunk> {
    try {
      const systemInstruction = this.extractSystemInstruction(request.messages);
      const contents = this.toGeminiContents(
        request.messages.filter((m) => m.role !== "system"),
      );

      const tools = request.tools
        ? this.convertToGeminiTools(request.tools)
        : undefined;

      const stream = await this.client.models.generateContentStream({
        model: this.modelName,
        contents,
        config: {
          systemInstruction: systemInstruction || undefined,
          tools,
          temperature: request.temperature,
          maxOutputTokens: request.maxTokens,
          topP: request.topP,
        },
      });

      let accumulatedText = "";

      for await (const chunk of stream) {
        const candidate = chunk.candidates?.[0];
        if (!candidate) continue;

        const content = candidate.content;
        if (!content?.parts) continue;

        for (const part of content.parts) {
          if (part.text) {
            const delta = part.text.slice(accumulatedText.length);
            if (delta) {
              accumulatedText = part.text;
              yield { type: "content", delta };
            }
          }

          if (part.functionCall) {
            const fc = part.functionCall;
            const call: FunctionCall = {
              id: generateId(),
              name: fc.name || "",
              params: (fc.args as Record<string, unknown>) || {},
            };
            yield { type: "function_call", call };
          }
        }

        if (candidate.finishReason) {
          const usage = this.extractUsageFromCandidate(chunk.usageMetadata);
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
      const systemInstruction = this.extractSystemInstruction(messages);
      const contents = this.toGeminiContents(
        messages.filter((m) => m.role !== "system"),
      );

      const response = await this.client.models.countTokens({
        model: this.modelName,
        contents,
        config: {
          systemInstruction: systemInstruction || undefined,
        },
      });

      const totalTokens = response.totalTokens || 0;

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
        parts.push({ text: msg.content });
      }

      if (msg.functionCall) {
        parts.push({
          functionCall: {
            name: msg.functionCall.name,
            args: msg.functionCall.params,
          },
        });
      }

      if (msg.functionResponse) {
        parts.push({
          functionResponse: {
            name: msg.functionResponse.name,
            response: msg.functionResponse.result,
          },
        });
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

  private convertToGeminiTools(
    tools: LLMRequest["tools"],
  ): GeminiTool[] | undefined {
    if (!tools || tools.length === 0) return undefined;

    return tools.map((tool) => ({
      functionDeclarations: [
        {
          name: tool.name,
          description: tool.description,
          parameters: {
            type: Type.OBJECT,
            properties: tool.parameters as Record<string, Schema>,
          },
        },
      ],
    }));
  }

  private fromGeminiResult(response: GenerateContentResponse): LLMResponse {
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

    const parts = candidate.content.parts || [];
    for (const part of parts) {
      if (part.text) {
        text += part.text;
      }

      if (part.functionCall) {
        const fc = part.functionCall;
        functionCalls.push({
          id: generateId(),
          name: fc.name || "",
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

  private extractUsageFromCandidate(
    usage?: GenerateContentResponseUsageMetadata,
  ): TokenCount {
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

  private extractUsageFromResponse(
    response: GenerateContentResponse,
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
