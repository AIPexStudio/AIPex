export type SimplifiedTab = {
  id: number
  index: number
  windowId: number
  title?: string
  url?: string
}

/**
 * Get all open tabs across all windows
 */
export async function getAllTabs(): Promise<SimplifiedTab[]> {
  const tabs = await chrome.tabs.query({})
  return tabs
    .filter((t) => typeof t.id === "number")
    .map((t) => ({ id: t.id!, index: t.index!, windowId: t.windowId!, title: t.title, url: t.url }))
}

/**
 * Get the currently active tab
 */
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

/**
 * Switch to a specific tab by ID
 */
export async function switchToTab(tabId: number): Promise<{ success: true }> {
  const tab = await chrome.tabs.get(tabId)
  if (!tab || typeof tab.index !== "number" || typeof tab.windowId !== "number") {
    throw new Error("Tab not found")
  }
  await chrome.tabs.highlight({ tabs: tab.index, windowId: tab.windowId })
  await chrome.windows.update(tab.windowId, { focused: true })
  return { success: true }
}

/**
 * Create a new tab with a given URL
 */
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

/**
 * Get detailed information about a specific tab
 */
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

/**
 * Duplicate an existing tab
 */
export async function duplicateTab(tabId: number): Promise<{ success: boolean; newTabId?: number; error?: string }> {
  try {
    const tab = await chrome.tabs.duplicate(tabId)
    return { success: true, newTabId: tab.id || undefined }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Close a specific tab
 */
export async function closeTab(tabId: number): Promise<{ success: boolean; error?: string }> {
  try {
    await chrome.tabs.remove(tabId)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Get the visible text content of the current tab
 */
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
