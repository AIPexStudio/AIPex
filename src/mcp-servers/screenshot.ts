/**
 * Screenshot tools for capturing and managing screen captures
 */

/**
 * Capture screenshot of current visible tab
 */
export async function captureScreenshot(): Promise<{ success: boolean; imageData?: string; error?: string }> {
  try {
    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab || typeof tab.id !== "number" || !tab.windowId) {
      return { success: false, error: "No active tab found" }
    }

    // Check if we can capture this tab
    if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://'))) {
      return { 
        success: false, 
        error: "Cannot capture browser internal pages (chrome:// or extension:// URLs)" 
      }
    }

    // Wait for tab to be ready if still loading
    if (tab.status === 'loading') {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // Focus the window first
    await chrome.windows.update(tab.windowId, { focused: true })
    
    // Small delay to ensure focus
    await new Promise(resolve => setTimeout(resolve, 100))

    // Capture visible tab as data URL
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'png',
      quality: 90
    })

    // Validate the captured data
    if (!dataUrl || !dataUrl.startsWith('data:image/')) {
      return { success: false, error: "Invalid image data captured" }
    }

    return { 
      success: true, 
      imageData: dataUrl 
    }
  } catch (error: any) {
    const errorMessage = error?.message || String(error)
    
    // Handle specific Chrome errors
    if (errorMessage.includes('cannot be captured')) {
      return { 
        success: false, 
        error: "This page cannot be captured. Try refreshing the page or switching to a different tab." 
      }
    }
    
    return { 
      success: false, 
      error: `Screenshot failed: ${errorMessage}` 
    }
  }
}

/**
 * Capture screenshot of a specific tab
 */
export async function captureTabScreenshot(tabId: number): Promise<{ success: boolean; imageData?: string; error?: string }> {
  try {
    // Get tab info
    const tab = await chrome.tabs.get(tabId)
    if (!tab || !tab.windowId) {
      return { success: false, error: "Tab not found" }
    }

    // Make sure the tab is active in its window for screenshot
    await chrome.tabs.update(tabId, { active: true })
    
    // Small delay to ensure tab is ready
    await new Promise(resolve => setTimeout(resolve, 100))

    // Capture visible tab as data URL
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'png',
      quality: 90
    })

    return { 
      success: true, 
      imageData: dataUrl 
    }
  } catch (error: any) {
    return { 
      success: false, 
      error: error?.message || String(error) 
    }
  }
}

/**
 * Capture screenshot and save to clipboard
 */
export async function captureScreenshotToClipboard(): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await captureScreenshot()
    if (!result.success || !result.imageData) {
      return { success: false, error: result.error || "Failed to capture screenshot" }
    }

    // Convert data URL to blob
    const response = await fetch(result.imageData)
    const blob = await response.blob()

    // Write to clipboard
    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob
      })
    ])

    return { success: true }
  } catch (error: any) {
    return { 
      success: false, 
      error: error?.message || String(error) 
    }
  }
}

/**
 * Read image from clipboard
 */
export async function readClipboardImage(): Promise<{ success: boolean; imageData?: string; error?: string }> {
  try {
    // Read clipboard contents
    const clipboardItems = await navigator.clipboard.read()
    
    // Find the first image item
    for (const item of clipboardItems) {
      for (const type of item.types) {
        if (type.startsWith('image/')) {
          const blob = await item.getType(type)
          
          // Convert blob to data URL
          return new Promise((resolve) => {
            const reader = new FileReader()
            reader.onload = () => {
              resolve({
                success: true,
                imageData: reader.result as string
              })
            }
            reader.onerror = () => {
              resolve({
                success: false,
                error: "Failed to read image data"
              })
            }
            reader.readAsDataURL(blob)
          })
        }
      }
    }

    return { success: false, error: "No image found in clipboard" }
  } catch (error: any) {
    return { 
      success: false, 
      error: error?.message || String(error) 
    }
  }
}

/**
 * Get clipboard image info without reading the full data
 */
export async function getClipboardImageInfo(): Promise<{ success: boolean; hasImage?: boolean; imageType?: string; error?: string }> {
  try {
    const clipboardItems = await navigator.clipboard.read()
    
    for (const item of clipboardItems) {
      for (const type of item.types) {
        if (type.startsWith('image/')) {
          return {
            success: true,
            hasImage: true,
            imageType: type
          }
        }
      }
    }

    return {
      success: true,
      hasImage: false
    }
  } catch (error: any) {
    return { 
      success: false, 
      error: error?.message || String(error) 
    }
  }
}
