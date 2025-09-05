import { Storage } from "@plasmohq/storage"

export type SimplifiedTab = {
  id: number
  index: number
  windowId: number
  title?: string
  url?: string
}

export async function getAllTabs(): Promise<SimplifiedTab[]> {
  const tabs = await chrome.tabs.query({})
  return tabs
    .filter((t) => typeof t.id === "number")
    .map((t) => ({ id: t.id!, index: t.index!, windowId: t.windowId!, title: t.title, url: t.url }))
}

export async function getCurrentTab(): Promise<SimplifiedTab | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab || typeof tab.id !== "number") return null
  return {
    id: tab.id!,
    index: tab.index!,
    windowId: tab.windowId!,
    title: tab.title,
    url: tab.url
  }
}

export async function switchToTab(tabId: number): Promise<{ success: true }> {
  const tab = await chrome.tabs.get(tabId)
  if (!tab || typeof tab.index !== "number" || typeof tab.windowId !== "number") {
    throw new Error("Tab not found")
  }
  await chrome.tabs.highlight({ tabs: tab.index, windowId: tab.windowId })
  await chrome.windows.update(tab.windowId, { focused: true })
  return { success: true }
}

// OpenAI chat completion helper (shared)
export async function chatCompletion(messages: any, stream = false, options: any = {}) {
  const storage = new Storage()
  const aiHost = (await storage.get("aiHost")) || "https://api.openai.com/v1/chat/completions"
  const aiToken = await storage.get("aiToken")
  const aiModel = (await storage.get("aiModel")) || "gpt-3.5-turbo"
  if (!aiToken) throw new Error("No OpenAI API token set")

  let conversationMessages
  if (typeof messages === "string") {
    conversationMessages = [{ role: "user", content: messages.trim() }]
  } else if (Array.isArray(messages)) {
    // Ensure all message content is trimmed to prevent trailing whitespace errors
    conversationMessages = messages.map(msg => ({
      ...msg,
      content: msg.content ? msg.content.trim() : msg.content
    }))
  } else {
    throw new Error("Invalid messages format")
  }

  // Note: Current tab is now automatically included in referencedTabs, so no need for separate currentTabInfo

  const systemInstruction = [
    "You are the AIPex browser assistant. Respond in the same language as the user's input. Default to English if language is unclear.. Use tools when available and provide clear next steps when tools are not needed.",
    "\nWhat you can do:",
    "1) Quick UI actions: guide users to open the AI Chat side panel and view/search available actions.",
    "2) Manage tabs: list all tabs, get the current active tab, switch to a tab by id, and focus the right window.",
    "3) Organize tabs: use AI to group current-window tabs by topic/purpose, or ungroup all in one click.",
    "4) Manage bookmarks: create, delete, search, and organize bookmarks.",
    "5) Manage history: search, view recent history, and clear browsing data.",
    "6) Manage windows: create, switch, minimize, maximize, and close windows.",
    "7) Manage tab groups: create, update, and organize tab groups.",
    "\nWhen tools are available, prefer these:",
    "Tab Management:",
    "- get_all_tabs: list all tabs (id, title, url)",
    "- get_current_tab: get the active tab",
    "- switch_to_tab: switch to a tab by id",
    "- create_new_tab: create a new tab with URL",
    "- get_tab_info: get detailed tab information",
    "- duplicate_tab: duplicate an existing tab",
    "- close_tab: close a specific tab",
    "- get_current_tab_content: extract content from current tab",
    "- get_tab_content: extract content from a specific tab by tabId",
    "\nTab Group Management:",
    "- organize_tabs: AI-organize current-window tabs",
    "- ungroup_tabs: remove all tab groups in the current window",
    "- get_all_tab_groups: list all tab groups",
    "- create_tab_group: create a new tab group",
    "- update_tab_group: update tab group properties",
    "\nBookmark Management:",
    "- get_all_bookmarks: list all bookmarks",
    "- get_bookmark_folders: get bookmark folder structure",
    "- create_bookmark: create a new bookmark",
    "- delete_bookmark: delete a bookmark by ID",
    "- search_bookmarks: search bookmarks by title/URL",
    "\nHistory Management:",
    "- get_recent_history: get recent browsing history",
    "- search_history: search browsing history",
    "- delete_history_item: delete a specific history item",
    "- clear_history: clear browsing history for specified days",
    "\nWindow Management:",
    "- get_all_windows: list all browser windows",
    "- get_current_window: get the current focused window",
    "- switch_to_window: switch focus to a specific window",
    "- create_new_window: create a new browser window",
    "- close_window: close a specific window",
    "- minimize_window: minimize a specific window",
    "- maximize_window: maximize a specific window",
    "\nUsage guidance: For requests like 'switch to X', first call get_all_tabs, pick the best-matching id, then call switch_to_tab. Use get_current_tab to understand context. Use organize_tabs to group, and ungroup_tabs to reset.",
    "\nEncourage natural, semantic requests instead of slash commands (e.g., 'help organize my tabs', 'switch to the bilibili tab', 'summarize this page', 'bookmark this page', 'search my history for github')."
  ].join("\n")

  const requestBody = {
    model: aiModel,
    messages: conversationMessages,
    stream,
    ...options
  }

  const res = await fetch(aiHost, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${aiToken}`
    },
    body: JSON.stringify(requestBody)
  })
  if (!res.ok) throw new Error("OpenAI API error: " + (await res.text()))
  return stream ? res : await res.json()
}

export async function ungroupAllTabs(): Promise<{ success: boolean; groupsUngrouped?: number; error?: string }> {
  try {
    const currentWindow = await chrome.windows.getCurrent()
    const groups = await chrome.tabGroups.query({ windowId: currentWindow.id })
    if (groups.length === 0) {
      return { success: true, groupsUngrouped: 0 }
    }
    for (const group of groups) {
      const tabs = await chrome.tabs.query({ groupId: group.id })
      const tabIds = tabs.map((t) => t.id!).filter(Boolean)
      if (tabIds.length > 0) {
        chrome.tabs.ungroup(tabIds)
      }
    }
    return { success: true, groupsUngrouped: groups.length }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

export async function groupTabsByAI(): Promise<{ success: boolean; groupedTabs?: number; groups?: number; error?: string }> {
  // This mirrors the existing background implementation
  const tabs = await chrome.tabs.query({ currentWindow: true })
  const validTabs = tabs.filter((tab) => tab.url)
  if (validTabs.length === 0) {
    return { success: true, groupedTabs: 0, groups: 0 }
  }

  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
    const tabData = validTabs.map((tab) => {
      let hostname = ""
      try {
        hostname = tab.url ? new URL(tab.url).hostname : ""
      } catch {
        hostname = tab.url ? tab.url.split("://")[0] + "://" : ""
      }
      return { id: tab.id, title: tab.title, url: tab.url, hostname }
    })

    const content = `Classify these browser tabs into 3-7 meaningful groups based on their content, purpose, or topic:\n${JSON.stringify(
      tabData,
      null,
      2
    )}\n\nYou must return a JSON object with a "groups" key containing an array where each item has:\n1. "groupName": A short, descriptive name (1-3 words)\n2. "tabIds": Array of tab IDs that belong to this group\n\nExample response format:\n{\n  "groups": [\n    {\n      "groupName": "News",\n      "tabIds": [123, 124, 125]\n    },\n    {\n      "groupName": "Shopping",\n      "tabIds": [126, 127]\n    }\n  ]\n}`

    const aiResponse = await chatCompletion(content, false, { response_format: { type: "json_object" } })
    const responseData = JSON.parse(aiResponse.choices[0].message.content.trim())
    const groupingResult = responseData.groups || []

    for (const group of groupingResult) {
      const { groupName, tabIds } = group
      const validTabIds = tabIds.filter((id: number) => validTabs.some((tab) => tab.id === id))
      if (validTabIds.length === 0) continue

      const groups = await chrome.tabGroups.query({ windowId: validTabs[0].windowId })
      const existingGroup = groups.find((g) => g.title === groupName)
      if (existingGroup) {
        chrome.tabs.group({ tabIds: validTabIds, groupId: existingGroup.id }, (groupId) => {
          const containsActiveTab = validTabIds.includes(activeTab?.id || -1)
          chrome.tabGroups.update(groupId, { collapsed: !containsActiveTab })
        })
      } else {
        chrome.tabs.group(
          { createProperties: { windowId: validTabs[0].windowId }, tabIds: validTabIds },
          (groupId) => {
            chrome.tabGroups.update(groupId, { title: groupName, color: "green" }, () => {
              const containsActiveTab = validTabIds.includes(activeTab?.id || -1)
              chrome.tabGroups.update(groupId, { collapsed: !containsActiveTab })
            })
          }
        )
      }
    }

    return { success: true, groupedTabs: validTabs.length, groups: groupingResult.length }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}


// Get the visible text content of the current tab (best-effort, truncated)
export async function getCurrentTabContent(): Promise<
  | { title: string; url: string; content: string }
  | null
> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab || typeof tab.id !== "number") return null

  // Execute in-page to extract content
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      try {
        const title = document.title || ""
        const url = location.href
        // Prefer human-readable text; fall back to HTML if empty
        const text = (document.body?.innerText || "").trim()
        const content = text && text.length > 0 ? text : (document.body?.textContent || "")
        // Truncate to avoid extremely large payloads
        const MAX = 200_000
        return { title, url, content: (content || "").slice(0, MAX) }
      } catch (e) {
        return { title: document.title || "", url: location.href, content: "" }
      }
    }
  })

  const [{ result }] = results
  return result || null
}

// Get the visible text content of a specific tab by tabId (best-effort, truncated)
export async function getTabContent(tabId: number): Promise<
  | { title: string; url: string; content: string }
  | null
> {
  try {
    // First verify the tab exists
    const tab = await chrome.tabs.get(tabId)
    if (!tab || typeof tab.id !== "number") return null

    // Execute in-page to extract content
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        try {
          const title = document.title || ""
          const url = location.href
          // Prefer human-readable text; fall back to HTML if empty
          const text = (document.body?.innerText || "").trim()
          const content = text && text.length > 0 ? text : (document.body?.textContent || "")
          // Truncate to avoid extremely large payloads
          const MAX = 200_000
          return { title, url, content: (content || "").slice(0, MAX) }
        } catch (e) {
          return { title: document.title || "", url: location.href, content: "" }
        }
      }
    })

    const [{ result }] = results
    return result || null
  } catch (error) {
    // Tab might not exist or be accessible
    return null
  }
}

// Create a new tab with a given URL (adds https:// if protocol missing)
export async function createNewTab(url: string): Promise<{ tabId: number; url: string }> {
  let finalUrl = url?.trim()
  if (!finalUrl) throw new Error("URL is required")
  // Prepend protocol if missing
  if (!/^https?:\/\//i.test(finalUrl) && !/^chrome:|^chrome-extension:/i.test(finalUrl)) {
    finalUrl = `https://${finalUrl}`
  }
  const tab = await chrome.tabs.create({ url: finalUrl })
  if (!tab?.id) throw new Error("Failed to create tab")
  return { tabId: tab.id, url: tab.url || finalUrl }
}

