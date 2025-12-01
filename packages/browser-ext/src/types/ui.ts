import type { ComponentType, ReactNode } from "react";

// ============ Chat Status ============

export type ChatStatus =
  | "idle"
  | "submitted"
  | "streaming"
  | "executing_tools"
  | "error";

// ============ UI Message Types ============

export type UIRole = "user" | "assistant" | "tool" | "system";

export interface UITextPart {
  type: "text";
  text: string;
}

export interface UISourceUrlPart {
  type: "source-url";
  url: string;
}

export interface UIReasoningPart {
  type: "reasoning";
  text: string;
}

export interface UIFilePart {
  type: "file";
  mediaType: string;
  filename?: string;
  url: string;
}

export type UIToolState = "pending" | "executing" | "completed" | "error";

export interface UIToolPart {
  type: "tool";
  toolName: string;
  toolCallId: string;
  input: unknown;
  output?: unknown;
  state: UIToolState;
  errorText?: string;
  duration?: number;
}

export interface UIContextPart {
  type: "context";
  contextType: string;
  label: string;
  value: string;
  metadata?: Record<string, unknown>;
}

export type UIPart =
  | UITextPart
  | UISourceUrlPart
  | UIReasoningPart
  | UIFilePart
  | UIToolPart
  | UIContextPart;

export interface UIMessage {
  id: string;
  role: UIRole;
  parts: UIPart[];
  timestamp?: number;
}

// ============ Context Item Types ============

export type ContextItemType =
  | "page"
  | "tab"
  | "bookmark"
  | "clipboard"
  | "screenshot"
  | "custom";

export interface ContextItem {
  id: string;
  type: ContextItemType;
  label: string;
  value: string;
  icon?: ReactNode;
  metadata?: Record<string, unknown>;
}

// ============ Welcome Suggestion ============

export interface WelcomeSuggestion {
  icon?: ComponentType<{ className?: string }>;
  text: string;
  iconColor?: string;
  bgColor?: string;
}
