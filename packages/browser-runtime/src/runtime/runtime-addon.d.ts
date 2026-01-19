import type {
  AutomationTarget,
  SnapshotCaptureOptions,
  SnapshotResult,
} from "./browser-automation-host.js";
import type { RuntimeBroadcastMessage } from "./types.js";
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
