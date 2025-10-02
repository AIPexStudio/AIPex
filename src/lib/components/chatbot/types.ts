export type UIRole = "user" | "assistant" | "tool";

export type UITextPart = { type: "text"; text: string };

export type UISourceUrlPart = { type: "source-url"; url: string };

export type UIReasoningPart = { type: "reasoning"; text: string };

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

export type UIPart = UITextPart | UISourceUrlPart | UIReasoningPart | UIToolPart;

export type UIMessage = { id: string; role: UIRole; parts: UIPart[] };
