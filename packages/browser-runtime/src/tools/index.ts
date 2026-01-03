import type { FunctionTool } from "@aipexstudio/aipex-core";

// Re-export all tool modules
export * from "./bookmark";
export * from "./element";
export * from "./history";
export * from "./page";
export * from "./screenshot";
export * from "./snapshot";
export * from "./tab";
export * from "./tools/clipboard";
export * from "./tools/context-menus";
export * from "./tools/downloads";
export * from "./tools/extensions";
export * from "./tools/sessions";
export * from "./tools/tab-groups";
export * from "./tools/utils/wait-helper";
export * from "./tools/window-management";

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
import {
  copyCurrentPageTitleTool,
  copyCurrentPageUrlTool,
  copyPageAsMarkdownTool,
  copyPageAsTextTool,
  copyPageLinksTool,
  copyPageMetadataTool,
  copySelectedTextTool,
  copyToClipboardTool,
  readFromClipboardTool,
} from "./tools/clipboard";
import {
  createContextMenuItemTool,
  removeAllContextMenuItemsTool,
  removeContextMenuItemTool,
  updateContextMenuItemTool,
} from "./tools/context-menus";
import {
  cancelDownloadTool,
  downloadTextAsMarkdownTool,
  getAllDownloadsTool,
  openDownloadTool,
  showDownloadInFolderTool,
} from "./tools/downloads";
import {
  getAllExtensionsTool,
  getExtensionTool,
  setExtensionEnabledTool,
  uninstallExtensionTool,
} from "./tools/extensions";
import {
  getAllDevicesTool,
  getAllSessionsTool,
  getCurrentDeviceTool,
  getSessionTool,
  restoreSessionTool,
} from "./tools/sessions";
import {
  createTabGroupTool,
  deleteTabGroupTool,
  getAllTabGroupsTool,
  ungroupAllTabsTool,
  updateTabGroupTool,
} from "./tools/tab-groups";
import { waitForElementTool, waitTool } from "./tools/utils/wait-helper";
import {
  closeWindowTool,
  createNewWindowTool,
  getAllWindowsTool,
  getCurrentWindowTool,
  switchToWindowTool,
} from "./tools/window-management";

export const allBrowserTools: FunctionTool[] = [
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
  // Clipboard tools
  copyToClipboardTool,
  readFromClipboardTool,
  copyCurrentPageUrlTool,
  copyCurrentPageTitleTool,
  copySelectedTextTool,
  copyPageAsMarkdownTool,
  copyPageAsTextTool,
  copyPageLinksTool,
  copyPageMetadataTool,
  // Context menu tools
  createContextMenuItemTool,
  updateContextMenuItemTool,
  removeContextMenuItemTool,
  removeAllContextMenuItemsTool,
  // Download tools
  getAllDownloadsTool,
  openDownloadTool,
  showDownloadInFolderTool,
  cancelDownloadTool,
  downloadTextAsMarkdownTool,
  // Extension tools
  getAllExtensionsTool,
  getExtensionTool,
  setExtensionEnabledTool,
  uninstallExtensionTool,
  // Session tools
  getAllSessionsTool,
  getSessionTool,
  restoreSessionTool,
  getCurrentDeviceTool,
  getAllDevicesTool,
  // Tab group tools
  ungroupAllTabsTool,
  getAllTabGroupsTool,
  createTabGroupTool,
  updateTabGroupTool,
  deleteTabGroupTool,
  // Window management tools
  getAllWindowsTool,
  getCurrentWindowTool,
  switchToWindowTool,
  createNewWindowTool,
  closeWindowTool,
  // Utility tools
  waitTool,
  waitForElementTool,
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
