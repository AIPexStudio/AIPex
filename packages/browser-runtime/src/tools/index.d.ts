import type { FunctionTool } from "@aipexstudio/aipex-core";
/**
 * All browser tools registered for AI use
 * Total: 32 tools (28 core + 4 intervention tools)
 *
 * Disabled tools (per aipex):
 * - switch_to_tab (causes context switching issues)
 * - duplicate_tab (not in aipex)
 * - wait (replaced by computer tool's wait action)
 * - capture_screenshot_to_clipboard (not enabled in aipex)
 * - download_text_as_markdown (not enabled in aipex)
 * - download_current_chat_images (architecture issue, not enabled in aipex)
 */
export declare const allBrowserTools: FunctionTool[];
export { interventionTools } from "./interventions/index.js";
interface ToolRegistryLike {
  register(tool: (typeof allBrowserTools)[number]): unknown;
}
/**
 * Register all default browser tools with a registry-like object
 */
export declare function registerDefaultBrowserTools<T extends ToolRegistryLike>(
  registry: T,
): T;
/**
 * Get the currently active tab
 * @throws Error if no active tab is found
 */
export declare function getActiveTab(): Promise<chrome.tabs.Tab>;
/**
 * Execute a script in a specific tab
 */
export declare function executeScriptInTab<T, Args extends any[]>(
  tabId: number,
  func: (...args: Args) => T,
  args: Args,
): Promise<T>;
/**
 * Execute a script in the active tab
 */
export declare function executeScriptInActiveTab<T, Args extends any[]>(
  func: (...args: Args) => T,
  args: Args,
): Promise<T>;
