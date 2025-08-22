import { Storage } from "@plasmohq/storage"

export type TabGroup = {
  id: number
  title: string
  color: string
  collapsed: boolean
  windowId: number
  tabCount: number
}

/**
 * OpenAI chat completion helper (shared)
 */
async function chatCompletion(messages: any, stream = false, options: any = {}) {
  const storage = new Storage()
  const aiHost = (await storage.get("aiHost")) || "https://api.openai.com/v1/chat/completions"
  const aiToken = await storage.get("aiToken")
  const aiModel = (await storage.get("aiModel")) || "gpt-3.5-turbo"
  if (!aiToken) throw new Error("No OpenAI API token set")

  let conversationMessages
  if (typeof messages === "string") {
    conversationMessages = [{ role: "user", content: messages }]
  } else if (Array.isArray(messages)) {
    conversationMessages = messages
  } else {
    throw new Error("Invalid messages format")
  }

  const systemInstruction = [
    "You are the AIPex browser assistant. Reply concisely in English. Use tools when available and provide clear next steps when tools are not needed.",
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
    messages: [{ role: "system", content: systemInstruction }, ...conversationMessages],
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

/**
 * Remove all tab groups in the current window
 */
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

/**
 * Use AI to automatically group tabs by topic/purpose
 */
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

/**
 * Get all tab groups across all windows
 */
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

/**
 * Create a new tab group with specified tabs
 */
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

/**
 * Update tab group properties
 */
export async function updateTabGroup(groupId: number, updates: { title?: string; color?: chrome.tabGroups.ColorEnum; collapsed?: boolean }): Promise<{ success: boolean; error?: string }> {
  try {
    await chrome.tabGroups.update(groupId, updates)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}
