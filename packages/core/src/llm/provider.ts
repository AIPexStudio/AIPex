import type {
  LLMCapabilities,
  LLMRequest,
  LLMResponse,
  StreamChunk,
  TokenCount,
  UnifiedMessage,
} from "./types.js";

export interface LLMProvider {
  generateContent(request: LLMRequest): Promise<LLMResponse>;
  generateStream(request: LLMRequest): AsyncGenerator<StreamChunk>;
  countTokens(messages: UnifiedMessage[]): Promise<TokenCount>;
  readonly name: string;
  readonly capabilities: LLMCapabilities;
}
