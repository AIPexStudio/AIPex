/**
 * Create context menu item
 */
export async function createContextMenuItem(options: {
  id: string
  title: string
  contexts?: chrome.contextMenus.ContextType[]
  documentUrlPatterns?: string[]
  onclick?: () => void
}): Promise<{
  success: boolean
  error?: string
}> {
  try {
    await chrome.contextMenus.create({
      id: options.id,
      title: options.title,
      contexts: options.contexts || ["all"],
      documentUrlPatterns: options.documentUrlPatterns
    })
    
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Update context menu item
 */
export async function updateContextMenuItem(id: string, updates: {
  title?: string
  contexts?: chrome.contextMenus.ContextType[]
  documentUrlPatterns?: string[]
}): Promise<{
  success: boolean
  error?: string
}> {
  try {
    await chrome.contextMenus.update(id, updates)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Remove context menu item
 */
export async function removeContextMenuItem(id: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    await chrome.contextMenus.remove(id)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Remove all context menu items
 */
export async function removeAllContextMenuItems(): Promise<{
  success: boolean
  error?: string
}> {
  try {
    await chrome.contextMenus.removeAll()
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Get context menu items
 */
export async function getContextMenuItems(): Promise<{
  success: boolean
  items?: chrome.contextMenus.ContextMenuItem[]
  error?: string
}> {
  try {
    // Note: Chrome doesn't provide a direct API to get all context menu items
    // This is a limitation of the Chrome Extensions API
    return { 
      success: true, 
      items: [],
      error: "Chrome Extensions API doesn't provide a way to list context menu items"
    }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}
