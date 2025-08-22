/**
 * Get browser information
 */
export async function getBrowserInfo(): Promise<{
  userAgent: string
  platform: string
  language: string
  languages: string[]
  cookieEnabled: boolean
  onLine: boolean
  screenResolution: { width: number; height: number }
  colorDepth: number
  timezone: string
}> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab || typeof tab.id !== "number") {
    throw new Error("No active tab found")
  }

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        languages: navigator.languages,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        screenResolution: {
          width: screen.width,
          height: screen.height
        },
        colorDepth: screen.colorDepth,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    }
  })

  const [{ result }] = results
  if (result) {
    // Convert readonly array to mutable array
    return {
      ...result,
      languages: [...result.languages]
    }
  }
  return {
    userAgent: "",
    platform: "",
    language: "",
    languages: [],
    cookieEnabled: false,
    onLine: false,
    screenResolution: { width: 0, height: 0 },
    colorDepth: 0,
    timezone: ""
  }
}

/**
 * Get system information
 */
export async function getSystemInfo(): Promise<{
  os: string
  browser: string
  version: string
  memory?: {
    total: number
    used: number
    available: number
  }
  cpu?: {
    cores: number
  }
}> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab || typeof tab.id !== "number") {
    throw new Error("No active tab found")
  }

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const userAgent = navigator.userAgent
      let os = "Unknown"
      let browser = "Unknown"
      let version = "Unknown"

      // Detect OS
      if (userAgent.includes("Windows")) os = "Windows"
      else if (userAgent.includes("Mac")) os = "macOS"
      else if (userAgent.includes("Linux")) os = "Linux"
      else if (userAgent.includes("Android")) os = "Android"
      else if (userAgent.includes("iOS")) os = "iOS"

      // Detect browser
      if (userAgent.includes("Chrome")) {
        browser = "Chrome"
        const match = userAgent.match(/Chrome\/(\d+)/)
        if (match) version = match[1]
      } else if (userAgent.includes("Firefox")) {
        browser = "Firefox"
        const match = userAgent.match(/Firefox\/(\d+)/)
        if (match) version = match[1]
      } else if (userAgent.includes("Safari")) {
        browser = "Safari"
        const match = userAgent.match(/Version\/(\d+)/)
        if (match) version = match[1]
      } else if (userAgent.includes("Edge")) {
        browser = "Edge"
        const match = userAgent.match(/Edge\/(\d+)/)
        if (match) version = match[1]
      }

      const info: any = { os, browser, version }

      // Get memory info if available
      if ('memory' in performance) {
        const memory = (performance as any).memory
        info.memory = {
          total: memory.jsHeapSizeLimit,
          used: memory.usedJSHeapSize,
          available: memory.totalJSHeapSize
        }
      }

      // Get CPU info if available
      if ('hardwareConcurrency' in navigator) {
        info.cpu = {
          cores: navigator.hardwareConcurrency
        }
      }

      return info
    }
  })

  const [{ result }] = results
  return result || {}
}

/**
 * Get current date and time
 */
export async function getCurrentDateTime(): Promise<{
  timestamp: number
  date: string
  time: string
  timezone: string
  utc: string
}> {
  const now = new Date()
  
  return {
    timestamp: now.getTime(),
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    utc: now.toISOString()
  }
}

/**
 * Format a timestamp
 */
