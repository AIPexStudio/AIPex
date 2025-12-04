import type { ChatStatus, UIMessage } from "./ui";

// ============ Adapter Types ============

export interface ChatAdapterState {
  messages: UIMessage[];
  currentAssistantMessageId: string | null;
  status: ChatStatus;
}

export interface ChatAdapterOptions {
  /** Called when messages are updated */
  onMessagesUpdate?: (messages: UIMessage[]) => void;
  /** Called when status changes */
  onStatusChange?: (status: ChatStatus) => void;
}
