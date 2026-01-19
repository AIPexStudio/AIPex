import { tool } from "@aipexstudio/aipex-core";
import { z } from "zod";
import { getActiveTab } from "./index";
/**
 * Get all open tabs across all windows
 */
export const getAllTabsTool = tool({
  name: "get_all_tabs",
  description:
    "Get all open tabs across all windows with their IDs, titles, and URLs",
  parameters: z.object({}),
  execute: async () => {
    const tabs = await chrome.tabs.query({});
    return {
      tabs: tabs.map((tab) => ({
        id: tab.id,
        url: tab.url,
        title: tab.title,
        active: tab.active,
        windowId: tab.windowId,
        index: tab.index,
      })),
      count: tabs.length,
    };
  },
});
/**
 * Get information about the currently active tab
 */
export const getCurrentTabTool = tool({
  name: "get_current_tab",
  description: "Get information about the currently active tab",
  parameters: z.object({}),
  execute: async () => {
    const tab = await getActiveTab();
    return {
      id: tab.id,
      url: tab.url,
      title: tab.title,
      windowId: tab.windowId,
      index: tab.index,
    };
  },
});
/**
 * Switch to a specific tab
 */
export const switchToTabTool = tool({
  name: "switch_to_tab",
  description: "Switch to a specific tab by ID or URL pattern",
  parameters: z.object({
    tabId: z.number().nullable().optional().describe("Tab ID to switch to"),
    urlPattern: z
      .string()
      .nullable()
      .optional()
      .describe("URL pattern to match (e.g., 'github.com')"),
  }),
  execute: async ({ tabId, urlPattern }) => {
    if (tabId != null) {
      await chrome.tabs.update(tabId, { active: true });
      const tab = await chrome.tabs.get(tabId);
      if (!tab.id) {
        throw new Error("Tab not found");
      }
      return {
        success: true,
        tab: { id: tab.id, url: tab.url, title: tab.title },
      };
    }
    if (urlPattern) {
      const tabs = await chrome.tabs.query({ currentWindow: true });
      const matchingTab = tabs.find((tab) => tab.url?.includes(urlPattern));
      if (!matchingTab?.id) {
        throw new Error(`No tab found matching pattern: ${urlPattern}`);
      }
      await chrome.tabs.update(matchingTab.id, { active: true });
      return {
        success: true,
        tab: {
          id: matchingTab.id,
          url: matchingTab.url,
          title: matchingTab.title,
        },
      };
    }
    throw new Error("Either tabId or urlPattern must be provided");
  },
});
/**
 * Close a tab
 */
export const closeTabTool = tool({
  name: "close_tab",
  description: "Close a specific tab or the current tab",
  parameters: z.object({
    tabId: z
      .number()
      .nullable()
      .optional()
      .describe("Tab ID to close (defaults to current tab)"),
  }),
  execute: async ({ tabId }) => {
    if (tabId != null) {
      await chrome.tabs.remove(tabId);
      return { success: true, tabId };
    }
    const tab = await getActiveTab();
    await chrome.tabs.remove(tab.id);
    return { success: true, tabId: tab.id };
  },
});
/**
 * Create a new tab
 */
export const createNewTabTool = tool({
  name: "create_new_tab",
  description: "Create a new tab with the specified URL",
  parameters: z.object({
    url: z.string().url().describe("The URL to open in the new tab"),
  }),
  execute: async ({ url }) => {
    const tab = await chrome.tabs.create({ url, active: true });
    if (!tab.id) {
      throw new Error("Failed to create tab");
    }
    return {
      success: true,
      tabId: tab.id,
      url: tab.url,
      title: tab.title,
    };
  },
});
/**
 * Get detailed information about a specific tab
 */
export const getTabInfoTool = tool({
  name: "get_tab_info",
  description: "Get detailed information about a specific tab",
  parameters: z.object({
    tabId: z.number().describe("The ID of the tab"),
  }),
  execute: async ({ tabId }) => {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (!tab || typeof tab.id !== "number") {
        return null;
      }
      return {
        id: tab.id,
        index: tab.index || 0,
        windowId: tab.windowId || 0,
        title: tab.title,
        url: tab.url,
      };
    } catch {
      return null;
    }
  },
});
/**
 * Duplicate a tab
 */
export const duplicateTabTool = tool({
  name: "duplicate_tab",
  description: "Duplicate an existing tab",
  parameters: z.object({
    tabId: z.number().describe("The ID of the tab to duplicate"),
  }),
  execute: async ({ tabId }) => {
    const newTab = await chrome.tabs.duplicate(tabId);
    if (!newTab || !newTab.id) {
      return { success: false, error: "Failed to duplicate tab" };
    }
    return {
      success: true,
      newTabId: newTab.id,
    };
  },
});
/**
 * Use AI to automatically group tabs by topic/purpose
 */
export const organizeTabsTool = tool({
  name: "organize_tabs",
  description: "Use AI to automatically group tabs by topic/purpose",
  parameters: z.object({}),
  execute: async () => {
    // This is a placeholder - the actual AI grouping logic would be complex
    // For now, return a message indicating this feature needs implementation
    return {
      success: false,
      message:
        "AI-powered tab organization requires additional implementation with LLM integration",
    };
  },
});
/**
 * Remove all tab groups in the current window
 */
export const ungroupTabsTool = tool({
  name: "ungroup_tabs",
  description: "Remove all tab groups in the current window",
  parameters: z.object({}),
  execute: async () => {
    try {
      const tabs = await chrome.tabs.query({ currentWindow: true });
      let ungroupedCount = 0;
      for (const tab of tabs) {
        if (tab.groupId && tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
          if (tab.id) {
            await chrome.tabs.ungroup(tab.id);
            ungroupedCount++;
          }
        }
      }
      return {
        success: true,
        ungroupedCount,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || "Failed to ungroup tabs",
      };
    }
  },
});
