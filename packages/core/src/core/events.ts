import type { ToolResult } from "../tools/types.js";
import type { AgentError } from "../utils/errors.js";
import type { RateLimitSnapshot, TokenUsage } from "./types.js";

export type AgentEvent =
  // Session level
  | { type: "session_created"; sessionId: string }

  // Execution level
  | { type: "execution_start" }
  | {
      type: "execution_complete";
      reason: "finished" | "max_turns" | "loop_detected" | "cancelled";
      turns: number;
      details?: string;
    }
  | { type: "execution_error"; error: AgentError; recoverable: boolean }

  // Turn level
  | { type: "turn_start"; turnId: string; number: number }
  | { type: "turn_complete"; shouldContinue: boolean }
  | { type: "turn_aborted"; reason: string }

  // LLM level
  | { type: "llm_stream_start" }
  | { type: "content_delta"; delta: string }
  | { type: "thinking_delta"; delta: string }
  | { type: "llm_stream_end"; usage: TokenUsage }
  | { type: "rate_limit"; snapshot: RateLimitSnapshot }

  // Tool level
  | {
      type: "tool_call_pending";
      callId: string;
      toolName: string;
      params: unknown;
    }
  | { type: "tool_call_start"; callId: string }
  | { type: "tool_output_stream"; callId: string; chunk: string }
  | {
      type: "tool_call_complete";
      callId: string;
      result: ToolResult;
      duration: number;
    }
  | { type: "tool_call_error"; callId: string; error: Error };

export type TurnEvent =
  | { type: "llm_stream_start" }
  | { type: "content_delta"; delta: string }
  | { type: "thinking_delta"; delta: string }
  | { type: "llm_stream_end"; usage: TokenUsage }
  | {
      type: "tool_call_pending";
      callId: string;
      toolName: string;
      params: unknown;
    }
  | { type: "tool_call_start"; callId: string }
  | { type: "tool_output_stream"; callId: string; chunk: string }
  | {
      type: "tool_call_complete";
      callId: string;
      result: ToolResult;
      duration: number;
    }
  | { type: "tool_call_error"; callId: string; error: Error }
  | { type: "turn_complete"; shouldContinue: boolean };
