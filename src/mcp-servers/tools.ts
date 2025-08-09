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
    "\nWhen tools are available, prefer these:",
    "- get_all_tabs: list all tabs (id, title, url)",
    "- get_current_tab: get the active tab",
    "- switch_to_tab: switch to a tab by id",
    "- organize_tabs: AI-organize current-window tabs",
    "- ungroup_tabs: remove all tab groups in the current window",
    "\nUsage guidance: For requests like ‘switch to X’, first call get_all_tabs, pick the best-matching id, then call switch_to_tab. Use get_current_tab to understand context. Use organize_tabs to group, and ungroup_tabs to reset.",
    "\nSlash commands: /tabs, /current, /switch <id>, /organize, /ungroup."
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


