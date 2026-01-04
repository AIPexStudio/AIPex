import { tool } from "@aipexstudio/aipex-core";
import { z } from "zod";
import { snapshotManager } from "../automation";
import { getActiveTab } from "./index";

export const takeSnapshotTool = tool({
  name: "take_snapshot",
  description:
    "Take an accessibility snapshot of the current page. Returns a tree of interactive elements with UIDs for interaction.",
  parameters: z.object({}),
  execute: async () => {
    const tab = await getActiveTab();

    if (!tab.id) {
      throw new Error("No active tab found");
    }

    const snapshot = await snapshotManager.createSnapshot(tab.id);
    const snapshotText = snapshotManager.formatSnapshot(snapshot);

    return {
      success: true,
      tabId: tab.id,
      title: tab.title || "",
      url: tab.url || "",
      snapshot: snapshotText,
    };
  },
});

export const searchElementsTool = tool({
  name: "search_elements",
  description:
    "Search for elements in the current page using a query string with grep/glob pattern support",
  parameters: z.object({
    tabId: z.number().describe("The ID of the tab to search the elements in"),
    query: z
      .string()
      .describe("Search query string with grep/glob pattern support"),
    contextLevels: z
      .number()
      .optional()
      .default(1)
      .describe("Number of context lines to include"),
  }),
  execute: async ({
    tabId,
    query,
    contextLevels = 1,
  }: {
    tabId: number;
    query: string;
    contextLevels?: number;
  }) => {
    try {
      // Verify tab exists
      const tab = await chrome.tabs.get(tabId);
      if (!tab) {
        return {
          success: false,
          message: "No accessible tab found",
          data: "",
        };
      }

      const result = await snapshotManager.searchAndFormat(
        tabId,
        query,
        contextLevels,
      );

      if (!result) {
        return {
          success: false,
          message: "Failed to search snapshot text",
          data: "",
        };
      }

      return {
        success: true,
        message: "Search completed successfully",
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        data: "",
      };
    }
  },
});
