import { tool } from "@aipexstudio/aipex-core";
import { z } from "zod";

export interface HistoryItem {
  id: string;
  url: string;
  title: string;
  lastVisitTime: number;
  visitCount: number;
}

export const getRecentHistoryTool = tool({
  name: "get_recent_history",
  description: "Get recent browsing history (last 7 days)",
  parameters: z.object({
    limit: z
      .number()
      .nullable()
      .optional()
      .default(50)
      .describe("Maximum number of history items to return"),
  }),
  execute: async ({ limit }) => {
    const endTime = Date.now();
    const startTime = endTime - 7 * 24 * 60 * 60 * 1000;
    const maxResults = limit ?? 50;

    const history = await chrome.history.search({
      text: "",
      startTime,
      endTime,
      maxResults,
    });

    return {
      success: true,
      history: history.map((item) => ({
        id: item.id,
        url: item.url || "",
        title: item.title || "",
        lastVisitTime: item.lastVisitTime || 0,
        visitCount: item.visitCount || 0,
      })),
    };
  },
});

export const searchHistoryTool = tool({
  name: "search_history",
  description: "Search browsing history",
  parameters: z.object({
    query: z.string().describe("Search query"),
    limit: z
      .number()
      .nullable()
      .optional()
      .default(50)
      .describe("Maximum number of results"),
  }),
  execute: async ({ query, limit }) => {
    const maxResults = limit ?? 50;
    const history = await chrome.history.search({
      text: query,
      maxResults,
    });

    return {
      success: true,
      history: history.map((item) => ({
        id: item.id,
        url: item.url || "",
        title: item.title || "",
        lastVisitTime: item.lastVisitTime || 0,
        visitCount: item.visitCount || 0,
      })),
    };
  },
});

export const deleteHistoryItemTool = tool({
  name: "delete_history_item",
  description: "Delete a specific history item by URL",
  parameters: z.object({
    url: z.string().describe("The URL to delete from history"),
  }),
  execute: async ({ url }) => {
    await chrome.history.deleteUrl({ url });

    return {
      success: true,
      message: "History item deleted successfully",
    };
  },
});

export const clearHistoryTool = tool({
  name: "clear_history",
  description: "Clear browsing history for specified number of days",
  parameters: z.object({
    days: z
      .number()
      .nullable()
      .optional()
      .default(1)
      .describe("Number of days of history to clear"),
  }),
  execute: async ({ days }) => {
    const endTime = Date.now();
    const daysValue = days ?? 1;
    const startTime = endTime - daysValue * 24 * 60 * 60 * 1000;

    await chrome.history.deleteRange({ startTime, endTime });

    return {
      success: true,
      message: `History for the last ${daysValue} day(s) cleared successfully`,
    };
  },
});

export const getMostVisitedSitesTool = tool({
  name: "get_most_visited_sites",
  description: "Get the most visited sites in the last 30 days",
  parameters: z.object({
    limit: z
      .number()
      .nullable()
      .optional()
      .default(25)
      .describe("Maximum number of sites to return"),
  }),
  execute: async ({ limit }) => {
    const endTime = Date.now();
    const startTime = endTime - 30 * 24 * 60 * 60 * 1000;
    const maxSites = limit ?? 25;

    const history = await chrome.history.search({
      text: "",
      startTime,
      endTime,
      maxResults: 1000,
    });

    const urlCounts = new Map<
      string,
      { url: string; title: string; visitCount: number; lastVisitTime: number }
    >();

    for (const item of history) {
      const url = item.url || "";
      if (!url) continue;

      const existing = urlCounts.get(url);
      if (existing) {
        existing.visitCount += item.visitCount || 0;
        if ((item.lastVisitTime || 0) > existing.lastVisitTime) {
          existing.lastVisitTime = item.lastVisitTime || 0;
          existing.title = item.title || existing.title;
        }
      } else {
        urlCounts.set(url, {
          url,
          title: item.title || "",
          visitCount: item.visitCount || 0,
          lastVisitTime: item.lastVisitTime || 0,
        });
      }
    }

    const mostVisited = Array.from(urlCounts.values())
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, maxSites)
      .map((item, index) => ({
        id: `most-visited-${index}`,
        url: item.url,
        title: item.title,
        lastVisitTime: item.lastVisitTime,
        visitCount: item.visitCount,
      }));

    return {
      success: true,
      sites: mostVisited,
    };
  },
});

export const getHistoryStatsTool = tool({
  name: "get_history_stats",
  description: "Get browsing history statistics",
  parameters: z.object({}),
  execute: async () => {
    const endTime = Date.now();
    const startTime = 0;

    const history = await chrome.history.search({
      text: "",
      startTime,
      endTime,
      maxResults: 100000,
    });

    let totalVisits = 0;
    let oldestVisit = endTime;
    let newestVisit = 0;

    for (const item of history) {
      totalVisits += item.visitCount || 0;
      const visitTime = item.lastVisitTime || 0;
      if (visitTime > 0) {
        if (visitTime < oldestVisit) oldestVisit = visitTime;
        if (visitTime > newestVisit) newestVisit = visitTime;
      }
    }

    return {
      success: true,
      stats: {
        totalItems: history.length,
        totalVisits,
        oldestVisit: oldestVisit === endTime ? 0 : oldestVisit,
        newestVisit,
      },
    };
  },
});
