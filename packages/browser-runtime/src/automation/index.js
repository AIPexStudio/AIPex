/**
 * Browser Automation Module
 *
 * Provides CDP-based browser automation capabilities
 */
export { CdpCommander, rejectPendingCommands } from "./cdp-commander";
export { DebuggerManager, debuggerManager } from "./debugger-manager";
export {
  hasGlobPatterns,
  parseSearchQuery,
  SKIP_ROLES,
  searchSnapshotText,
} from "./query";
export { SmartElementHandle, SmartLocator } from "./smart-locator";
export { SnapshotManager, snapshotManager } from "./snapshot-manager";
export * from "./types";
export * from "./ui-operations";
