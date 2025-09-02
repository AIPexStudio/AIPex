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
  // Page content
  | "get_page_metadata"
  | "extract_page_text"
  | "get_page_links"
  | "get_page_images"
  | "search_page_text"
  | "get_page_performance"
  | "get_page_accessibility"
  | "get_interactive_elements"
  | "click_element"
  | "summarize_page"
  | "fill_input"
  | "clear_input"
  | "get_input_value"
  | "submit_form"
  | "get_form_elements"
  | "scroll_to_element"
  | "highlight_element"
  | "highlight_text_inline"
  // Clipboard
  | "copy_to_clipboard"
  | "read_from_clipboard"
  | "copy_current_page_url"
  | "copy_current_page_title"
  | "copy_selected_text"
  | "copy_page_as_markdown"
  | "copy_page_as_text"
  | "copy_page_links"
  | "copy_page_metadata"
  // Storage
  | "get_storage_value"
  | "set_storage_value"
  | "remove_storage_value"
  | "get_all_storage_keys"
  | "clear_all_storage"
  | "get_extension_settings"
  | "update_extension_settings"
  | "get_ai_config"
  | "set_ai_config"
  | "export_storage_data"
  | "import_storage_data"
  | "get_storage_stats"
  // Utils
  | "get_browser_info"
  | "get_system_info"
  | "get_current_datetime"
  | "format_timestamp"
  | "generate_random_string"
  | "validate_url"
  | "extract_domain"
  | "get_url_parameters"
  | "build_url"
  | "get_text_stats"
  | "convert_text_case"
  | "check_permissions"
  // Extensions
  | "get_all_extensions"
  | "get_extension"
  | "set_extension_enabled"
  | "uninstall_extension"
  | "get_extension_permissions"
  // Downloads
  | "get_all_downloads"
  | "get_download"
  | "pause_download"
  | "resume_download"
  | "cancel_download"
  | "remove_download"
  | "open_download"
  | "show_download_in_folder"
  | "get_download_stats"
  | "download_text_as_markdown"
  // Sessions
  | "get_all_sessions"
  | "get_session"
  | "restore_session"
  | "get_current_device"
  | "get_all_devices"
  // Context Menus
  | "create_context_menu_item"
  | "update_context_menu_item"
  | "remove_context_menu_item"
  | "remove_all_context_menu_items"
  | "get_context_menu_items"
  // Screenshot
  | "capture_screenshot"
  | "capture_tab_screenshot" 
  | "capture_screenshot_to_clipboard"
  | "read_clipboard_image"
  | "get_clipboard_image_info"

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
  // Page content
  | { tool: "get_page_metadata" }
  | { tool: "extract_page_text" }
  | { tool: "get_page_links" }
  | { tool: "get_page_images" }
  | { tool: "search_page_text"; args: { query: string } }
  | { tool: "get_page_performance" }
  | { tool: "get_page_accessibility" }
  | { tool: "get_interactive_elements" }
  | { tool: "click_element"; args: { selector: string } }
  | { tool: "summarize_page" }
  | { tool: "fill_input"; args: { selector: string; text: string } }
  | { tool: "clear_input"; args: { selector: string } }
  | { tool: "get_input_value"; args: { selector: string } }
  | { tool: "submit_form"; args: { selector: string } }
  | { tool: "get_form_elements" }
  | { tool: "scroll_to_element"; args: { selector: string } }
  | { tool: "highlight_element"; args: { selector: string; color?: string; duration?: number; style?: 'glow' | 'pulse' | 'shine' | 'bounce' | 'outline' | 'background' | 'border' | 'shadow' | 'gradient' | 'neon'; intensity?: 'subtle' | 'normal' | 'strong'; animation?: boolean; persist?: boolean; customCSS?: string } }
  | { tool: "highlight_text_inline"; args: { selector: string; searchText: string; caseSensitive?: boolean; wholeWords?: boolean; highlightColor?: string; backgroundColor?: string; fontWeight?: string; persist?: boolean } }
  // Clipboard
  | { tool: "copy_to_clipboard"; args: { text: string } }
  | { tool: "read_from_clipboard" }
  | { tool: "copy_current_page_url" }
  | { tool: "copy_current_page_title" }
  | { tool: "copy_selected_text" }
  | { tool: "copy_page_as_markdown" }
  | { tool: "copy_page_as_text" }
  | { tool: "copy_page_links" }
  | { tool: "copy_page_metadata" }
  // Storage
  | { tool: "get_storage_value"; args: { key: string } }
  | { tool: "set_storage_value"; args: { key: string; value: any } }
  | { tool: "remove_storage_value"; args: { key: string } }
  | { tool: "get_all_storage_keys" }
  | { tool: "clear_all_storage" }
  | { tool: "get_extension_settings" }
  | { tool: "update_extension_settings"; args: { updates: any } }
  | { tool: "get_ai_config" }
  | { tool: "set_ai_config"; args: { config: any } }
  | { tool: "export_storage_data" }
  | { tool: "import_storage_data"; args: { jsonData: string } }
  | { tool: "get_storage_stats" }
  // Utils
  | { tool: "get_browser_info" }
  | { tool: "get_system_info" }
  | { tool: "get_current_datetime" }
  | { tool: "format_timestamp"; args: { timestamp: number; format?: string } }
  | { tool: "generate_random_string"; args: { length?: number; type?: string } }
  | { tool: "validate_url"; args: { url: string } }
  | { tool: "extract_domain"; args: { url: string } }
  | { tool: "get_url_parameters"; args: { url: string } }
  | { tool: "build_url"; args: { baseUrl: string; parameters: Record<string, string> } }
  | { tool: "get_text_stats"; args: { text: string } }
  | { tool: "convert_text_case"; args: { text: string; caseType: string } }
  | { tool: "check_permissions" }
  // Extensions
  | { tool: "get_all_extensions" }
  | { tool: "get_extension"; args: { extensionId: string } }
  | { tool: "set_extension_enabled"; args: { extensionId: string; enabled: boolean } }
  | { tool: "uninstall_extension"; args: { extensionId: string } }
  | { tool: "get_extension_permissions"; args: { extensionId: string } }
  // Downloads
  | { tool: "get_all_downloads" }
  | { tool: "get_download"; args: { downloadId: number } }
  | { tool: "pause_download"; args: { downloadId: number } }
  | { tool: "resume_download"; args: { downloadId: number } }
  | { tool: "cancel_download"; args: { downloadId: number } }
  | { tool: "remove_download"; args: { downloadId: number } }
  | { tool: "open_download"; args: { downloadId: number } }
  | { tool: "show_download_in_folder"; args: { downloadId: number } }
  | { tool: "get_download_stats" }
  | { tool: "download_text_as_markdown"; args: { text: string; filename?: string } }
  // Sessions
  | { tool: "get_all_sessions" }
  | { tool: "get_session"; args: { sessionId: string } }
  | { tool: "restore_session"; args: { sessionId: string } }
  | { tool: "get_current_device" }
  | { tool: "get_all_devices" }
  // Context Menus
  | { tool: "create_context_menu_item"; args: { id: string; title: string; contexts?: string[]; documentUrlPatterns?: string[] } }
  | { tool: "update_context_menu_item"; args: { id: string; updates: any } }
  | { tool: "remove_context_menu_item"; args: { id: string } }
  | { tool: "remove_all_context_menu_items" }
  | { tool: "get_context_menu_items" }
  // Screenshot
  | { tool: "capture_screenshot" }
  | { tool: "capture_tab_screenshot"; args: { tabId: number } }
  | { tool: "capture_screenshot_to_clipboard" }
  | { tool: "read_clipboard_image" }
  | { tool: "get_clipboard_image_info" }

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
  fillInput,
  clearInput,
  getInputValue,
  submitForm,
  getFormElements,
  scrollToElement,
  highlightElement,
  highlightTextInline,
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
  closeTab,
  // Page content
  getPageMetadata,
  extractPageText,
  getPageLinks,
  getPageImages,
  searchPageText,
  getPagePerformance,
  getPageAccessibility,
  getInteractiveElements,
  clickElement,
  summarizePage,
  // Clipboard
  copyToClipboard,
  readFromClipboard,
  copyCurrentPageUrl,
  copyCurrentPageTitle,
  copySelectedText,
  copyPageAsMarkdown,
  copyPageAsText,
  copyPageLinks,
  copyPageMetadata,
  // Storage
  getStorageValue,
  setStorageValue,
  removeStorageValue,
  getAllStorageKeys,
  clearAllStorage,
  getExtensionSettings,
  updateExtensionSettings,
  getAiConfig,
  setAiConfig,
  exportStorageData,
  importStorageData,
  getStorageStats,
  // Utils
  getBrowserInfo,
  getSystemInfo,
  getCurrentDateTime,
  formatTimestamp,
  generateRandomString,
  validateUrl,
  extractDomain,
  getUrlParameters,
  buildUrl,
  getTextStats,
  convertTextCase,
  checkPermissions,
  // Extensions
  getAllExtensions,
  getExtension,
  setExtensionEnabled,
  uninstallExtension,
  getExtensionPermissions,
  // Downloads
  getAllDownloads,
  getDownload,
  pauseDownload,
  resumeDownload,
  cancelDownload,
  removeDownload,
  openDownload,
  showDownloadInFolder,
  getDownloadStats,
  downloadTextAsMarkdown,
  // Sessions
  getAllSessions,
  getSession,
  restoreSession,
  getCurrentDevice,
  getAllDevices,
  // Context Menus
  createContextMenuItem,
  updateContextMenuItem,
  removeContextMenuItem,
  removeAllContextMenuItems,
  getContextMenuItems,
  // Screenshot
  captureScreenshot,
  captureTabScreenshot,
  captureScreenshotToClipboard,
  readClipboardImage,
  getClipboardImageInfo
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
      // Page content
      case "get_page_metadata": {
        const metadata = await getPageMetadata()
        return { success: true, data: metadata }
      }
      case "extract_page_text": {
        const content = await extractPageText()
        return { success: true, data: content }
      }
      case "get_page_links": {
        const links = await getPageLinks()
        return { success: true, data: links }
      }
      case "get_page_images": {
        const images = await getPageImages()
        return { success: true, data: images }
      }
      case "search_page_text": {
        const { query } = request.args
        if (!query) return { success: false, error: "Query is required" }
        const results = await searchPageText(query)
        return { success: true, data: results }
      }
      case "get_page_performance": {
        const performance = await getPagePerformance()
        return { success: true, data: performance }
      }
      case "get_page_accessibility": {
        const accessibility = await getPageAccessibility()
        return { success: true, data: accessibility }
      }
      case "get_interactive_elements": {
        const elements = await getInteractiveElements()
        return { success: true, data: elements }
      }
      case "click_element": {
        const { selector } = request.args
        if (!selector) return { success: false, error: "Selector is required" }
        const result = await clickElement(selector)
        return { success: true, data: result }
      }
      case "summarize_page": {
        const summary = await summarizePage()
        return { success: true, data: summary }
      }
      case "fill_input": {
        const { selector, text } = request.args
        if (!selector || !text) return { success: false, error: "Selector and text are required" }
        const result = await fillInput(selector, text)
        return { success: true, data: result }
      }
      case "clear_input": {
        const { selector } = request.args
        if (!selector) return { success: false, error: "Selector is required" }
        const result = await clearInput(selector)
        return { success: true, data: result }
      }
      case "get_input_value": {
        const { selector } = request.args
        if (!selector) return { success: false, error: "Selector is required" }
        const result = await getInputValue(selector)
        return { success: true, data: result }
      }
      case "submit_form": {
        const { selector } = request.args
        if (!selector) return { success: false, error: "Selector is required" }
        const result = await submitForm(selector)
        return { success: true, data: result }
      }
      case "get_form_elements": {
        const result = await getFormElements()
        return { success: true, data: result }
      }
      case "scroll_to_element": {
        const { selector } = request.args
        if (!selector) return { success: false, error: "Selector is required" }
        const result = await scrollToElement(selector)
        return { success: true, data: result }
      }
      case "highlight_element": {
        const { selector, color, duration, style, intensity, animation, persist, customCSS } = request.args
        if (!selector) return { success: false, error: "Selector is required" }
        const result = await highlightElement(selector, { color, duration, style, intensity, animation, persist, customCSS })
        return { success: true, data: result }
      }
      case "highlight_text_inline": {
        const { selector, searchText, caseSensitive, wholeWords, highlightColor, backgroundColor, fontWeight, persist } = request.args
        if (!selector) return { success: false, error: "Selector is required" }
        if (!searchText) return { success: false, error: "Search text is required" }
        const result = await highlightTextInline(selector, searchText, { caseSensitive, wholeWords, highlightColor, backgroundColor, fontWeight, persist })
        return { success: true, data: result }
      }
      // Clipboard
      case "copy_to_clipboard": {
        const { text } = request.args
        if (!text) return { success: false, error: "Text is required" }
        const result = await copyToClipboard(text)
        return result.success ? { success: true } : { success: false, error: result.error || "Failed to copy to clipboard" }
      }
      case "read_from_clipboard": {
        const result = await readFromClipboard()
        return result.success ? { success: true, data: result.text } : { success: false, error: result.error || "Failed to read from clipboard" }
      }
      case "copy_current_page_url": {
        const result = await copyCurrentPageUrl()
        return result.success ? { success: true, data: result.url } : { success: false, error: result.error || "Failed to copy URL" }
      }
      case "copy_current_page_title": {
        const result = await copyCurrentPageTitle()
        return result.success ? { success: true, data: result.title } : { success: false, error: result.error || "Failed to copy title" }
      }
      case "copy_selected_text": {
        const result = await copySelectedText()
        return result.success ? { success: true, data: result.text } : { success: false, error: result.error || "Failed to copy selected text" }
      }
      case "copy_page_as_markdown": {
        const result = await copyPageAsMarkdown()
        return result.success ? { success: true, data: result.markdown } : { success: false, error: result.error || "Failed to copy page as markdown" }
      }
      case "copy_page_as_text": {
        const result = await copyPageAsText()
        return result.success ? { success: true, data: result.text } : { success: false, error: result.error || "Failed to copy page as text" }
      }
      case "copy_page_links": {
        const result = await copyPageLinks()
        return result.success ? { success: true, data: result.links } : { success: false, error: result.error || "Failed to copy page links" }
      }
      case "copy_page_metadata": {
        const result = await copyPageMetadata()
        return result.success ? { success: true, data: result.metadata } : { success: false, error: result.error || "Failed to copy page metadata" }
      }
      // Storage
      case "get_storage_value": {
        const { key } = request.args
        if (!key) return { success: false, error: "Key is required" }
        const result = await getStorageValue(key)
        return result.success ? { success: true, data: result.value } : { success: false, error: result.error || "Failed to get storage value" }
      }
      case "set_storage_value": {
        const { key, value } = request.args
        if (!key) return { success: false, error: "Key is required" }
        const result = await setStorageValue(key, value)
        return result.success ? { success: true } : { success: false, error: result.error || "Failed to set storage value" }
      }
      case "remove_storage_value": {
        const { key } = request.args
        if (!key) return { success: false, error: "Key is required" }
        const result = await removeStorageValue(key)
        return result.success ? { success: true } : { success: false, error: result.error || "Failed to remove storage value" }
      }
      case "get_all_storage_keys": {
        const result = await getAllStorageKeys()
        return result.success ? { success: true, data: result.keys } : { success: false, error: result.error || "Failed to get storage keys" }
      }
      case "clear_all_storage": {
        const result = await clearAllStorage()
        return result.success ? { success: true } : { success: false, error: result.error || "Failed to clear storage" }
      }
      case "get_extension_settings": {
        const result = await getExtensionSettings()
        return result.success ? { success: true, data: result.settings } : { success: false, error: result.error || "Failed to get extension settings" }
      }
      case "update_extension_settings": {
        const { updates } = request.args
        if (!updates) return { success: false, error: "Updates are required" }
        const result = await updateExtensionSettings(updates)
        return result.success ? { success: true } : { success: false, error: result.error || "Failed to update extension settings" }
      }
      case "get_ai_config": {
        const result = await getAiConfig()
        return result.success ? { success: true, data: result.config } : { success: false, error: result.error || "Failed to get AI config" }
      }
      case "set_ai_config": {
        const { config } = request.args
        if (!config) return { success: false, error: "Config is required" }
        const result = await setAiConfig(config)
        return result.success ? { success: true } : { success: false, error: result.error || "Failed to set AI config" }
      }
      case "export_storage_data": {
        const result = await exportStorageData()
        return result.success ? { success: true, data: result.data } : { success: false, error: result.error || "Failed to export storage data" }
      }
      case "import_storage_data": {
        const { jsonData } = request.args
        if (!jsonData) return { success: false, error: "JSON data is required" }
        const result = await importStorageData(jsonData)
        return result.success ? { success: true } : { success: false, error: result.error || "Failed to import storage data" }
      }
      case "get_storage_stats": {
        const result = await getStorageStats()
        return result.success ? { success: true, data: result.stats } : { success: false, error: result.error || "Failed to get storage stats" }
      }
      // Utils
      case "get_browser_info": {
        const result = await getBrowserInfo()
        return { success: true, data: result }
      }
      case "get_system_info": {
        const result = await getSystemInfo()
        return { success: true, data: result }
      }
      case "get_current_datetime": {
        const result = await getCurrentDateTime()
        return { success: true, data: result }
      }
      case "format_timestamp": {
        const { timestamp, format } = request.args
        if (!timestamp) return { success: false, error: "Timestamp is required" }
        const result = await formatTimestamp(timestamp, format)
        return result.success ? { success: true, data: result.formatted } : { success: false, error: result.error || "Failed to format timestamp" }
      }
      case "generate_random_string": {
        const { length, type } = request.args
        const result = await generateRandomString(length, type as any)
        return result.success ? { success: true, data: result.result } : { success: false, error: result.error || "Failed to generate random string" }
      }
      case "validate_url": {
        const { url } = request.args
        if (!url) return { success: false, error: "URL is required" }
        const result = await validateUrl(url)
        return result.success ? { success: true, data: result.isValid } : { success: false, error: result.error || "Failed to validate URL" }
      }
      case "extract_domain": {
        const { url } = request.args
        if (!url) return { success: false, error: "URL is required" }
        const result = await extractDomain(url)
        return result.success ? { success: true, data: result.domain } : { success: false, error: result.error || "Failed to extract domain" }
      }
      case "get_url_parameters": {
        const { url } = request.args
        if (!url) return { success: false, error: "URL is required" }
        const result = await getUrlParameters(url)
        return result.success ? { success: true, data: result.parameters } : { success: false, error: result.error || "Failed to get URL parameters" }
      }
      case "build_url": {
        const { baseUrl, parameters } = request.args
        if (!baseUrl) return { success: false, error: "Base URL is required" }
        const result = await buildUrl(baseUrl, parameters)
        return result.success ? { success: true, data: result.url } : { success: false, error: result.error || "Failed to build URL" }
      }
      case "get_text_stats": {
        const { text } = request.args
        if (!text) return { success: false, error: "Text is required" }
        const result = await getTextStats(text)
        return result.success ? { success: true, data: result.stats } : { success: false, error: result.error || "Failed to get text stats" }
      }
      case "convert_text_case": {
        const { text, caseType } = request.args
        if (!text || !caseType) return { success: false, error: "Text and case type are required" }
        const result = await convertTextCase(text, caseType as any)
        return result.success ? { success: true, data: result.result } : { success: false, error: result.error || "Failed to convert text case" }
      }
      case "check_permissions": {
        const result = await checkPermissions()
        return result.success ? { success: true, data: result } : { success: false, error: result.error || "Failed to check permissions" }
      }
      // Extensions
      case "get_all_extensions": {
        const result = await getAllExtensions()
        return result.success ? { success: true, data: result.extensions } : { success: false, error: result.error || "Failed to get extensions" }
      }
      case "get_extension": {
        const { extensionId } = request.args
        if (!extensionId) return { success: false, error: "Extension ID is required" }
        const result = await getExtension(extensionId)
        return result.success ? { success: true, data: result.extension } : { success: false, error: result.error || "Failed to get extension" }
      }
      case "set_extension_enabled": {
        const { extensionId, enabled } = request.args
        if (!extensionId) return { success: false, error: "Extension ID is required" }
        const result = await setExtensionEnabled(extensionId, enabled)
        return result.success ? { success: true } : { success: false, error: result.error || "Failed to set extension enabled" }
      }
      case "uninstall_extension": {
        const { extensionId } = request.args
        if (!extensionId) return { success: false, error: "Extension ID is required" }
        const result = await uninstallExtension(extensionId)
        return result.success ? { success: true } : { success: false, error: result.error || "Failed to uninstall extension" }
      }
      case "get_extension_permissions": {
        const { extensionId } = request.args
        if (!extensionId) return { success: false, error: "Extension ID is required" }
        const result = await getExtensionPermissions(extensionId)
        return result.success ? { success: true, data: result.permissions } : { success: false, error: result.error || "Failed to get extension permissions" }
      }
      // Downloads
      case "get_all_downloads": {
        const result = await getAllDownloads()
        return result.success ? { success: true, data: result.downloads } : { success: false, error: result.error || "Failed to get downloads" }
      }
      case "get_download": {
        const { downloadId } = request.args
        if (!Number.isFinite(downloadId)) return { success: false, error: "Invalid download ID" }
        const result = await getDownload(downloadId)
        return result.success ? { success: true, data: result.download } : { success: false, error: result.error || "Failed to get download" }
      }
      case "pause_download": {
        const { downloadId } = request.args
        if (!Number.isFinite(downloadId)) return { success: false, error: "Invalid download ID" }
        const result = await pauseDownload(downloadId)
        return result.success ? { success: true } : { success: false, error: result.error || "Failed to pause download" }
      }
      case "resume_download": {
        const { downloadId } = request.args
        if (!Number.isFinite(downloadId)) return { success: false, error: "Invalid download ID" }
        const result = await resumeDownload(downloadId)
        return result.success ? { success: true } : { success: false, error: result.error || "Failed to resume download" }
      }
      case "cancel_download": {
        const { downloadId } = request.args
        if (!Number.isFinite(downloadId)) return { success: false, error: "Invalid download ID" }
        const result = await cancelDownload(downloadId)
        return result.success ? { success: true } : { success: false, error: result.error || "Failed to cancel download" }
      }
      case "remove_download": {
        const { downloadId } = request.args
        if (!Number.isFinite(downloadId)) return { success: false, error: "Invalid download ID" }
        const result = await removeDownload(downloadId)
        return result.success ? { success: true } : { success: false, error: result.error || "Failed to remove download" }
      }
      case "open_download": {
        const { downloadId } = request.args
        if (!Number.isFinite(downloadId)) return { success: false, error: "Invalid download ID" }
        const result = await openDownload(downloadId)
        return result.success ? { success: true } : { success: false, error: result.error || "Failed to open download" }
      }
      case "show_download_in_folder": {
        const { downloadId } = request.args
        if (!Number.isFinite(downloadId)) return { success: false, error: "Invalid download ID" }
        const result = await showDownloadInFolder(downloadId)
        return result.success ? { success: true } : { success: false, error: result.error || "Failed to show download in folder" }
      }
      case "get_download_stats": {
        const result = await getDownloadStats()
        return result.success ? { success: true, data: result.stats } : { success: false, error: result.error || "Failed to get download stats" }
      }
      case "download_text_as_markdown": {
        const { text, filename } = request.args
        if (!text || typeof text !== "string") return { success: false, error: "Text is required and must be a string" }
        const result = await downloadTextAsMarkdown(text, filename)
        return result.success ? { success: true, data: { downloadId: result.downloadId } } : { success: false, error: result.error || "Failed to download text as markdown" }
      }
      // Sessions
      case "get_all_sessions": {
        const result = await getAllSessions()
        return result.success ? { success: true, data: result.sessions } : { success: false, error: result.error || "Failed to get sessions" }
      }
      case "get_session": {
        const { sessionId } = request.args
        if (!sessionId) return { success: false, error: "Session ID is required" }
        const result = await getSession(sessionId)
        return result.success ? { success: true, data: result.session } : { success: false, error: result.error || "Failed to get session" }
      }
      case "restore_session": {
        const { sessionId } = request.args
        if (!sessionId) return { success: false, error: "Session ID is required" }
        const result = await restoreSession(sessionId)
        return result.success ? { success: true, data: result.session } : { success: false, error: result.error || "Failed to restore session" }
      }
      case "get_current_device": {
        const result = await getCurrentDevice()
        return result.success ? { success: true, data: result.device } : { success: false, error: result.error || "Failed to get current device" }
      }
      case "get_all_devices": {
        const result = await getAllDevices()
        return result.success ? { success: true, data: result.devices } : { success: false, error: result.error || "Failed to get all devices" }
      }
      // Context Menus
      case "create_context_menu_item": {
        const { id, title, contexts, documentUrlPatterns } = request.args
        if (!id || !title) return { success: false, error: "ID and title are required" }
        const result = await createContextMenuItem({ id, title, contexts: contexts as any, documentUrlPatterns })
        return result.success ? { success: true } : { success: false, error: result.error || "Failed to create context menu item" }
      }
      case "update_context_menu_item": {
        const { id, updates } = request.args
        if (!id) return { success: false, error: "ID is required" }
        const result = await updateContextMenuItem(id, updates)
        return result.success ? { success: true } : { success: false, error: result.error || "Failed to update context menu item" }
      }
      case "remove_context_menu_item": {
        const { id } = request.args
        if (!id) return { success: false, error: "ID is required" }
        const result = await removeContextMenuItem(id)
        return result.success ? { success: true } : { success: false, error: result.error || "Failed to remove context menu item" }
      }
      case "remove_all_context_menu_items": {
        const result = await removeAllContextMenuItems()
        return result.success ? { success: true } : { success: false, error: result.error || "Failed to remove all context menu items" }
      }
      case "get_context_menu_items": {
        const result = await getContextMenuItems()
        return result.success ? { success: true, data: result.items } : { success: false, error: result.error || "Failed to get context menu items" }
      }
      // Screenshot tools
      case "capture_screenshot": {
        const result = await captureScreenshot()
        return result.success ? { success: true, data: { imageData: result.imageData } } : { success: false, error: result.error || "Failed to capture screenshot" }
      }
      case "capture_tab_screenshot": {
        const tabId = request.args?.tabId
        if (!Number.isFinite(tabId)) return { success: false, error: "Invalid tabId" }
        const result = await captureTabScreenshot(tabId)
        return result.success ? { success: true, data: { imageData: result.imageData } } : { success: false, error: result.error || "Failed to capture tab screenshot" }
      }
      case "capture_screenshot_to_clipboard": {
        const result = await captureScreenshotToClipboard()
        return result.success ? { success: true } : { success: false, error: result.error || "Failed to capture screenshot to clipboard" }
      }
      case "read_clipboard_image": {
        const result = await readClipboardImage()
        return result.success ? { success: true, data: { imageData: result.imageData } } : { success: false, error: result.error || "Failed to read clipboard image" }
      }
      case "get_clipboard_image_info": {
        const result = await getClipboardImageInfo()
        return result.success ? { success: true, data: { hasImage: result.hasImage, imageType: result.imageType } } : { success: false, error: result.error || "Failed to get clipboard image info" }
      }
      default:
        return { success: false, error: "Unsupported tool" }
    }
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) }
  }
}


