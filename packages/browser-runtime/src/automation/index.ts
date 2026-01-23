/**
 * Browser Automation Module
 *
 * Provides CDP-based and DOM-based browser automation capabilities
 */

export { CdpCommander, rejectPendingCommands } from "./cdp-commander";
export { DebuggerManager, debuggerManager } from "./debugger-manager";
export { DomElementHandle } from "./dom-element-handle";
export { DomLocator } from "./dom-locator";
export {
  hasGlobPatterns,
  parseSearchQuery,
  type SearchOptions,
  type SearchResult,
  SKIP_ROLES,
  searchSnapshotText,
} from "./query";
export { SmartElementHandle, SmartLocator } from "./smart-locator";
export { SnapshotManager, snapshotManager } from "./snapshot-manager";
export * from "./snapshot-provider";
export * from "./types";
export * from "./ui-operations";