export async function formatTimestamp(timestamp: number, format: string = "default"): Promise<{ success: boolean; formatted?: string; error?: string }> {
  try {
    const date = new Date(timestamp)
    
    let formatted: string
    
    switch (format) {
      case "iso":
        formatted = date.toISOString()
        break
      case "locale":
        formatted = date.toLocaleString()
        break
      case "date":
        formatted = date.toLocaleDateString()
        break
      case "time":
        formatted = date.toLocaleTimeString()
        break
      case "relative":
        const now = new Date()
        const diff = now.getTime() - date.getTime()
        const seconds = Math.floor(diff / 1000)
        const minutes = Math.floor(seconds / 60)
        const hours = Math.floor(minutes / 60)
        const days = Math.floor(hours / 24)
        
        if (days > 0) formatted = `${days} day${days > 1 ? 's' : ''} ago`
        else if (hours > 0) formatted = `${hours} hour${hours > 1 ? 's' : ''} ago`
        else if (minutes > 0) formatted = `${minutes} minute${minutes > 1 ? 's' : ''} ago`
        else formatted = `${seconds} second${seconds > 1 ? 's' : ''} ago`
        break
      default:
        formatted = date.toLocaleString()
    }
    
    return { success: true, formatted }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Generate a random string
 */
export async function generateRandomString(length: number = 8, type: "alphanumeric" | "alphabetic" | "numeric" = "alphanumeric"): Promise<{ success: boolean; result?: string; error?: string }> {
  try {
    let chars: string
    
    switch (type) {
      case "alphabetic":
        chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
        break
      case "numeric":
        chars = "0123456789"
        break
      default:
        chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    }
    
    let result = ""
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    
    return { success: true, result }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Validate URL
 */
export async function validateUrl(url: string): Promise<{ success: boolean; isValid: boolean; error?: string }> {
  try {
    const urlObj = new URL(url)
    return { success: true, isValid: true }
  } catch {
    return { success: true, isValid: false }
  }
}

/**
 * Extract domain from URL
 */
export async function extractDomain(url: string): Promise<{ success: boolean; domain?: string; error?: string }> {
  try {
    const urlObj = new URL(url)
    return { success: true, domain: urlObj.hostname }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Get URL parameters
 */
export async function getUrlParameters(url: string): Promise<{ success: boolean; parameters?: Record<string, string>; error?: string }> {
  try {
    const urlObj = new URL(url)
    const parameters: Record<string, string> = {}
    
    urlObj.searchParams.forEach((value, key) => {
      parameters[key] = value
    })
    
    return { success: true, parameters }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Build URL with parameters
 */
export async function buildUrl(baseUrl: string, parameters: Record<string, string>): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const urlObj = new URL(baseUrl)
    
    for (const [key, value] of Object.entries(parameters)) {
      urlObj.searchParams.set(key, value)
    }
    
    return { success: true, url: urlObj.toString() }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Get text statistics
 */
export async function getTextStats(text: string): Promise<{
  success: boolean
  stats?: {
    characters: number
    words: number
    sentences: number
    paragraphs: number
    readingTime: number
    speakingTime: number
  }
  error?: string
}> {
  try {
    const characters = text.length
    const words = text.trim().split(/\s+/).filter(word => word.length > 0).length
    const sentences = text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0).length
    const paragraphs = text.split(/\n\s*\n/).filter(para => para.trim().length > 0).length
    
    // Average reading speed: 200 words per minute
    const readingTime = Math.ceil(words / 200)
    
    // Average speaking speed: 150 words per minute
    const speakingTime = Math.ceil(words / 150)
    
    return {
      success: true,
      stats: {
        characters,
        words,
        sentences,
        paragraphs,
        readingTime,
        speakingTime
      }
    }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Convert text case
 */
export async function convertTextCase(text: string, caseType: "uppercase" | "lowercase" | "titlecase" | "sentencecase" | "camelcase" | "snakecase" | "kebabcase"): Promise<{ success: boolean; result?: string; error?: string }> {
  try {
    let result: string
    
    switch (caseType) {
      case "uppercase":
        result = text.toUpperCase()
        break
      case "lowercase":
        result = text.toLowerCase()
        break
      case "titlecase":
        result = text.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
        break
      case "sentencecase":
        result = text.toLowerCase().replace(/(^\w|\.\s+\w)/g, (letter) => letter.toUpperCase())
        break
      case "camelcase":
        result = text.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase())
        break
      case "snakecase":
        result = text.toLowerCase().replace(/[^a-zA-Z0-9]+/g, "_")
        break
      case "kebabcase":
        result = text.toLowerCase().replace(/[^a-zA-Z0-9]+/g, "-")
        break
      default:
        result = text
    }
    
    return { success: true, result }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Check if all required permissions are available
 */
export async function checkPermissions(): Promise<{
  success: boolean
  permissions: {
    tabs: boolean
    windows: boolean
    tabGroups: boolean
    bookmarks: boolean
    history: boolean
    scripting: boolean
    storage: boolean
    contextMenus: boolean
    sessions: boolean
    management: boolean
    downloads: boolean
  }
  missingPermissions: string[]
  error?: string
}> {
  try {
    const permissions = {
      tabs: !!chrome.tabs,
      windows: !!chrome.windows,
      tabGroups: !!chrome.tabGroups,
      bookmarks: !!chrome.bookmarks,
      history: !!chrome.history,
      scripting: !!chrome.scripting,
      storage: !!chrome.storage,
      contextMenus: !!chrome.contextMenus,
      sessions: !!chrome.sessions,
      management: !!chrome.management,
      downloads: !!chrome.downloads
    }

    const missingPermissions = Object.entries(permissions)
      .filter(([_, available]) => !available)
      .map(([permission, _]) => permission)

    return {
      success: true,
      permissions,
      missingPermissions
    }
  } catch (error: any) {
    return {
      success: false,
      permissions: {
        tabs: false,
        windows: false,
        tabGroups: false,
        bookmarks: false,
        history: false,
        scripting: false,
        storage: false,
        contextMenus: false,
        sessions: false,
        management: false,
        downloads: false
      },
      missingPermissions: [],
      error: error?.message || String(error)
    }
  }
}
