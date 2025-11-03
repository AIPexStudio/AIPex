import { ErrorCode, LLMError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import { retry } from "../utils/retry.js";
import type { LLMProvider } from "./provider.js";
import type {
  LLMCapabilities,
  LLMRequest,
  LLMResponse,
  StreamChunk,
  TokenCount,
  UnifiedMessage,
} from "./types.js";

export abstract class BaseLLMProvider implements LLMProvider {
  abstract readonly name: string;
  abstract readonly capabilities: LLMCapabilities;

  protected constructor(
    protected apiKey: string,
    protected baseUrl?: string,
  ) {}

  async generateContent(request: LLMRequest): Promise<LLMResponse> {
    return retry(
      async () => {
        try {
          return await this.doGenerateContent(request);
        } catch (error) {
          throw this.handleError(error);
        }
      },
      {
        maxAttempts: 3,
        shouldRetry: (error) => {
          if (error instanceof LLMError) {
            return error.recoverable;
          }
          return false;
        },
      },
    );
  }

  async *generateStream(request: LLMRequest): AsyncGenerator<StreamChunk> {
    try {
      yield* this.doGenerateStream(request);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async countTokens(messages: UnifiedMessage[]): Promise<TokenCount> {
    try {
      return await this.doCountTokens(messages);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  protected abstract doGenerateContent(
    request: LLMRequest,
  ): Promise<LLMResponse>;
  protected abstract doGenerateStream(
    request: LLMRequest,
  ): AsyncGenerator<StreamChunk>;
  protected abstract doCountTokens(
    messages: UnifiedMessage[],
  ): Promise<TokenCount>;

  protected handleError(error: unknown): LLMError {
    logger.error("LLM provider error", {
      provider: this.name,
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof LLMError) {
      return error;
    }

    if (error instanceof HttpError) {
      return this.handleHttpError(error);
    }

    if (error instanceof Error && error.name === "AbortError") {
      return new LLMError(
        "Request timeout",
        ErrorCode.LLM_TIMEOUT,
        this.name,
        5000,
      );
    }

    return new LLMError(
      error instanceof Error ? error.message : String(error),
      ErrorCode.LLM_API_ERROR,
      this.name,
      3000,
    );
  }

  protected handleHttpError(error: HttpError): LLMError {
    const { status, statusText, message } = error;

    if (status === 401 || status === 403) {
      return new LLMError(
        message || `Authentication failed: ${statusText}`,
        ErrorCode.LLM_AUTH_ERROR,
        this.name,
      );
    }

    if (status === 429) {
      return new LLMError(
        message || `Rate limit exceeded: ${statusText}`,
        ErrorCode.LLM_RATE_LIMIT,
        this.name,
        60000,
      );
    }

    if (status === 408 || status === 504) {
      return new LLMError(
        message || `Request timeout: ${statusText}`,
        ErrorCode.LLM_TIMEOUT,
        this.name,
        5000,
      );
    }

    return new LLMError(
      message || `HTTP ${status}: ${statusText}`,
      ErrorCode.LLM_API_ERROR,
      this.name,
      3000,
    );
  }

  protected async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs = 30000,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new HttpError(response.status, response.statusText, errorText);
      }

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    message: string,
  ) {
    super(message || `HTTP ${status}: ${statusText}`);
    this.name = "HttpError";
  }
}
