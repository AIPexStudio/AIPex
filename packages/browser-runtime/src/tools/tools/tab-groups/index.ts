import { tool } from "@aipexstudio/aipex-core";
import { z } from "zod";

export interface TabGroup {
  id: number;
  title: string;
  color: string;
  collapsed: boolean;
  windowId: number;
  tabCount: number;
}

/**
 * Remove all tab groups in the current window
 */
export async function ungroupAllTabs(): Promise<{
  success: boolean;
  groupsUngrouped?: number;
  error?: string;
}> {
  try {
    const currentWindow = await chrome.windows.getCurrent();
    const groups = await chrome.tabGroups.query({ windowId: currentWindow.id });
    if (groups.length === 0) {
      return { success: true, groupsUngrouped: 0 };
    }
    for (const group of groups) {
      const tabs = await chrome.tabs.query({ groupId: group.id });
      const tabIds = tabs.map((t) => t.id).filter(Boolean) as number[];
      if (tabIds.length > 0) {
        await chrome.tabs.ungroup(tabIds as [number, ...number[]]);
      }
    }
    return { success: true, groupsUngrouped: groups.length };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get all tab groups across all windows
 */
export async function getAllTabGroups(): Promise<TabGroup[]> {
  const groups = await chrome.tabGroups.query({});

  return Promise.all(
    groups.map(async (group) => {
      const tabs = await chrome.tabs.query({ groupId: group.id });
      return {
        id: group.id,
        title: group.title || "",
        color: group.color || "grey",
        collapsed: group.collapsed || false,
        windowId: group.windowId,
        tabCount: tabs.length,
      };
    }),
  );
}

/**
 * Create a new tab group with specified tabs
 */
export async function createTabGroup(
  tabIds: number[],
  title?: string,
  color?: string,
): Promise<{ success: boolean; groupId?: number; error?: string }> {
  try {
    const groupId = await chrome.tabs.group({
      tabIds: tabIds as [number, ...number[]],
    });
    if (title || color) {
      await chrome.tabGroups.update(groupId, {
        title: title || "",
        color: (color as chrome.tabGroups.Color) || "grey",
      });
    }
    return { success: true, groupId };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Update tab group properties
 */
export async function updateTabGroup(
  groupId: number,
  updates: {
    title?: string;
    color?: string;
    collapsed?: boolean;
  },
): Promise<{ success: boolean; error?: string }> {
  try {
    await chrome.tabGroups.update(groupId, {
      ...updates,
      color: updates.color as chrome.tabGroups.Color | undefined,
    });
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Delete a tab group (ungroups all tabs in the group)
 */
export async function deleteTabGroup(groupId: number): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const tabs = await chrome.tabs.query({ groupId });
    const tabIds = tabs.map((t) => t.id).filter(Boolean) as number[];
    if (tabIds.length > 0) {
      await chrome.tabs.ungroup(tabIds as [number, ...number[]]);
    }
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export const ungroupAllTabsTool = tool({
  name: "ungroup_all_tabs",
  description: "Remove all tab groups in the current window",
  parameters: z.object({}),
  execute: async () => {
    return await ungroupAllTabs();
  },
});

export const getAllTabGroupsTool = tool({
  name: "get_all_tab_groups",
  description: "Get all tab groups across all windows",
  parameters: z.object({}),
  execute: async () => {
    const groups = await getAllTabGroups();
    return { success: true, groups };
  },
});

export const createTabGroupTool = tool({
  name: "create_tab_group",
  description: "Create a new tab group with specified tabs",
  parameters: z.object({
    tabIds: z.array(z.number()).describe("Array of tab IDs to group"),
    title: z.string().nullable().optional().describe("Title for the tab group"),
    color: z
      .enum([
        "blue",
        "red",
        "yellow",
        "green",
        "orange",
        "purple",
        "pink",
        "cyan",
        "grey",
      ])
      .nullable()
      .optional()
      .describe("Color for the tab group"),
  }),
  execute: async ({ tabIds, title, color }) => {
    return await createTabGroup(tabIds, title ?? undefined, color ?? undefined);
  },
});

export const updateTabGroupTool = tool({
  name: "update_tab_group",
  description: "Update tab group properties (title, color, collapsed state)",
  parameters: z.object({
    groupId: z.number().describe("ID of the tab group to update"),
    title: z
      .string()
      .nullable()
      .optional()
      .describe("New title for the tab group"),
    color: z
      .enum([
        "blue",
        "red",
        "yellow",
        "green",
        "orange",
        "purple",
        "pink",
        "cyan",
        "grey",
      ])
      .nullable()
      .optional()
      .describe("New color for the tab group"),
    collapsed: z
      .boolean()
      .nullable()
      .optional()
      .describe("Whether the tab group should be collapsed"),
  }),
  execute: async ({ groupId, title, color, collapsed }) => {
    return await updateTabGroup(groupId, {
      title: title ?? undefined,
      color: color ?? undefined,
      collapsed: collapsed ?? undefined,
    });
  },
});

export const deleteTabGroupTool = tool({
  name: "delete_tab_group",
  description: "Delete a tab group (ungroups all tabs in the group)",
  parameters: z.object({
    groupId: z.number().describe("ID of the tab group to delete"),
  }),
  execute: async ({ groupId }) => {
    return await deleteTabGroup(groupId);
  },
});