// ===== BOOKMARK MANAGEMENT =====

export type SimplifiedBookmark = {
  id: string
  title: string
  url?: string
  parentId?: string
  children?: SimplifiedBookmark[]
}

export async function getAllBookmarks(): Promise<SimplifiedBookmark[]> {
  const bookmarks = await chrome.bookmarks.getTree()
  
  function flattenBookmarks(nodes: chrome.bookmarks.BookmarkTreeNode[]): SimplifiedBookmark[] {
    const result: SimplifiedBookmark[] = []
    
    for (const node of nodes) {
      if (node.url) {
        // This is a bookmark
        result.push({
          id: node.id,
          title: node.title,
          url: node.url,
          parentId: node.parentId
        })
      } else if (node.children) {
        // This is a folder, recursively process children
        result.push(...flattenBookmarks(node.children))
      }
    }
    
    return result
  }
  
  return flattenBookmarks(bookmarks)
}

export async function getBookmarkFolders(): Promise<SimplifiedBookmark[]> {
  const bookmarks = await chrome.bookmarks.getTree()
  
  function getFolders(nodes: chrome.bookmarks.BookmarkTreeNode[]): SimplifiedBookmark[] {
    const result: SimplifiedBookmark[] = []
    
    for (const node of nodes) {
      if (!node.url && node.children) {
        // This is a folder
        result.push({
          id: node.id,
          title: node.title,
          parentId: node.parentId,
          children: getFolders(node.children)
        })
      }
    }
    
    return result
  }
  
  return getFolders(bookmarks)
}

