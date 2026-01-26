import { tool } from "@aipexstudio/aipex-core";
import { z } from "zod";
import { getAutomationMode } from "../../../runtime/automation-mode";

export interface SimplifiedWindow {
  id: number;
  focused: boolean;
  state: string;
  type: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  tabCount: number;
}

/**
 * Get all browser windows
 */
export async function getAllWindows(): Promise<SimplifiedWindow[]> {
  const windows = await chrome.windows.getAll({ populate: true });

  return windows.map((window) => ({
    id: window.id ?? 0,
    focused: window.focused || false,
    state: window.state || "normal",
    type: window.type || "normal",
    left: window.left,
    top: window.top,
    width: window.width,
    height: window.height,
    tabCount: window.tabs?.length || 0,
  }));
}

/**
 * Get the current focused window
 */
export async function getCurrentWindow(): Promise<SimplifiedWindow | null> {
  const window = await chrome.windows.getCurrent({ populate: true });

  return {
    id: window.id ?? 0,
    focused: window.focused || false,
    state: window.state || "normal",
    type: window.type || "normal",
    left: window.left,
    top: window.top,
    width: window.width,
    height: window.height,
    tabCount: window.tabs?.length || 0,
  };
}

/**
 * Switch focus to a specific window
 */
export async function switchToWindow(windowId: number): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const mode = await getAutomationMode();
    console.log("🔧 [switchToWindow] Automation mode:", mode);

    // Background mode: reject window focus changes
    if (mode === "background") {
      return {
        success: false,
        error:
          "Window focus changes are disabled in background mode. Please switch to focus mode to use this feature.",
      };
    }

    // Focus mode: allow window focus changes
    await chrome.windows.update(windowId, { focused: true });
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Create a new browser window
 */
export async function createNewWindow(url?: string): Promise<{
  success: boolean;
  windowId?: number;
  error?: string;
}> {
  try {
    const mode = await getAutomationMode();
    console.log("🔧 [createNewWindow] Automation mode:", mode);

    // Background mode: create window without focus
    // Focus mode: create window normally (focused by default)
    const focused = mode === "focus";

    const window = await chrome.windows.create({
      url: url ? [url] : undefined,
      focused,
    });

    console.log(
      `✅ [createNewWindow] Window created in ${mode} mode (focused=${focused})`,
    );

    return { success: true, windowId: window?.id };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Close a specific window
 */
export async function closeWindow(windowId: number): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await chrome.windows.remove(windowId);
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Export the most commonly used tools
export const getAllWindowsTool = tool({
  name: "get_all_windows",
  description: "Get all browser windows",
  parameters: z.object({}),
  execute: async () => {
    const windows = await getAllWindows();
    return { success: true, windows };
  },
});

export const getCurrentWindowTool = tool({
  name: "get_current_window",
  description: "Get the current focused window",
  parameters: z.object({}),
  execute: async () => {
    const window = await getCurrentWindow();
    return { success: true, window };
  },
});

export const switchToWindowTool = tool({
  name: "switch_to_window",
  description: "Switch focus to a specific window",
  parameters: z.object({
    windowId: z.number().describe("ID of the window to switch to"),
  }),
  execute: async ({ windowId }) => {
    return await switchToWindow(windowId);
  },
});

export const createNewWindowTool = tool({
  name: "create_new_window",
  description: "Create a new browser window",
  parameters: z.object({
    url: z
      .string()
      .nullable()
      .optional()
      .describe("URL to open in the new window"),
  }),
  execute: async ({ url }) => {
    return await createNewWindow(url ?? undefined);
  },
});

export const closeWindowTool = tool({
  name: "close_window",
  description: "Close a specific window",
  parameters: z.object({
    windowId: z.number().describe("ID of the window to close"),
  }),
  execute: async ({ windowId }) => {
    return await closeWindow(windowId);
  },
});

// TODO: Uncomment and convert these tools when needed
// - minimizeWindowTool
// - maximizeWindowTool
// - restoreWindowTool
// - updateWindowTool
// - arrangeWindowsInGridTool
// - cascadeWindowsTool
