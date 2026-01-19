import type { ContextProvider } from "@aipexstudio/aipex-core";
import type { RuntimeAddon } from "./runtime-addon.js";
import type { RuntimeBroadcastMessage } from "./types.js";
export interface AutomationTarget {
  tabId: number;
  frameId?: number;
  windowId?: number;
}
export interface SnapshotCaptureOptions {
  includeDom?: boolean;
  includeScreenshot?: boolean;
  includeContext?: boolean;
  reason?: string;
  tabId?: number;
}
export interface SnapshotResult {
  id: string;
  capturedAt: number;
  screenshot?: string;
  dom?: string;
  title?: string;
  url?: string;
  metadata?: Record<string, unknown>;
}
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
