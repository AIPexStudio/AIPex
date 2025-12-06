/**
 * History Context Provider
 * Provides contexts from browser browsing history
 */

import type {
  Context,
  ContextProvider,
  ContextQuery,
} from "@aipexstudio/aipex-core";

export class HistoryProvider implements ContextProvider {
  id = "browser.history";
  name = "Browsing History";
  description = "Provides contexts from browser browsing history";

  capabilities = {
    canList: true,
    canSearch: true,
    canWatch: false,
    types: ["custom" as const],
  };

  async getContexts(query?: ContextQuery): Promise<Context[]> {
    try {
      const limit = query?.limit ?? 20;

      const historyItems = await chrome.history.search({
        text: query?.search ?? "",
        maxResults: limit,
        startTime: Date.now() - 7 * 24 * 60 * 60 * 1000, // Last 7 days
      });

      return historyItems
        .filter((item) => item.url && item.title)
        .map((item) => ({
          id: `history-${item.id}`,
          type: "custom" as const,
          providerId: this.id,
          label: item.title ?? "Untitled",
          value: item.url ?? "",
          metadata: {
            url: item.url,
            title: item.title,
            lastVisitTime: item.lastVisitTime,
          },
          timestamp: Date.now(),
        }));
    } catch (error) {
      console.error("Failed to get history context:", error);
      return [];
    }
  }

  async getContext(id: string): Promise<Context | null> {
    if (!id.startsWith("history-")) return null;

    const historyId = id.replace("history-", "");

    try {
      const historyItems = await chrome.history.search({
        text: "",
        maxResults: 1000,
      });

      const item = historyItems.find((h) => h.id === historyId);
      if (!item || !item.url || !item.title) return null;

      return {
        id: `history-${item.id}`,
        type: "custom",
        providerId: this.id,
        label: item.title,
        value: item.url,
        metadata: {
          url: item.url,
          title: item.title,
          lastVisitTime: item.lastVisitTime,
        },
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error(`Failed to get history item ${historyId}:`, error);
      return null;
    }
  }
}
