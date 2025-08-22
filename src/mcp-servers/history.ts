export type HistoryItem = {
  id: string
  url: string
  title: string
  lastVisitTime: number
  visitCount: number
}

/**
 * Get recent browsing history
 */
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

/**
 * Search browsing history
 */
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

/**
 * Delete a specific history item by URL
 */
export async function deleteHistoryItem(url: string): Promise<{ success: boolean; error?: string }> {
  try {
    await chrome.history.deleteUrl({ url })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Clear browsing history for specified days
 */
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

/**
 * Get history for a specific URL
 */
export async function getHistoryForUrl(url: string): Promise<HistoryItem[]> {
  const history = await chrome.history.search({
    text: url,
    maxResults: 100
  })
  
  return history
    .filter(item => item.url === url)
    .map(item => ({
      id: item.id,
      url: item.url || "",
      title: item.title || "",
      lastVisitTime: item.lastVisitTime || 0,
      visitCount: item.visitCount || 0
    }))
}

/**
 * Get history for a specific time range
 */
export async function getHistoryForTimeRange(startTime: number, endTime: number, limit: number = 100): Promise<HistoryItem[]> {
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

/**
 * Get most visited sites
 */
export async function getMostVisitedSites(limit: number = 25): Promise<HistoryItem[]> {
  const endTime = Date.now()
  const startTime = endTime - (30 * 24 * 60 * 60 * 1000) // Last 30 days
  
  const history = await chrome.history.search({
    text: "",
    startTime,
    endTime,
    maxResults: 1000
  })
  
  // Group by URL and count visits
  const urlCounts = new Map<string, { url: string; title: string; visitCount: number; lastVisitTime: number }>()
  
  for (const item of history) {
    const url = item.url || ""
    if (!url) continue
    
    const existing = urlCounts.get(url)
    if (existing) {
      existing.visitCount += item.visitCount || 0
      if ((item.lastVisitTime || 0) > existing.lastVisitTime) {
        existing.lastVisitTime = item.lastVisitTime || 0
        existing.title = item.title || existing.title
      }
    } else {
      urlCounts.set(url, {
        url,
        title: item.title || "",
        visitCount: item.visitCount || 0,
        lastVisitTime: item.lastVisitTime || 0
      })
    }
  }
  
  // Sort by visit count and return top results
  return Array.from(urlCounts.values())
    .sort((a, b) => b.visitCount - a.visitCount)
    .slice(0, limit)
    .map((item, index) => ({
      id: `most-visited-${index}`,
      url: item.url,
      title: item.title,
      lastVisitTime: item.lastVisitTime,
      visitCount: item.visitCount
    }))
}

/**
 * Get history statistics
 */
export async function getHistoryStats(): Promise<{ totalItems: number; totalVisits: number; oldestVisit: number; newestVisit: number }> {
  const endTime = Date.now()
  const startTime = 0 // From the beginning of time
  
  const history = await chrome.history.search({
    text: "",
    startTime,
    endTime,
    maxResults: 100000 // Large number to get most items
  })
  
  let totalVisits = 0
  let oldestVisit = endTime
  let newestVisit = 0
  
  for (const item of history) {
    totalVisits += item.visitCount || 0
    const visitTime = item.lastVisitTime || 0
    if (visitTime > 0) {
      if (visitTime < oldestVisit) oldestVisit = visitTime
      if (visitTime > newestVisit) newestVisit = visitTime
    }
  }
  
  return {
    totalItems: history.length,
    totalVisits,
    oldestVisit: oldestVisit === endTime ? 0 : oldestVisit,
    newestVisit
  }
}