export async function createBookmark(title: string, url: string, parentId?: string): Promise<{ success: boolean; bookmarkId?: string; error?: string }> {
  try {
    const bookmark = await chrome.bookmarks.create({
      title,
      url,
      parentId: parentId || "1" // Default to bookmarks bar
    })
    return { success: true, bookmarkId: bookmark.id }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

export async function deleteBookmark(bookmarkId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await chrome.bookmarks.remove(bookmarkId)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

export async function searchBookmarks(query: string): Promise<SimplifiedBookmark[]> {
  const results = await chrome.bookmarks.search(query)
  return results.map(bookmark => ({
    id: bookmark.id,
    title: bookmark.title,
    url: bookmark.url,
    parentId: bookmark.parentId
  }))
}

// ===== HISTORY MANAGEMENT =====

export type HistoryItem = {
  id: string
  url: string
  title: string
  lastVisitTime: number
  visitCount: number
}

export async function getRecentHistory(limit: number = 50): Promise<HistoryItem[]> {
  const endTime = Date.now()
  const startTime = endTime - (7 * 24 * 60 * 60 * 1000) // Last 7 days
  
  const history = await chrome.history.search({
    text: "",
    startTime,
    endTime,
    maxResults: limit
  })
  
  return history.map(item => ({
    id: item.id,
    url: item.url || "",
    title: item.title || "",
    lastVisitTime: item.lastVisitTime || 0,
    visitCount: item.visitCount || 0
  }))
}

export async function searchHistory(query: string, limit: number = 50): Promise<HistoryItem[]> {
  const history = await chrome.history.search({
    text: query,
    maxResults: limit
  })
  
  return history.map(item => ({
    id: item.id,
    url: item.url || "",
    title: item.title || "",
    lastVisitTime: item.lastVisitTime || 0,
    visitCount: item.visitCount || 0
  }))
}

export async function deleteHistoryItem(url: string): Promise<{ success: boolean; error?: string }> {
  try {
    await chrome.history.deleteUrl({ url })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

export async function clearHistory(days: number = 1): Promise<{ success: boolean; error?: string }> {
  try {
    const endTime = Date.now()
    const startTime = endTime - (days * 24 * 60 * 60 * 1000)
    
    await chrome.history.deleteRange({ startTime, endTime })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

// ===== WINDOW MANAGEMENT =====

export type SimplifiedWindow = {
  id: number
  focused: boolean
  state: string
  type: string
  left?: number
  top?: number
  width?: number
  height?: number
  tabCount: number
}

export async function getAllWindows(): Promise<SimplifiedWindow[]> {
  const windows = await chrome.windows.getAll({ populate: true })
  
  return windows.map(window => ({
    id: window.id,
    focused: window.focused || false,
    state: window.state || "normal",
    type: window.type || "normal",
    left: window.left,
    top: window.top,
    width: window.width,
    height: window.height,
    tabCount: window.tabs?.length || 0
  }))
}

export async function getCurrentWindow(): Promise<SimplifiedWindow | null> {
  const window = await chrome.windows.getCurrent({ populate: true })
  
  return {
    id: window.id,
    focused: window.focused || false,
    state: window.state || "normal",
    type: window.type || "normal",
    left: window.left,
    top: window.top,
    width: window.width,
    height: window.height,
    tabCount: window.tabs?.length || 0
  }
}

export async function switchToWindow(windowId: number): Promise<{ success: boolean; error?: string }> {
  try {
    await chrome.windows.update(windowId, { focused: true })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

export async function createNewWindow(url?: string): Promise<{ success: boolean; windowId?: number; error?: string }> {
  try {
    const window = await chrome.windows.create({
      url: url ? [url] : undefined
    })
    return { success: true, windowId: window.id }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

export async function closeWindow(windowId: number): Promise<{ success: boolean; error?: string }> {
  try {
    await chrome.windows.remove(windowId)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

export async function minimizeWindow(windowId: number): Promise<{ success: boolean; error?: string }> {
  try {
    await chrome.windows.update(windowId, { state: "minimized" })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

export async function maximizeWindow(windowId: number): Promise<{ success: boolean; error?: string }> {
  try {
    await chrome.windows.update(windowId, { state: "maximized" })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

// ===== TAB GROUP MANAGEMENT =====

export type TabGroup = {
  id: number
  title: string
  color: string
  collapsed: boolean
  windowId: number
  tabCount: number
}

export async function getAllTabGroups(): Promise<TabGroup[]> {
  const groups = await chrome.tabGroups.query({})
  
  return Promise.all(groups.map(async (group) => {
    const tabs = await chrome.tabs.query({ groupId: group.id })
    return {
      id: group.id,
      title: group.title || "",
      color: group.color || "grey",
      collapsed: group.collapsed || false,
      windowId: group.windowId,
      tabCount: tabs.length
    }
  }))
}

export async function createTabGroup(tabIds: number[], title?: string, color?: chrome.tabGroups.ColorEnum): Promise<{ success: boolean; groupId?: number; error?: string }> {
  try {
    const groupId = await chrome.tabs.group({ tabIds })
    if (title || color) {
      await chrome.tabGroups.update(groupId, {
        title: title || "",
        color: color || "green"
      })
    }
    return { success: true, groupId }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

export async function updateTabGroup(groupId: number, updates: { title?: string; color?: chrome.tabGroups.ColorEnum; collapsed?: boolean }): Promise<{ success: boolean; error?: string }> {
  try {
    await chrome.tabGroups.update(groupId, updates)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

// ===== UTILITY FUNCTIONS =====

export async function getTabInfo(tabId: number): Promise<SimplifiedTab | null> {
  try {
    const tab = await chrome.tabs.get(tabId)
    if (!tab || typeof tab.id !== "number") return null
    
    return {
      id: tab.id,
      index: tab.index || 0,
      windowId: tab.windowId || 0,
      title: tab.title,
      url: tab.url
    }
  } catch {
    return null
  }
}

export async function duplicateTab(tabId: number): Promise<{ success: boolean; newTabId?: number; error?: string }> {
  try {
    const tab = await chrome.tabs.duplicate(tabId)
    return { success: true, newTabId: tab.id || undefined }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

export async function closeTab(tabId: number): Promise<{ success: boolean; error?: string }> {
  try {
    await chrome.tabs.remove(tabId)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}


