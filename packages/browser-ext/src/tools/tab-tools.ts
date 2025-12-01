import { tool } from "@aipexstudio/aipex-core";
import { z } from "zod/v3";
import { getActiveTab } from "./utils";

/**
 * List all open tabs
 */
export const listTabsTool = tool({
  name: "list_tabs",
  description: "Get a list of all open tabs in the current window",
  parameters: z.object({
    allWindows: z
      .boolean()
      .optional()
      .describe("Whether to include tabs from all windows"),
  }),
  execute: async ({ allWindows = false }) => {
    const query = allWindows ? {} : { currentWindow: true };
    const tabs = await chrome.tabs.query(query);

    return {
      tabs: tabs.map((tab) => ({
        id: tab.id,
        url: tab.url,
        title: tab.title,
        active: tab.active,
        windowId: tab.windowId,
      })),
      count: tabs.length,
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
    tabId: z.number().optional().describe("Tab ID to switch to"),
    urlPattern: z
      .string()
      .optional()
      .describe("URL pattern to match (e.g., 'github.com')"),
  }),
  execute: async ({ tabId, urlPattern }) => {
    if (tabId) {
      await chrome.tabs.update(tabId, { active: true });
      const tab = await chrome.tabs.get(tabId);
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
      .optional()
      .describe("Tab ID to close (defaults to current tab)"),
  }),
  execute: async ({ tabId }) => {
    if (tabId) {
      await chrome.tabs.remove(tabId);
      return { success: true, tabId };
    }

    const tab = await getActiveTab();
    await chrome.tabs.remove(tab.id!);
    return { success: true, tabId: tab.id };
  },
});

/**
 * Create a new tab
 */
export const createTabTool = tool({
  name: "create_tab",
  description: "Create a new tab with a specific URL",
  parameters: z.object({
    url: z.string().url().describe("URL to open in the new tab"),
    active: z
      .boolean()
      .optional()
      .describe("Whether to make the new tab active"),
  }),
  execute: async ({ url, active = true }) => {
    const tab = await chrome.tabs.create({ url, active });
    return {
      success: true,
      tab: { id: tab.id, url: tab.url, title: tab.title },
    };
  },
});

/**
 * Reload a tab
 */
export const reloadTabTool = tool({
  name: "reload_tab",
  description: "Reload a specific tab or the current tab",
  parameters: z.object({
    tabId: z
      .number()
      .optional()
      .describe("Tab ID to reload (defaults to current tab)"),
    bypassCache: z
      .boolean()
      .optional()
      .describe("Whether to bypass the cache when reloading"),
  }),
  execute: async ({ tabId, bypassCache = false }) => {
    if (tabId) {
      await chrome.tabs.reload(tabId, { bypassCache });
      return { success: true, tabId };
    }

    const tab = await getActiveTab();
    await chrome.tabs.reload(tab.id!, { bypassCache });
    return { success: true, tabId: tab.id };
  },
});

/**
 * Duplicate a tab
 */
export const duplicateTabTool = tool({
  name: "duplicate_tab",
  description: "Duplicate a specific tab or the current tab",
  parameters: z.object({
    tabId: z
      .number()
      .optional()
      .describe("Tab ID to duplicate (defaults to current tab)"),
  }),
  execute: async ({ tabId }) => {
    if (tabId) {
      const newTab = await chrome.tabs.duplicate(tabId);
      if (!newTab) {
        throw new Error("Failed to duplicate tab");
      }
      return {
        success: true,
        newTab: { id: newTab.id, url: newTab.url, title: newTab.title },
      };
    }

    const tab = await getActiveTab();
    const newTab = await chrome.tabs.duplicate(tab.id!);
    if (!newTab) {
      throw new Error("Failed to duplicate tab");
    }
    return {
      success: true,
      newTab: { id: newTab.id, url: newTab.url, title: newTab.title },
    };
  },
});
