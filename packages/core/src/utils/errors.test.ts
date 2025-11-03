import { describe, expect, it } from "vitest";
import {
  AgentError,
  ErrorCode,
  LLMError,
  LLMStreamError,
  ToolError,
  ToolTimeoutError,
  TurnCancelledError,
} from "./errors.js";

describe("AgentError", () => {
  it("should create error with correct properties", () => {
    const error = new AgentError("Test error", ErrorCode.LLM_API_ERROR, true, {
      key: "value",
    });

    expect(error.message).toBe("Test error");
    expect(error.code).toBe(ErrorCode.LLM_API_ERROR);
    expect(error.recoverable).toBe(true);
    expect(error.context).toEqual({ key: "value" });
    expect(error.name).toBe("AgentError");
  });

  it("should default recoverable to false", () => {
    const error = new AgentError("Test", ErrorCode.LLM_API_ERROR);
    expect(error.recoverable).toBe(false);
  });
});

describe("LLMError", () => {
  it("should create LLM error with provider info", () => {
    const error = new LLMError(
      "API failed",
      ErrorCode.LLM_API_ERROR,
      "gemini",
      5000,
    );

    expect(error.message).toBe("API failed");
    expect(error.provider).toBe("gemini");
    expect(error.retryDelay).toBe(5000);
    expect(error.name).toBe("LLMError");
  });

  it("should mark invalid response as non-recoverable", () => {
    const error = new LLMError(
      "Invalid",
      ErrorCode.LLM_INVALID_RESPONSE,
      "gemini",
    );
    expect(error.recoverable).toBe(false);
  });

  it("should mark other errors as recoverable", () => {
    const error = new LLMError("Timeout", ErrorCode.LLM_TIMEOUT, "gemini");
    expect(error.recoverable).toBe(true);
  });
});

describe("LLMStreamError", () => {
  it("should be recoverable by default", () => {
    const error = new LLMStreamError("Stream failed", "gemini");
    expect(error.recoverable).toBe(true);
    expect(error.code).toBe(ErrorCode.LLM_STREAM_ERROR);
    expect(error.name).toBe("LLMStreamError");
  });
});

describe("ToolError", () => {
  it("should create tool error with tool name", () => {
    const error = new ToolError(
      "Execution failed",
      ErrorCode.TOOL_EXECUTION_ERROR,
      "http_fetch",
      false,
    );

    expect(error.message).toBe("Execution failed");
    expect(error.toolName).toBe("http_fetch");
    expect(error.shouldContinue).toBe(false);
    expect(error.name).toBe("ToolError");
  });

  it("should default shouldContinue to true", () => {
    const error = new ToolError(
      "Error",
      ErrorCode.TOOL_EXECUTION_ERROR,
      "test",
    );
    expect(error.shouldContinue).toBe(true);
  });
});

describe("ToolTimeoutError", () => {
  it("should format timeout message correctly", () => {
    const error = new ToolTimeoutError("http_fetch", 5000);

    expect(error.message).toBe(
      "Tool http_fetch execution timeout after 5000ms",
    );
    expect(error.code).toBe(ErrorCode.TOOL_TIMEOUT);
    expect(error.shouldContinue).toBe(true);
    expect(error.name).toBe("ToolTimeoutError");
  });
});

describe("TurnCancelledError", () => {
  it("should create non-recoverable cancellation error", () => {
    const error = new TurnCancelledError("User cancelled");

    expect(error.message).toBe("Turn cancelled: User cancelled");
    expect(error.code).toBe(ErrorCode.TURN_CANCELLED);
    expect(error.recoverable).toBe(false);
    expect(error.name).toBe("TurnCancelledError");
  });
});
