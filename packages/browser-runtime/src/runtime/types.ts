export interface RuntimeBroadcastMessage<TPayload = unknown> {
  channel: string;
  payload: TPayload;
  scope?: "tab" | "window" | "all";
  includeContentScripts?: boolean;
}

export interface RuntimeAddonCleanup {
  dispose(): Promise<void> | void;
}

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

export interface SnapshotHookContext {
  target: AutomationTarget;
  options?: SnapshotCaptureOptions;
}

export interface RuntimeAddon {
  id: string;
  initialize?(): Promise<void> | void;
  onMessage?(message: RuntimeBroadcastMessage): Promise<void> | void;
  onBeforeSnapshot?(ctx: SnapshotHookContext): Promise<void> | void;
  onAfterSnapshot?(
    result: SnapshotResult,
    ctx: SnapshotHookContext,
  ): Promise<void> | void;
}
