export type UIRole = "user" | "assistant" | "tool" | "system";

export type UITextPart = { type: "text"; text: string };

export type UISourceUrlPart = { type: "source-url"; url: string };

export type UIReasoningPart = { type: "reasoning"; text: string };

export type UIFilePart = {
  type: "file";
  mediaType: string;
  filename?: string;
  url: string; // Can be a data URL (base64) or hosted URL
};

export type UIToolPart = {
  type: "tool";
  toolName: string;
  input: any;
  output?: any;
  state: "input-streaming" | "input-available" | "executing" | "output-available" | "output-error";
  errorText?: string;
  toolCallId: string;
  screenshot?: string;
};

export type UIContextPart = {
  type: "context";
  contextType: string; // "page" | "tab" | "bookmark" | etc.
  label: string;
  value: string;
  metadata?: Record<string, any>;
};

export type UIPart = UITextPart | UISourceUrlPart | UIReasoningPart | UIFilePart | UIToolPart | UIContextPart;

export type UIMessage = {
  id: string;
  role: UIRole;
  parts: UIPart[];
};
