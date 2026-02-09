import type { FunctionTool } from "@aipexstudio/aipex-core";
import type { z } from "zod";
import { computerTool } from "./computer";
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
import { captureScreenshotTool, captureTabScreenshotTool } from "./screenshot";
import { skillTools } from "./skill";
import { searchElementsTool } from "./snapshot";
import {
  closeTabTool,
  createNewTabTool,
  getAllTabsTool,
  getCurrentTabTool,
  getTabInfoTool,
  ungroupTabsTool,
} from "./tab";
import { downloadChatImagesTool, downloadImageTool } from "./tools/downloads";

/**
 * All browser tools registered for AI use
 * Total: 31 tools (27 core + 4 intervention tools)
 *
 * Disabled tools (per aipex):
 * - switch_to_tab (causes context switching issues)
 * - duplicate_tab (not in aipex)
 * - wait (replaced by computer tool's wait action)
 * - capture_screenshot_to_clipboard (not enabled in aipex)
 * - download_text_as_markdown (not enabled in aipex)
 * - download_current_chat_images (architecture issue, not enabled in aipex)
 * - organize_tabs (stub implementation, temporarily disabled until AI grouping is complete)
 */
type BrowserFunctionTool = FunctionTool<
  unknown,
  z.ZodObject<any, any>,
  unknown
>;

const browserFunctionTools: BrowserFunctionTool[] = [
  // Browser/Tab Management (6 tools)
  // Note: organize_tabs temporarily disabled (stub/not shipped)
  getAllTabsTool,
  getCurrentTabTool,
  createNewTabTool,
  getTabInfoTool,
  closeTabTool,
  ungroupTabsTool,

  // UI Operations (7 tools) - computer tool replaces visual XY tools
  searchElementsTool,
  clickTool,
  fillElementByUidTool,
  getEditorValueTool,
  fillFormTool,
  hoverElementByUidTool,
  computerTool,

  // Page Content (4 tools)
  getPageMetadataTool,
  scrollToElementTool,
  highlightElementTool,
  highlightTextInlineTool,

  // Screenshot (2 tools)
  captureScreenshotTool,
  captureTabScreenshotTool,

  // Download (2 tools)
  downloadImageTool,
  downloadChatImagesTool,

  // Intervention (4 tools)
  ...interventionTools,

  // Skills (6 tools)
  ...skillTools,
] as const;

export const allBrowserTools: FunctionTool[] =
  browserFunctionTools as unknown as FunctionTool[];

export type { BrowserFunctionTool };

// Note: takeSnapshotTool is not included in allBrowserTools as it's called internally
// Skills tools are enabled to match aipex tool set

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
