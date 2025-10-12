/**
 * Custom hook for syncing context with browser tab events
 * Monitors tab changes and updates available contexts accordingly
 */

import { useEffect, useRef, useCallback } from "react";
import type { ContextItem } from "@/components/ai-elements/prompt-input";
import { getAllAvailableContexts } from "~/lib/context-providers";

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
  const rebuildContexts = useCallback((immediate = false) => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Execute immediately if requested (for initial load)
    if (immediate) {
      getAllAvailableContexts()
        .then((contexts) => {
          console.log("[useTabsSync] Initial contexts loaded:", contexts.length, "items");
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
        console.log("[useTabsSync] Contexts updated (debounced):", contexts.length, "items");
        onContextsUpdate(contexts);
      } catch (error) {
        console.error("[useTabsSync] Failed to rebuild contexts:", error);
      }
    }, debounceDelay);
  }, [onContextsUpdate, debounceDelay]);

  /**
   * Remove context tags for a closed tab
   */
  const handleTabRemoved = useCallback(
    (tabId: number) => {
      const selectedContexts = getSelectedContexts();
      const tabContextId = `tab-${tabId}`;

      // Check if the removed tab is in selected contexts
      const hasTabContext = selectedContexts.some(
        (ctx) => ctx.id === tabContextId
      );

      if (hasTabContext) {
        console.log(`Removing context for closed tab: ${tabId}`);
        onContextRemove(tabContextId);
      }

      // Also rebuild available contexts
      rebuildContexts();
    },
    [getSelectedContexts, onContextRemove, rebuildContexts]
  );

  /**
   * Handle tab activated event (current tab changed)
   */
  const handleTabActivated = useCallback(
    (_activeInfo: chrome.tabs.TabActiveInfo) => {
      // Rebuild contexts to update "Current Page" context
      rebuildContexts();
    },
    [rebuildContexts]
  );

  /**
   * Handle tab created event
   */
  const handleTabCreated = useCallback(
    (_tab: chrome.tabs.Tab) => {
      rebuildContexts();
    },
    [rebuildContexts]
  );

  /**
   * Handle tab updated event (title, URL, etc. changed)
   */
  const handleTabUpdated = useCallback(
    (
      _tabId: number,
      changeInfo: chrome.tabs.TabChangeInfo,
      _tab: chrome.tabs.Tab
    ) => {
      // Only rebuild if meaningful changes occurred
      if (changeInfo.title || changeInfo.url || changeInfo.status === "complete") {
        rebuildContexts();
      }
    },
    [rebuildContexts]
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

