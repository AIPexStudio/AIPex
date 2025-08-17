export type McpToolName =
  | "get_all_tabs"
  | "get_current_tab"
  | "switch_to_tab"
  | "organize_tabs"
  | "ungroup_tabs"
  | "get_current_tab_content"
  | "create_new_tab"
  // Bookmark management
  | "get_all_bookmarks"
  | "get_bookmark_folders"
  | "create_bookmark"
  | "delete_bookmark"
  | "search_bookmarks"
  // History management
  | "get_recent_history"
  | "search_history"
  | "delete_history_item"
  | "clear_history"
  // Window management
  | "get_all_windows"
  | "get_current_window"
  | "switch_to_window"
  | "create_new_window"
  | "close_window"
  | "minimize_window"
  | "maximize_window"
  // Tab group management
  | "get_all_tab_groups"
  | "create_tab_group"
  | "update_tab_group"
  // Utility functions
  | "get_tab_info"
  | "duplicate_tab"
  | "close_tab"

export type McpRequest =
  | { tool: "get_all_tabs" }
  | { tool: "get_current_tab" }
  | { tool: "switch_to_tab"; args: { tabId: number } }
  | { tool: "organize_tabs" }
  | { tool: "ungroup_tabs" }
  | { tool: "get_current_tab_content" }
  | { tool: "create_new_tab"; args: { url: string } }
  // Bookmark management
  | { tool: "get_all_bookmarks" }
  | { tool: "get_bookmark_folders" }
  | { tool: "create_bookmark"; args: { title: string; url: string; parentId?: string } }
  | { tool: "delete_bookmark"; args: { bookmarkId: string } }
  | { tool: "search_bookmarks"; args: { query: string } }
  // History management
  | { tool: "get_recent_history"; args?: { limit?: number } }
  | { tool: "search_history"; args: { query: string; limit?: number } }
  | { tool: "delete_history_item"; args: { url: string } }
  | { tool: "clear_history"; args?: { days?: number } }
  // Window management
  | { tool: "get_all_windows" }
  | { tool: "get_current_window" }
  | { tool: "switch_to_window"; args: { windowId: number } }
  | { tool: "create_new_window"; args?: { url?: string } }
  | { tool: "close_window"; args: { windowId: number } }
  | { tool: "minimize_window"; args: { windowId: number } }
  | { tool: "maximize_window"; args: { windowId: number } }
  // Tab group management
  | { tool: "get_all_tab_groups" }
  | { tool: "create_tab_group"; args: { tabIds: number[]; title?: string; color?: string } }
  | { tool: "update_tab_group"; args: { groupId: number; updates: { title?: string; color?: string; collapsed?: boolean } } }
  // Utility functions
  | { tool: "get_tab_info"; args: { tabId: number } }
  | { tool: "duplicate_tab"; args: { tabId: number } }
  | { tool: "close_tab"; args: { tabId: number } }

export type McpResponse =
  | { success: true; data?: any }
  | { success: false; error: string }

// Direct in-process MCP client: call exported server functions instead of messaging
import {
  getAllTabs,
  getCurrentTab,
  switchToTab,
  groupTabsByAI,
  ungroupAllTabs,
  getCurrentTabContent,
  createNewTab,
  // Bookmark management
  getAllBookmarks,
  getBookmarkFolders,
  createBookmark,
  deleteBookmark,
  searchBookmarks,
  // History management
  getRecentHistory,
  searchHistory,
  deleteHistoryItem,
  clearHistory,
  // Window management
  getAllWindows,
  getCurrentWindow,
  switchToWindow,
  createNewWindow,
  closeWindow,
  minimizeWindow,
  maximizeWindow,
  // Tab group management
  getAllTabGroups,
  createTabGroup,
  updateTabGroup,
  // Utility functions
  getTabInfo,
  duplicateTab,
  closeTab
} from "~mcp-servers"

