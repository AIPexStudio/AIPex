/**
 * Context Providers for Browser Extension
 * Provides available context items from various browser sources
 */

import type { ContextItem } from "@/components/ai-elements/prompt-input";

/**
 * Get current page content as context
 */
export async function getCurrentPageContext(): Promise<ContextItem | null> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return null;

    // Try to get page content via content script
    let content = "";
    try {
      const result = await chrome.tabs.sendMessage(tab.id, { action: "getPageContent" });
      content = result?.content || "";
    } catch (msgError) {
      // Content script not available, use tab info only
      console.warn("Content script not available, using tab info only:", msgError);
      content = `URL: ${tab.url}\nTitle: ${tab.title}`;
    }

    return {
      id: `page-${tab.id}`,
      type: "page",
      label: tab.title || "Current Page",
      value: content,
      metadata: {
        url: tab.url,
        title: tab.title,
      },
    };
  } catch (error) {
    console.error("Failed to get current page context:", error);
    return null;
  }
}

/**
 * Get all open tabs as context options
 */
export async function getTabsContext(): Promise<ContextItem[]> {
  try {
    const tabs = await chrome.tabs.query({});

    return tabs
      .filter((tab) => tab.id && tab.title)
      .map((tab) => ({
        id: `tab-${tab.id}`,
        type: "tab" as const,
        label: tab.title || "Untitled",
        value: tab.url || "",
        metadata: {
          url: tab.url,
          title: tab.title,
          favIconUrl: tab.favIconUrl,
        },
      }));
  } catch (error) {
    console.error("Failed to get tabs context:", error);
    return [];
  }
}

/**
 * Get clipboard content as context
 * Note: Disabled due to permission requirements
 */
export async function getClipboardContext(): Promise<ContextItem | null> {
  // Clipboard API requires special permissions and user interaction
  // Disabled for now
  return null;

  /* Uncomment if you want to enable clipboard support
  try {
    const text = await navigator.clipboard.readText();
    
    if (!text) return null;

    return {
      id: "clipboard",
      type: "clipboard",
      label: text.length > 50 ? `${text.slice(0, 50)}...` : text,
      value: text,
      metadata: {
        length: text.length,
      },
    };
  } catch (error) {
    console.error("Failed to get clipboard context:", error);
    return null;
  }
  */
}

/**
 * Get bookmarks as context options
 */
export async function getBookmarksContext(): Promise<ContextItem[]> {
  try {
    const tree = await chrome.bookmarks.getTree();
    const bookmarks: ContextItem[] = [];

    function traverseBookmarks(nodes: chrome.bookmarks.BookmarkTreeNode[]) {
      for (const node of nodes) {
        if (node.url) {
          bookmarks.push({
            id: `bookmark-${node.id}`,
            type: "bookmark",
            label: node.title || "Untitled",
            value: node.url,
            metadata: {
              url: node.url,
              title: node.title,
            },
          });
        }
        if (node.children) {
          traverseBookmarks(node.children);
        }
      }
    }

    traverseBookmarks(tree);

    // Limit to recent/relevant bookmarks
    return bookmarks.slice(0, 50);
  } catch (error) {
    console.error("Failed to get bookmarks context:", error);
    return [];
  }
}

/**
 * Capture screenshot as context
 */
export async function getScreenshotContext(): Promise<ContextItem | null> {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab({
      format: "png",
    });

    return {
      id: "screenshot",
      type: "screenshot",
      label: "Current Screenshot",
      value: dataUrl,
      metadata: {
        timestamp: Date.now(),
      },
    };
  } catch (error) {
    console.error("Failed to capture screenshot:", error);
    return null;
  }
}

/**
 * Get browsing history as context options
 */
export async function getHistoryContext(maxResults = 20): Promise<ContextItem[]> {
  try {
    const historyItems = await chrome.history.search({
      text: "",
      maxResults,
      startTime: Date.now() - 7 * 24 * 60 * 60 * 1000, // Last 7 days
    });

    return historyItems
      .filter((item) => item.url && item.title)
      .map((item) => ({
        id: `history-${item.id}`,
        type: "custom" as const,
        label: item.title || "Untitled",
        value: item.url || "",
        metadata: {
          url: item.url,
          title: item.title,
          lastVisitTime: item.lastVisitTime,
        },
      }));
  } catch (error) {
    console.error("Failed to get history context:", error);
    return [];
  }
}

/**
 * Get all available contexts
 * This is the main function to call to populate the context menu
 */
export async function getAllAvailableContexts(): Promise<ContextItem[]> {
  const results = await Promise.allSettled([
    getCurrentPageContext(),
    getTabsContext(),
    getBookmarksContext(),
    // Clipboard is disabled due to permission requirements
    // getClipboardContext(),
  ]);

  const contexts: ContextItem[] = [];

  // Current page
  if (results[0].status === "fulfilled" && results[0].value) {
    contexts.push(results[0].value);
  }

  // Tabs
  if (results[1].status === "fulfilled") {
    contexts.push(...results[1].value);
  }

  // Bookmarks
  if (results[2].status === "fulfilled") {
    contexts.push(...results[2].value);
  }

  return contexts;
}

/**
 * Search contexts by query
 */
export function searchContexts(
  contexts: ContextItem[],
  query: string
): ContextItem[] {
  if (!query) return contexts;

  const lowerQuery = query.toLowerCase();
  return contexts.filter(
    (ctx) =>
      ctx.label.toLowerCase().includes(lowerQuery) ||
      ctx.value.toLowerCase().includes(lowerQuery)
  );
}
