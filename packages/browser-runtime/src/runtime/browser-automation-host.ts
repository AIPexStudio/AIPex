import type { ContextProvider } from "@aipexstudio/aipex-core";
import type {
  AutomationTarget,
  RuntimeAddon,
  RuntimeBroadcastMessage,
  SnapshotCaptureOptions,
  SnapshotResult,
} from "./types.js";

export type {
  AutomationTarget,
  SnapshotCaptureOptions,
  SnapshotResult,
} from "./types.js";

export interface CaptureSessionOptions {
  target: AutomationTarget;
  captureIntervalMs?: number;
  includeVideo?: boolean;
  includeMouseMoves?: boolean;
  contextProviders?: ContextProvider[];
}

export interface CaptureSession {
  id: string;
  startedAt: number;
  target: AutomationTarget;
  stop(): Promise<void>;
}

export interface BrowserAutomationHost {
  registerAddon(addon: RuntimeAddon): () => void;
  attachDebugger(target: AutomationTarget): Promise<void>;
  detachDebugger(target: AutomationTarget): Promise<void>;
  startCapture(options: CaptureSessionOptions): Promise<CaptureSession>;
  captureSnapshot(
    target: AutomationTarget,
    options?: SnapshotCaptureOptions,
  ): Promise<SnapshotResult>;
  restoreCapture(snapshotId: string): Promise<void>;
  broadcastToTabs<TPayload>(
    message: RuntimeBroadcastMessage<TPayload>,
  ): Promise<void>;
}
