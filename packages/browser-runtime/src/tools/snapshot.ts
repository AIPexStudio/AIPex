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

export const searchSnapshotTool = tool({
  name: "search_snapshot",
  description:
    "Search the page snapshot for elements matching a query. Supports glob patterns and multiple terms separated by |",
  parameters: z.object({
    query: z
      .string()
      .describe(
        "Search query (supports glob patterns and | for multiple terms)",
      ),
    contextLevels: z
      .number()
      .nullable()
      .optional()
      .default(1)
      .describe("Number of context lines around matches"),
  }),
  execute: async ({ query, contextLevels }) => {
    const tab = await getActiveTab();

    if (!tab.id) {
      throw new Error("No active tab found");
    }

    const result = await snapshotManager.searchAndFormat(
      tab.id,
      query,
      contextLevels,
    );

    return {
      success: true,
      tabId: tab.id,
      result: result || "No matches found",
    };
  },
});
