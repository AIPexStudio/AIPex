// Re-export all tool modules
export * from "./bookmark";
export * from "./element";
export * from "./history";
export * from "./page";
export * from "./screenshot";
export * from "./snapshot";
export * from "./tab";

// Import tools for allBrowserTools array
import {
  createBookmarkFolderTool,
  createBookmarkTool,
  deleteBookmarkFolderTool,
  deleteBookmarkTool,
  getBookmarkTool,
  listBookmarksTool,
  searchBookmarksTool,
  updateBookmarkTool,
} from "./bookmark";
import {
  clickElementByUidTool,
  fillElementByUidTool,
  getEditorValueByUidTool,
  hoverElementByUidTool,
} from "./element";
import {
  clearHistoryTool,
  deleteHistoryItemTool,
  getHistoryStatsTool,
  getMostVisitedSitesTool,
  getRecentHistoryTool,
  searchHistoryTool,
} from "./history";
import {
  clickElementTool,
  fillFormFieldTool,
  getPageContentTool,
  getPageInfoTool,
  navigateToUrlTool,
  scrollPageTool,
} from "./page";
import {
  copyScreenshotToClipboardTool,
  takeScreenshotOfTabTool,
  takeScreenshotTool,
} from "./screenshot";
import { searchSnapshotTool, takeSnapshotTool } from "./snapshot";
import {
  closeTabTool,
  createTabTool,
  duplicateTabTool,
  listTabsTool,
  reloadTabTool,
  switchToTabTool,
} from "./tab";

export const allBrowserTools = [
  // Page tools
  getPageInfoTool,
  scrollPageTool,
  navigateToUrlTool,
  getPageContentTool,
  clickElementTool,
  fillFormFieldTool,
  // Tab tools
  listTabsTool,
  switchToTabTool,
  closeTabTool,
  createTabTool,
  reloadTabTool,
  duplicateTabTool,
  // Snapshot tools
  takeSnapshotTool,
  searchSnapshotTool,
  // Element tools (UID-based)
  clickElementByUidTool,
  fillElementByUidTool,
  hoverElementByUidTool,
  getEditorValueByUidTool,
  // Screenshot tools
  takeScreenshotTool,
  takeScreenshotOfTabTool,
  copyScreenshotToClipboardTool,
  // Bookmark tools
  listBookmarksTool,
  searchBookmarksTool,
  createBookmarkTool,
  deleteBookmarkTool,
  getBookmarkTool,
  updateBookmarkTool,
  createBookmarkFolderTool,
  deleteBookmarkFolderTool,
  // History tools
  getRecentHistoryTool,
  searchHistoryTool,
  deleteHistoryItemTool,
  clearHistoryTool,
  getMostVisitedSitesTool,
  getHistoryStatsTool,
] as const;

interface ToolRegistryLike {
  register(tool: (typeof allBrowserTools)[number]): unknown;
}

/**
 * Register all default browser tools with a registry-like object
 */
export function registerDefaultBrowserTools<T extends ToolRegistryLike>(
  registry: T,
): T {
  for (const tool of allBrowserTools) {
    registry.register(tool);
  }
  return registry;
}

/**
 * Get the currently active tab
 * @throws Error if no active tab is found
 */
export async function getActiveTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!tab?.id) {
    throw new Error("No active tab found");
  }

  return tab;
}

/**
 * Execute a script in a specific tab
 */
export async function executeScriptInTab<T, Args extends any[]>(
  tabId: number,
  func: (...args: Args) => T,
  args: Args,
): Promise<T> {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func,
    args,
  });

  return results[0]?.result as T;
}

/**
 * Execute a script in the active tab
 */
export async function executeScriptInActiveTab<T, Args extends any[]>(
  func: (...args: Args) => T,
  args: Args,
): Promise<T> {
  const tab = await getActiveTab();
  return await executeScriptInTab(tab.id!, func, args);
}
