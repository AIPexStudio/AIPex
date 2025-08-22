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

/**
 * Get all browser windows
 */
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

/**
 * Get the current focused window
 */
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

/**
 * Switch focus to a specific window
 */
export async function switchToWindow(windowId: number): Promise<{ success: boolean; error?: string }> {
  try {
    await chrome.windows.update(windowId, { focused: true })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Create a new browser window
 */
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

/**
 * Close a specific window
 */
export async function closeWindow(windowId: number): Promise<{ success: boolean; error?: string }> {
  try {
    await chrome.windows.remove(windowId)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Minimize a specific window
 */
export async function minimizeWindow(windowId: number): Promise<{ success: boolean; error?: string }> {
  try {
    await chrome.windows.update(windowId, { state: "minimized" })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Maximize a specific window
 */
export async function maximizeWindow(windowId: number): Promise<{ success: boolean; error?: string }> {
  try {
    await chrome.windows.update(windowId, { state: "maximized" })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Restore a minimized window
 */
export async function restoreWindow(windowId: number): Promise<{ success: boolean; error?: string }> {
  try {
    await chrome.windows.update(windowId, { state: "normal" })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Update window properties
 */
export async function updateWindow(windowId: number, updates: {
  left?: number
  top?: number
  width?: number
  height?: number
  focused?: boolean
  state?: chrome.windows.WindowState
}): Promise<{ success: boolean; error?: string }> {
  try {
    await chrome.windows.update(windowId, updates)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Get window by ID
 */
export async function getWindow(windowId: number): Promise<SimplifiedWindow | null> {
  try {
    const window = await chrome.windows.get(windowId, { populate: true })
    
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
  } catch {
    return null
  }
}

/**
 * Get all windows of a specific type
 */
export async function getWindowsByType(type: chrome.windows.WindowType): Promise<SimplifiedWindow[]> {
  const windows = await chrome.windows.getAll({ populate: true })
  
  return windows
    .filter(window => window.type === type)
    .map(window => ({
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

/**
 * Arrange windows in a grid layout
 */
export async function arrangeWindowsInGrid(columns: number = 2): Promise<{ success: boolean; error?: string }> {
  try {
    const windows = await chrome.windows.getAll({ populate: true })
    const normalWindows = windows.filter(w => w.type === "normal" && w.state !== "minimized")
    
    if (normalWindows.length === 0) {
      return { success: true }
    }
    
    const screenWidth = window.screen.availWidth
    const screenHeight = window.screen.availHeight
    const windowWidth = Math.floor(screenWidth / columns)
    const windowHeight = Math.floor(screenHeight / Math.ceil(normalWindows.length / columns))
    
    for (let i = 0; i < normalWindows.length; i++) {
      const row = Math.floor(i / columns)
      const col = i % columns
      const left = col * windowWidth
      const top = row * windowHeight
      
      await chrome.windows.update(normalWindows[i].id, {
        left,
        top,
        width: windowWidth,
        height: windowHeight,
        state: "normal"
      })
    }
    
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Cascade windows
 */
export async function cascadeWindows(): Promise<{ success: boolean; error?: string }> {
  try {
    const windows = await chrome.windows.getAll({ populate: true })
    const normalWindows = windows.filter(w => w.type === "normal" && w.state !== "minimized")
    
    if (normalWindows.length === 0) {
      return { success: true }
    }
    
    const offset = 30
    const baseWidth = 800
    const baseHeight = 600
    
    for (let i = 0; i < normalWindows.length; i++) {
      const left = i * offset
      const top = i * offset
      
      await chrome.windows.update(normalWindows[i].id, {
        left,
        top,
        width: baseWidth,
        height: baseHeight,
        state: "normal"
      })
    }
    
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}