export async function callMcpTool(request: McpRequest): Promise<McpResponse> {
  try {
    switch (request.tool) {
      case "get_all_tabs": {
        const tabs = await getAllTabs()
        return { success: true, data: tabs }
      }
      case "get_current_tab": {
        const tab = await getCurrentTab()
        return { success: true, data: tab }
      }
      case "switch_to_tab": {
        const tabId = request.args?.tabId
        if (!Number.isFinite(tabId)) return { success: false, error: "Invalid tabId" }
        await switchToTab(tabId)
        return { success: true }
      }
      case "organize_tabs": {
        await groupTabsByAI()
        return { success: true }
      }
      case "ungroup_tabs": {
        await ungroupAllTabs()
        return { success: true }
      }
      case "get_current_tab_content": {
        const content = await getCurrentTabContent()
        return { success: true, data: content }
      }
      case "create_new_tab": {
        const url = request.args?.url
        if (typeof url !== "string" || url.trim().length === 0) {
          return { success: false, error: "Invalid url" }
        }
        const data = await createNewTab(url)
        return { success: true, data }
      }
      // Bookmark management
      case "get_all_bookmarks": {
        const bookmarks = await getAllBookmarks()
        return { success: true, data: bookmarks }
      }
      case "get_bookmark_folders": {
        const folders = await getBookmarkFolders()
        return { success: true, data: folders }
      }
      case "create_bookmark": {
        const { title, url, parentId } = request.args
        if (!title || !url) {
          return { success: false, error: "Title and URL are required" }
        }
        const result = await createBookmark(title, url, parentId)
        return result.success ? { success: true, data: result } : { success: false, error: result.error || "Failed to create bookmark" }
      }
      case "delete_bookmark": {
        const { bookmarkId } = request.args
        if (!bookmarkId) {
          return { success: false, error: "Bookmark ID is required" }
        }
        const result = await deleteBookmark(bookmarkId)
        return result.success ? { success: true } : { success: false, error: result.error || "Failed to delete bookmark" }
      }
      case "search_bookmarks": {
        const { query } = request.args
        if (!query) {
          return { success: false, error: "Search query is required" }
        }
        const bookmarks = await searchBookmarks(query)
        return { success: true, data: bookmarks }
      }
      // History management
      case "get_recent_history": {
        const limit = request.args?.limit || 50
        const history = await getRecentHistory(limit)
        return { success: true, data: history }
      }
      case "search_history": {
        const { query, limit = 50 } = request.args
        if (!query) {
          return { success: false, error: "Search query is required" }
        }
        const history = await searchHistory(query, limit)
        return { success: true, data: history }
      }
      case "delete_history_item": {
        const { url } = request.args
        if (!url) {
          return { success: false, error: "URL is required" }
        }
        const result = await deleteHistoryItem(url)
        return result.success ? { success: true } : { success: false, error: result.error || "Failed to delete history item" }
      }
      case "clear_history": {
        const days = request.args?.days || 1
        const result = await clearHistory(days)
        return result.success ? { success: true } : { success: false, error: result.error || "Failed to clear history" }
      }
      // Window management
      case "get_all_windows": {
        const windows = await getAllWindows()
        return { success: true, data: windows }
      }
      case "get_current_window": {
        const window = await getCurrentWindow()
        return { success: true, data: window }
      }
      case "switch_to_window": {
        const { windowId } = request.args
        if (!Number.isFinite(windowId)) return { success: false, error: "Invalid windowId" }
        const result = await switchToWindow(windowId)
        return result.success ? { success: true } : { success: false, error: result.error || "Failed to switch window" }
      }
      case "create_new_window": {
        const { url } = request.args
        const result = await createNewWindow(url)
        return result.success ? { success: true, data: result } : { success: false, error: result.error || "Failed to create window" }
      }
      case "close_window": {
        const { windowId } = request.args
        if (!Number.isFinite(windowId)) return { success: false, error: "Invalid windowId" }
        const result = await closeWindow(windowId)
        return result.success ? { success: true } : { success: false, error: result.error || "Failed to close window" }
      }
      case "minimize_window": {
        const { windowId } = request.args
        if (!Number.isFinite(windowId)) return { success: false, error: "Invalid windowId" }
        const result = await minimizeWindow(windowId)
        return result.success ? { success: true } : { success: false, error: result.error || "Failed to minimize window" }
      }
      case "maximize_window": {
        const { windowId } = request.args
        if (!Number.isFinite(windowId)) return { success: false, error: "Invalid windowId" }
        const result = await maximizeWindow(windowId)
        return result.success ? { success: true } : { success: false, error: result.error || "Failed to maximize window" }
      }
      // Tab group management
      case "get_all_tab_groups": {
        const groups = await getAllTabGroups()
        return { success: true, data: groups }
      }
      case "create_tab_group": {
        const { tabIds, title, color } = request.args
        if (!tabIds || tabIds.length === 0) {
          return { success: false, error: "Tab IDs are required" }
        }
        const result = await createTabGroup(tabIds, title, color as any)
        return result.success ? { success: true, data: result } : { success: false, error: result.error || "Failed to create tab group" }
      }
      case "update_tab_group": {
        const { groupId, updates } = request.args
        if (!Number.isFinite(groupId)) return { success: false, error: "Invalid groupId" }
        const result = await updateTabGroup(groupId, updates as any)
        return result.success ? { success: true } : { success: false, error: result.error || "Failed to update tab group" }
      }
      // Utility functions
      case "get_tab_info": {
        const { tabId } = request.args
        if (!Number.isFinite(tabId)) return { success: false, error: "Invalid tabId" }
        const tab = await getTabInfo(tabId)
        return { success: true, data: tab }
      }
      case "duplicate_tab": {
        const { tabId } = request.args
        if (!Number.isFinite(tabId)) return { success: false, error: "Invalid tabId" }
        const result = await duplicateTab(tabId)
        return result.success ? { success: true, data: result } : { success: false, error: result.error || "Failed to duplicate tab" }
      }
      case "close_tab": {
        const { tabId } = request.args
        if (!Number.isFinite(tabId)) return { success: false, error: "Invalid tabId" }
        const result = await closeTab(tabId)
        return result.success ? { success: true } : { success: false, error: result.error || "Failed to close tab" }
      }
      default:
        return { success: false, error: "Unsupported tool" }
    }
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) }
  }
}


