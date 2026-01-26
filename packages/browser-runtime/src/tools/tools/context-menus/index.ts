import { tool } from "@aipexstudio/aipex-core";
import { z } from "zod";

/**
 * Create context menu item
 */
export async function createContextMenuItem(options: {
  id: string;
  title: string;
  contexts?: string[];
  documentUrlPatterns?: string[];
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const createProps: chrome.contextMenus.CreateProperties = {
      id: options.id,
      title: options.title,
      documentUrlPatterns: options.documentUrlPatterns,
    };

    if (options.contexts && options.contexts.length > 0) {
      createProps.contexts = options.contexts as [
        chrome.contextMenus.ContextType,
        ...chrome.contextMenus.ContextType[],
      ];
    }

    await chrome.contextMenus.create(createProps);

    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Update context menu item
 */
export async function updateContextMenuItem(
  id: string,
  updates: {
    title?: string;
    contexts?: string[];
    documentUrlPatterns?: string[];
  },
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const updateProps: Partial<chrome.contextMenus.CreateProperties> = {
      title: updates.title,
      documentUrlPatterns: updates.documentUrlPatterns,
    };

    if (updates.contexts && updates.contexts.length > 0) {
      updateProps.contexts = updates.contexts as [
        chrome.contextMenus.ContextType,
        ...chrome.contextMenus.ContextType[],
      ];
    }

    await chrome.contextMenus.update(id, updateProps);
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Remove context menu item
 */
export async function removeContextMenuItem(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await chrome.contextMenus.remove(id);
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Remove all context menu items
 */
export async function removeAllContextMenuItems(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await chrome.contextMenus.removeAll();
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export const createContextMenuItemTool = tool({
  name: "create_context_menu_item",
  description: "Create a context menu item",
  parameters: z.object({
    id: z.string().describe("Unique ID for the context menu item"),
    title: z.string().describe("Title of the context menu item"),
    contexts: z
      .array(z.string())
      .nullable()
      .optional()
      .describe("Contexts where the menu item should appear"),
    documentUrlPatterns: z
      .array(z.string())
      .nullable()
      .optional()
      .describe("URL patterns where the menu item should appear"),
  }),
  execute: async ({ id, title, contexts, documentUrlPatterns }) => {
    return await createContextMenuItem({
      id,
      title,
      contexts: contexts ?? undefined,
      documentUrlPatterns: documentUrlPatterns ?? undefined,
    });
  },
});

export const updateContextMenuItemTool = tool({
  name: "update_context_menu_item",
  description: "Update a context menu item",
  parameters: z.object({
    id: z.string().describe("ID of the context menu item to update"),
    title: z
      .string()
      .nullable()
      .optional()
      .describe("New title for the context menu item"),
    contexts: z
      .array(z.string())
      .nullable()
      .optional()
      .describe("New contexts for the menu item"),
    documentUrlPatterns: z
      .array(z.string())
      .nullable()
      .optional()
      .describe("New URL patterns for the menu item"),
  }),
  execute: async ({ id, title, contexts, documentUrlPatterns }) => {
    return await updateContextMenuItem(id, {
      title: title ?? undefined,
      contexts: contexts ?? undefined,
      documentUrlPatterns: documentUrlPatterns ?? undefined,
    });
  },
});

export const removeContextMenuItemTool = tool({
  name: "remove_context_menu_item",
  description: "Remove a context menu item",
  parameters: z.object({
    id: z.string().describe("ID of the context menu item to remove"),
  }),
  execute: async ({ id }) => {
    return await removeContextMenuItem(id);
  },
});

export const removeAllContextMenuItemsTool = tool({
  name: "remove_all_context_menu_items",
  description: "Remove all context menu items",
  parameters: z.object({}),
  execute: async () => {
    return await removeAllContextMenuItems();
  },
});
