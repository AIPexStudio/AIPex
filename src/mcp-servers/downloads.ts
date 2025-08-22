/**
 * Get all downloads
 */
export async function getAllDownloads(): Promise<{
  success: boolean
  downloads?: Array<{
    id: number
    filename: string
    url: string
    fileSize: number
    startTime: string
    endTime?: string
    state: chrome.downloads.DownloadState
    progress: number
  }>
  error?: string
}> {
  try {
    // Check if downloads permission is available
    if (!chrome.downloads) {
      return { 
        success: false, 
        error: "Downloads permission not available. Please check extension permissions." 
      }
    }

    const downloads = await chrome.downloads.search({})
    
    const downloadData = downloads.map(download => ({
      id: download.id,
      filename: download.filename,
      url: download.url,
      fileSize: download.fileSize || 0,
      startTime: download.startTime,
      endTime: download.endTime,
      state: download.state,
      progress: download.bytesReceived / (download.totalBytes || 1) * 100
    }))
    
    return { success: true, downloads: downloadData }
  } catch (error: any) {
    console.error("Error in getAllDownloads:", error)
    return { 
      success: false, 
      error: error?.message || String(error) || "Failed to get downloads. Check if downloads permission is granted."
    }
  }
}

/**
 * Get download by ID
 */
export async function getDownload(downloadId: number): Promise<{
  success: boolean
  download?: {
    id: number
    filename: string
    url: string
    fileSize: number
    startTime: string
    endTime?: string
    state: chrome.downloads.DownloadState
    progress: number
  }
  error?: string
}> {
  try {
    const downloads = await chrome.downloads.search({ id: downloadId })
    
    if (downloads.length === 0) {
      return { success: false, error: "Download not found" }
    }
    
    const download = downloads[0]
    return {
      success: true,
      download: {
        id: download.id,
        filename: download.filename,
        url: download.url,
        fileSize: download.fileSize || 0,
        startTime: download.startTime,
        endTime: download.endTime,
        state: download.state,
        progress: download.bytesReceived / (download.totalBytes || 1) * 100
      }
    }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Pause download
 */
export async function pauseDownload(downloadId: number): Promise<{
  success: boolean
  error?: string
}> {
  try {
    await chrome.downloads.pause(downloadId)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Resume download
 */
export async function resumeDownload(downloadId: number): Promise<{
  success: boolean
  error?: string
}> {
  try {
    await chrome.downloads.resume(downloadId)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Cancel download
 */
export async function cancelDownload(downloadId: number): Promise<{
  success: boolean
  error?: string
}> {
  try {
    await chrome.downloads.cancel(downloadId)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Remove download from history
 */
export async function removeDownload(downloadId: number): Promise<{
  success: boolean
  error?: string
}> {
  try {
    await chrome.downloads.removeFile(downloadId)
    await chrome.downloads.erase({ id: downloadId })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Open download file
 */
export async function openDownload(downloadId: number): Promise<{
  success: boolean
  error?: string
}> {
  try {
    await chrome.downloads.open(downloadId)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Show download in folder
 */
export async function showDownloadInFolder(downloadId: number): Promise<{
  success: boolean
  error?: string
}> {
  try {
    await chrome.downloads.show(downloadId)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Get download statistics
 */
export async function getDownloadStats(): Promise<{
  success: boolean
  stats?: {
    total: number
    completed: number
    inProgress: number
    paused: number
    cancelled: number
    totalSize: number
  }
  error?: string
}> {
  try {
    const downloads = await chrome.downloads.search({})
    
    const stats = {
      total: downloads.length,
      completed: downloads.filter(d => d.state === "complete").length,
      inProgress: downloads.filter(d => d.state === "in_progress").length,
      paused: downloads.filter(d => d.state === "interrupted").length,
      cancelled: downloads.filter(d => d.state === "interrupted").length, // Count interrupted as cancelled for simplicity
      totalSize: downloads.reduce((sum, d) => sum + (d.fileSize || 0), 0)
    }
    
    return { success: true, stats }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}
