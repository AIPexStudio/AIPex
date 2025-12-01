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

// ============ Storage Adapter Types ============

export interface StorageAdapter {
  get<T = unknown>(key: string): Promise<T | undefined>;
  set<T = unknown>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}
