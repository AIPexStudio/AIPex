/**
 * Custom hook for syncing context with browser tab events
 * Monitors tab changes and updates available contexts accordingly
 */

import type { Context } from "@aipexstudio/aipex-core";
import type { ContextItem } from "@aipexstudio/aipex-react/components/ai-elements/prompt-input";
import {
  BookmarksProvider,
  CurrentPageProvider,
  TabsProvider,
} from "@aipexstudio/browser-runtime";
import { useCallback, useEffect, useRef } from "react";

const currentPageProvider = new CurrentPageProvider();
const tabsProvider = new TabsProvider();
const bookmarksProvider = new BookmarksProvider();

/**
 * Get all available contexts from providers
 * Converts core Context to UI ContextItem
 */
async function getAllAvailableContexts(): Promise<ContextItem[]> {
  const results = await Promise.allSettled([
    currentPageProvider.getContexts(),
    tabsProvider.getContexts(),
    bookmarksProvider.getContexts(),
  ]);

  const contexts: Context[] = [];
  let currentPageTabId: number | null = null;
  let currentPageUrl: string | null = null;

  // Current page - add first and record its tab ID and URL
  if (results[0].status === "fulfilled" && results[0].value.length > 0) {
    const currentPage = results[0].value[0]!;
    contexts.push(currentPage);

    // Extract tab ID from metadata
    currentPageTabId = currentPage.metadata?.tabId as number | null;
    currentPageUrl = currentPage.metadata?.url as string | null;
  }

  // Tabs - exclude the current page tab
  if (results[1].status === "fulfilled") {
    const allTabs = results[1].value;
    const filteredTabs = allTabs.filter((tab) => {
      const tabId = tab.metadata?.tabId as number | undefined;
      if (currentPageTabId !== null && tabId === currentPageTabId) {
        return false;
      }
      return true;
    });
    contexts.push(...filteredTabs);
  }

  // Bookmarks - exclude if URL matches current page
  if (results[2].status === "fulfilled") {
    const allBookmarks = results[2].value;
    const filteredBookmarks = allBookmarks.filter((bookmark) => {
      if (currentPageUrl && bookmark.metadata?.url === currentPageUrl) {
        return false;
      }
      return true;
    });
    contexts.push(...filteredBookmarks);
  }

  // Convert core Context to UI ContextItem
  return contexts.map((ctx) => ({
    id: ctx.id,
    type: ctx.type as ContextItem["type"],
    label: ctx.label,
    value: typeof ctx.value === "string" ? ctx.value : "",
    metadata: ctx.metadata,
  }));
}

interface UseTabsSyncOptions {
  /**
   * Callback to update available contexts
   */
  onContextsUpdate: (contexts: ContextItem[]) => void;

  /**
   * Callback to remove a specific context by ID
   */
  onContextRemove: (contextId: string) => void;

  /**
   * Get currently selected context items
   */
  getSelectedContexts: () => ContextItem[];

  /**
   * Debounce delay in milliseconds (default: 300ms)
   */
  debounceDelay?: number;
}

/**
 * Hook to sync available contexts with browser tab events
 * - Refreshes available contexts when tabs are created, removed, or updated
 * - Automatically removes context tags for closed tabs
 */
export function useTabsSync({
  onContextsUpdate,
  onContextRemove,
  getSelectedContexts,
  debounceDelay = 300,
}: UseTabsSyncOptions) {
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  /**
   * Rebuild available contexts with debounce
   */
  const rebuildContexts = useCallback(
    (immediate = false) => {
      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Execute immediately if requested (for initial load)
      if (immediate) {
        getAllAvailableContexts()
          .then((contexts) => {
            onContextsUpdate(contexts);
          })
          .catch((error) => {
            console.error("[useTabsSync] Failed to rebuild contexts:", error);
          });
        return;
      }

      // Set new timer for debounced updates
      debounceTimerRef.current = setTimeout(async () => {
        try {
          const contexts = await getAllAvailableContexts();
          onContextsUpdate(contexts);
        } catch (error) {
          console.error("[useTabsSync] Failed to rebuild contexts:", error);
        }
      }, debounceDelay);
    },
    [onContextsUpdate, debounceDelay],
  );

  /**
   * Remove context tags for a closed tab
   */
  const handleTabRemoved = useCallback(
    (tabId: number) => {
      const selectedContexts = getSelectedContexts();
      const tabContextId = `tab-${tabId}`;

      // Check if the removed tab is in selected contexts
      const hasTabContext = selectedContexts.some(
        (ctx) => ctx.id === tabContextId,
      );

      if (hasTabContext) {
        onContextRemove(tabContextId);
      }

      // Also rebuild available contexts
      rebuildContexts();
    },
    [getSelectedContexts, onContextRemove, rebuildContexts],
  );

  /**
   * Handle tab activated event (current tab changed)
   */
  const handleTabActivated = useCallback(
    (_activeInfo: { tabId: number; windowId: number }) => {
      // Rebuild contexts to update "Current Page" context
      rebuildContexts();
    },
    [rebuildContexts],
  );

  /**
   * Handle tab created event
   */
  const handleTabCreated = useCallback(
    (_tab: chrome.tabs.Tab) => {
      rebuildContexts();
    },
    [rebuildContexts],
  );

  /**
   * Handle tab updated event (title, URL, etc. changed)
   */
  const handleTabUpdated = useCallback(
    (
      _tabId: number,
      changeInfo: { title?: string; url?: string; status?: string },
      _tab: chrome.tabs.Tab,
    ) => {
      // Only rebuild if meaningful changes occurred
      if (
        changeInfo.title ||
        changeInfo.url ||
        changeInfo.status === "complete"
      ) {
        rebuildContexts();
      }
    },
    [rebuildContexts],
  );

  /**
   * Initialize and setup event listeners
   */
  useEffect(() => {
    // Load initial contexts immediately (no debounce)
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      rebuildContexts(true); // Pass true to load immediately
    }

    // Setup Chrome tab event listeners
    chrome.tabs.onActivated.addListener(handleTabActivated);
    chrome.tabs.onCreated.addListener(handleTabCreated);
    chrome.tabs.onRemoved.addListener(handleTabRemoved);
    chrome.tabs.onUpdated.addListener(handleTabUpdated);

    // Cleanup function
    return () => {
      // Clear debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Remove event listeners
      chrome.tabs.onActivated.removeListener(handleTabActivated);
      chrome.tabs.onCreated.removeListener(handleTabCreated);
      chrome.tabs.onRemoved.removeListener(handleTabRemoved);
      chrome.tabs.onUpdated.removeListener(handleTabUpdated);
    };
  }, [
    handleTabActivated,
    handleTabCreated,
    handleTabRemoved,
    handleTabUpdated,
    rebuildContexts,
  ]);
}
