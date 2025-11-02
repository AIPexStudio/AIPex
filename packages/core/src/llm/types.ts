export interface UnifiedMessage {
  role: "system" | "user" | "assistant" | "function";
  content: string;
  functionCall?: FunctionCall;
  functionResponse?: FunctionResponse;
  metadata?: {
    timestamp: number;
    [key: string]: unknown;
  };
}

export interface FunctionCall {
  id: string;
  name: string;
  params: unknown;
}

export interface FunctionResponse {
  id: string;
  name: string;
  result: unknown;
}

export interface FunctionDeclaration {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface LLMRequest {
  messages: UnifiedMessage[];
  tools?: FunctionDeclaration[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export interface LLMResponse {
  text: string;
  functionCalls: FunctionCall[];
  finishReason: string;
  usage: TokenCount;
}

export type StreamChunk =
  | { type: "content"; delta: string }
  | { type: "function_call"; call: FunctionCall }
  | { type: "thinking"; thought: string }
  | { type: "done"; finishReason: string; usage: TokenCount };

export interface TokenCount {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LLMCapabilities {
  streaming: boolean;
  functionCalling: boolean;
  thinking?: boolean;
}
