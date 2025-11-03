export enum ErrorCode {
  // LLM errors
  LLM_API_ERROR = "LLM_API_ERROR",
  LLM_STREAM_ERROR = "LLM_STREAM_ERROR",
  LLM_TIMEOUT = "LLM_TIMEOUT",
  LLM_RATE_LIMIT = "LLM_RATE_LIMIT",
  LLM_INVALID_RESPONSE = "LLM_INVALID_RESPONSE",
  LLM_AUTH_ERROR = "LLM_AUTH_ERROR",

  // Tool errors
  TOOL_NOT_FOUND = "TOOL_NOT_FOUND",
  TOOL_EXECUTION_ERROR = "TOOL_EXECUTION_ERROR",
  TOOL_TIMEOUT = "TOOL_TIMEOUT",
  TOOL_VALIDATION_ERROR = "TOOL_VALIDATION_ERROR",

  // Session errors
  SESSION_NOT_FOUND = "SESSION_NOT_FOUND",
  SESSION_EXPIRED = "SESSION_EXPIRED",

  // Execution errors
  MAX_TURNS_REACHED = "MAX_TURNS_REACHED",
  LOOP_DETECTED = "LOOP_DETECTED",
  TURN_CANCELLED = "TURN_CANCELLED",
}

export class AgentError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public recoverable = false,
    public context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AgentError";
    Object.setPrototypeOf(this, AgentError.prototype);
  }
}

export class LLMError extends AgentError {
  constructor(
    message: string,
    code: ErrorCode,
    public provider: string,
    public retryDelay?: number,
  ) {
    super(message, code, code !== ErrorCode.LLM_INVALID_RESPONSE, {
      provider,
      retryDelay,
    });
    this.name = "LLMError";
    Object.setPrototypeOf(this, LLMError.prototype);
  }
}

export class LLMStreamError extends LLMError {
  constructor(message: string, provider: string, retryDelay?: number) {
    super(message, ErrorCode.LLM_STREAM_ERROR, provider, retryDelay);
    this.name = "LLMStreamError";
    this.recoverable = true;
    Object.setPrototypeOf(this, LLMStreamError.prototype);
  }
}

export class ToolError extends AgentError {
  constructor(
    message: string,
    code: ErrorCode,
    public toolName: string,
    public shouldContinue = true,
  ) {
    super(message, code, shouldContinue, { toolName });
    this.name = "ToolError";
    Object.setPrototypeOf(this, ToolError.prototype);
  }
}

export class ToolTimeoutError extends ToolError {
  constructor(toolName: string, timeoutMs: number) {
    super(
      `Tool ${toolName} execution timeout after ${timeoutMs}ms`,
      ErrorCode.TOOL_TIMEOUT,
      toolName,
      true,
    );
    this.name = "ToolTimeoutError";
    Object.setPrototypeOf(this, ToolTimeoutError.prototype);
  }
}

export class TurnCancelledError extends AgentError {
  constructor(reason: string) {
    super(`Turn cancelled: ${reason}`, ErrorCode.TURN_CANCELLED, false);
    this.name = "TurnCancelledError";
    Object.setPrototypeOf(this, TurnCancelledError.prototype);
  }
}
