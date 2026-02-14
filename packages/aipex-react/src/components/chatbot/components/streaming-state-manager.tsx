import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Stream chunk types for AI streaming responses
 */
export interface StreamChunk {
  type:
    | "text"
    | "tool_call"
    | "tool_result"
    | "thinking"
    | "planning"
    | "complete"
    | "error";
  content?: string;
  name?: string;
  args?: unknown;
  result?: string;
  error?: string;
  timestamp: number;
  messageId: string;
}

export interface StreamingState {
  isStreaming: boolean;
  content: string;
  toolCalls: StreamChunk[];
  currentToolCall: {
    name: string;
    args: unknown;
    startTime: number;
  } | null;
  steps: StreamChunk[];
  error: string | null;
  startTime: number | null;
  endTime: number | null;
}

export interface StreamingStateManagerProps {
  messageId: string;
  onStateChange?: (state: StreamingState) => void;
  onComplete?: (finalState: StreamingState) => void;
  onError?: (error: string) => void;
  /** Optional message listener for environments without chrome.runtime */
  onMessage?: (callback: (message: unknown) => void) => () => void;
}

const initialState: StreamingState = {
  isStreaming: false,
  content: "",
  toolCalls: [],
  currentToolCall: null,
  steps: [],
  error: null,
  startTime: null,
  endTime: null,
};

export const useStreamingState = (
  messageId: string,
  onMessage?: (callback: (message: unknown) => void) => () => void,
) => {
  const [state, setState] = useState<StreamingState>(initialState);

  const startTimeRef = useRef<number>(0);
  const toolCallStartTimeRef = useRef<number>(0);

  // Update state with new chunk
  const addChunk = useCallback((chunk: StreamChunk) => {
    setState((prev) => {
      const newState = { ...prev };

      switch (chunk.type) {
        case "text":
          newState.content += chunk.content || "";
          newState.steps = [...prev.steps, chunk];
          break;

        case "tool_call":
          newState.currentToolCall = {
            name: chunk.name || "",
            args: chunk.args,
            startTime: Date.now(),
          };
          newState.toolCalls = [...prev.toolCalls, chunk];
          newState.steps = [...prev.steps, chunk];
          toolCallStartTimeRef.current = Date.now();
          break;

        case "tool_result":
          newState.currentToolCall = null;
          newState.steps = [...prev.steps, chunk];
          break;

        case "thinking":
        case "planning":
          newState.steps = [...prev.steps, chunk];
          break;

        case "complete":
          newState.isStreaming = false;
          newState.endTime = Date.now();
          newState.steps = [...prev.steps, chunk];
          break;

        case "error":
          newState.error = chunk.error || "Unknown error";
          newState.isStreaming = false;
          newState.endTime = Date.now();
          newState.steps = [...prev.steps, chunk];
          break;
      }

      return newState;
    });
  }, []);

  // Start streaming
  const startStreaming = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isStreaming: true,
      startTime: Date.now(),
      error: null,
    }));
    startTimeRef.current = Date.now();
  }, []);

  // Stop streaming
  const stopStreaming = useCallback((error?: string) => {
    setState((prev) => ({
      ...prev,
      isStreaming: false,
      endTime: Date.now(),
      error: error || prev.error,
    }));
  }, []);

  // Add tool result
  const addToolResult = useCallback(
    (name: string, result: unknown, error?: string) => {
      const chunk: StreamChunk = {
        type: "tool_result",
        name,
        result: typeof result === "string" ? result : JSON.stringify(result),
        error,
        timestamp: Date.now(),
        messageId,
      };
      addChunk(chunk);
    },
    [addChunk, messageId],
  );

  // Add thinking step
  const addThinking = useCallback(
    (content: string) => {
      const chunk: StreamChunk = {
        type: "thinking",
        content,
        timestamp: Date.now(),
        messageId,
      };
      addChunk(chunk);
    },
    [addChunk, messageId],
  );

  // Add planning step
  const addPlanning = useCallback(
    (content: string) => {
      const chunk: StreamChunk = {
        type: "planning",
        content,
        timestamp: Date.now(),
        messageId,
      };
      addChunk(chunk);
    },
    [addChunk, messageId],
  );

  // Reset state
  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  // Listen for streaming messages
  useEffect(() => {
    const handleStreamMessage = (message: unknown) => {
      const msg = message as {
        messageId?: string;
        request?: string;
        chunk?: string;
        step?: {
          type?: string;
          name?: string;
          args?: unknown;
          result?: unknown;
          error?: string;
          content?: string;
        };
        error?: string;
      };

      if (msg.messageId !== messageId) return;

      switch (msg.request) {
        case "ai-chat-stream":
          addChunk({
            type: "text",
            content: msg.chunk,
            timestamp: Date.now(),
            messageId,
          });
          break;

        case "ai-chat-tools-step":
          if (msg.step?.type === "call_tool") {
            addChunk({
              type: "tool_call",
              name: msg.step.name,
              args: msg.step.args,
              timestamp: Date.now(),
              messageId,
            });
          } else if (msg.step?.type === "tool_result") {
            addToolResult(msg.step.name || "", msg.step.result, msg.step.error);
          } else if (msg.step?.type === "think") {
            addThinking(msg.step.content || "");
          }
          break;

        case "ai-chat-planning-step":
          addPlanning(msg.step?.content || "");
          break;

        case "ai-chat-complete":
          addChunk({
            type: "complete",
            timestamp: Date.now(),
            messageId,
          });
          break;

        case "ai-chat-error":
          addChunk({
            type: "error",
            error: msg.error,
            timestamp: Date.now(),
            messageId,
          });
          break;
      }
    };

    // Use custom message listener if provided, otherwise try chrome.runtime
    if (onMessage) {
      return onMessage(handleStreamMessage);
    }

    if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(handleStreamMessage);
      return () => {
        chrome.runtime.onMessage.removeListener(handleStreamMessage);
      };
    }

    return undefined;
  }, [messageId, addChunk, addToolResult, addThinking, addPlanning, onMessage]);

  return {
    state,
    addChunk,
    startStreaming,
    stopStreaming,
    addToolResult,
    addThinking,
    addPlanning,
    reset,
  };
};

const StreamingStateManager: React.FC<StreamingStateManagerProps> = ({
  messageId,
  onStateChange,
  onComplete,
  onError,
  onMessage,
}) => {
  const { state } = useStreamingState(messageId, onMessage);

  // Notify state changes
  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  // Notify completion
  useEffect(() => {
    if (!state.isStreaming && state.endTime && !state.error) {
      onComplete?.(state);
    }
  }, [state.isStreaming, state.endTime, state.error, state, onComplete]);

  // Notify errors
  useEffect(() => {
    if (state.error) {
      onError?.(state.error);
    }
  }, [state.error, onError]);

  return null; // This component doesn't render anything
};

export default StreamingStateManager;
