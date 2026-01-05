import type { FunctionTool } from "@aipexstudio/aipex-core";
import {
  clickTool,
  fillElementByUidTool,
  fillFormTool,
  getEditorValueTool,
  hoverElementByUidTool,
} from "./element";
import { interventionTools } from "./interventions/index.js";
import {
  getPageMetadataTool,
  highlightElementTool,
  highlightTextInlineTool,
  scrollToElementTool,
} from "./page";
import {
  captureScreenshotToClipboardTool,
  captureScreenshotTool,
  captureTabScreenshotTool,
} from "./screenshot";
import { searchElementsTool } from "./snapshot";
// Import core tools only (27 tools total, excluding intervention and skills)
import {
  closeTabTool,
  createNewTabTool,
  duplicateTabTool,
  getAllTabsTool,
  getCurrentTabTool,
  getTabInfoTool,
  organizeTabsTool,
  switchToTabTool,
  ungroupTabsTool,
} from "./tab";
import {
  downloadChatImagesTool,
  downloadCurrentChatImagesTool,
  downloadImageTool,
  downloadTextAsMarkdownTool,
} from "./tools/downloads";
import { waitTool } from "./tools/utils/wait-helper";

/**
 * All browser tools registered for AI use
 * Total: 31 tools (27 core + 4 intervention tools)
 */
export const allBrowserTools: FunctionTool[] = [
  // Browser/Tab Management (9 tools)
  getAllTabsTool,
  getCurrentTabTool,
  switchToTabTool,
  createNewTabTool,
  getTabInfoTool,
  duplicateTabTool,
  closeTabTool,
  organizeTabsTool,
  ungroupTabsTool,

  // UI Operations (7 tools)
  searchElementsTool,
  clickTool,
  fillElementByUidTool,
  getEditorValueTool,
  fillFormTool,
  hoverElementByUidTool,
  waitTool,

  // Page Content (4 tools)
  getPageMetadataTool,
  scrollToElementTool,
  highlightElementTool,
  highlightTextInlineTool,

  // Screenshot (3 tools)
  captureScreenshotTool,
  captureTabScreenshotTool,
  captureScreenshotToClipboardTool,

  // Download (4 tools)
  downloadTextAsMarkdownTool,
  downloadImageTool,
  downloadChatImagesTool,
  downloadCurrentChatImagesTool,

  // Intervention (4 tools)
  ...interventionTools,
] as const;

// Note: takeSnapshotTool is not included in allBrowserTools as it's called internally
// Skills tools (6) will be added in later phases

// Export intervention tools separately for optional registration
export { interventionTools } from "./interventions/index.js";

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
