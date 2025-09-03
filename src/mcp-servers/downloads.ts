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

/**
 * Download text content as markdown file
 */
export async function downloadTextAsMarkdown(
  text: string,
  filename?: string,
  folderPath?: string
): Promise<{
  success: boolean
  downloadId?: number
  error?: string
  finalPath?: string
}> {
  try {
    // Check if downloads permission is available
    if (!chrome.downloads) {
      return { 
        success: false, 
        error: "Downloads permission not available. Please check extension permissions." 
      }
    }

    // Validate input
    if (!text || typeof text !== 'string') {
      return {
        success: false,
        error: "Text content is required and must be a string"
      }
    }

    // Generate filename if not provided
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    const baseFilename = filename || `text-${timestamp}`
    
    // Ensure filename has .md extension
    const mdFilename = baseFilename.endsWith('.md') ? baseFilename : `${baseFilename}.md`
    
    // Construct full path with folder if provided
    const finalPath = folderPath ? `${folderPath}/${mdFilename}` : mdFilename

    // Create data URI with text content (compatible with Chrome extension background script)
    const encoder = new TextEncoder()
    const uint8Array = encoder.encode(text)
    const base64String = btoa(String.fromCharCode.apply(null, Array.from(uint8Array)))
    const dataUri = `data:text/markdown;charset=utf-8;base64,${base64String}`

    // Download the file
    const downloadId = await chrome.downloads.download({
      url: dataUri,
      filename: finalPath,
      saveAs: true // This will show the save dialog
    })

    return { 
      success: true, 
      downloadId: downloadId,
      finalPath: finalPath
    }
  } catch (error: any) {
    console.error("Error in downloadTextAsMarkdown:", error)
    return { 
      success: false, 
      error: error?.message || String(error) || "Failed to download markdown file"
    }
  }
}

/**
 * Download image from base64 data
 */
export async function downloadImage(
  imageData: string,
  filename?: string,
  folderPath?: string
): Promise<{
  success: boolean
  downloadId?: number
  error?: string
  finalPath?: string
}> {
  try {
    // Check if downloads permission is available
    if (!chrome.downloads) {
      return { 
        success: false, 
        error: "Downloads permission not available. Please check extension permissions." 
      }
    }

    // Validate input
    if (!imageData || typeof imageData !== 'string') {
      return {
        success: false,
        error: "Image data is required and must be a string"
      }
    }

    // Validate that it's a proper data URI for an image
    if (!imageData.startsWith('data:image/')) {
      return {
        success: false,
        error: "Invalid image data format. Expected data:image/ URI"
      }
    }

    // Extract image format from data URI
    const mimeMatch = imageData.match(/data:image\/([^;]+)/)
    const imageFormat = mimeMatch ? mimeMatch[1] : 'png'
    
    // Generate filename if not provided
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    const baseFilename = filename || `image-${timestamp}`
    
    // Ensure filename has correct extension
    const extension = imageFormat === 'jpeg' ? 'jpg' : imageFormat
    const imageFilename = baseFilename.includes('.') ? baseFilename : `${baseFilename}.${extension}`
    
    // Construct full path with folder if provided
    const finalPath = folderPath ? `${folderPath}/${imageFilename}` : imageFilename

    // Download the file using the data URI directly
    const downloadId = await chrome.downloads.download({
      url: imageData,
      filename: finalPath,
      saveAs: true // This will show the save dialog
    })

    return { 
      success: true, 
      downloadId: downloadId,
      finalPath: finalPath
    }
  } catch (error: any) {
    console.error("Error in downloadImage:", error)
    return { 
      success: false, 
      error: error?.message || String(error) || "Failed to download image"
    }
  }
}

/**
 * Download all images from AI chat messages
 */
export async function downloadChatImages(
  messages: Array<{
    id: string
    parts?: Array<{
      type: string
      imageData?: string
      imageTitle?: string
    }>
  }>,
  folderPrefix?: string,
  filenamingStrategy: string = 'descriptive'
): Promise<{
  success: boolean
  downloadedCount?: number
  downloadIds?: number[]
  errors?: string[]
  folderPath?: string
  filesList?: string[]
}> {
  try {
    console.log('💾 [DEBUG] downloadChatImages starting execution:', { messagesCount: messages.length, folderPrefix, filenamingStrategy })
    
    // Check if downloads permission is available
    if (!chrome.downloads) {
      console.error('❌ [DEBUG] chrome.downloads API not available')
      return { 
        success: false, 
        errors: ["Downloads permission not available. Please check extension permissions."]
      }
    }

    const downloadIds: number[] = []
    const errors: string[] = []
    const filesList: string[] = []
    let downloadedCount = 0
    let imageIndex = 0

    // Extract all images from messages
    for (const message of messages) {
      console.log('🔄 [DEBUG] Processing message:', { messageId: message.id, partsCount: message.parts?.length })
      if (!message.parts) continue

      for (const part of message.parts) {
        console.log('🖼️ [DEBUG] Processing part:', { type: part.type, hasImageData: !!part.imageData, title: part.imageTitle })
        
        if (part.type === 'image' && part.imageData) {
          try {
            imageIndex++
            
            // Generate filename based on strategy
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
            const titleSlug = part.imageTitle 
              ? part.imageTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
              : `image-${imageIndex}`
            
            let baseFilename: string
            switch (filenamingStrategy) {
              case 'sequential':
                baseFilename = `image-${String(imageIndex).padStart(3, '0')}`
                break
              case 'timestamp':
                baseFilename = `image-${timestamp}`
                break
              case 'descriptive':
              default:
                baseFilename = `${titleSlug}-${timestamp}`
                break
            }
            
            const filename = folderPrefix 
              ? `${folderPrefix}/${baseFilename}`
              : baseFilename

            console.log('📝 [DEBUG] Preparing download:', { filename, imageDataLength: part.imageData.length, strategy: filenamingStrategy })

            const result = await downloadImage(part.imageData, filename)
            console.log('⬇️ [DEBUG] Download result:', result)
            
            if (result.success && result.downloadId) {
              downloadIds.push(result.downloadId)
              downloadedCount++
              // Extract just the filename for display
              const displayFilename = result.finalPath?.split('/').pop() || `${baseFilename}.png`
              filesList.push(displayFilename)
            } else {
              errors.push(`Failed to download image: ${result.error || 'Unknown error'}`)
            }
          } catch (error: any) {
            console.error('❌ [DEBUG] Image processing error:', error)
            errors.push(`Error processing image: ${error?.message || String(error)}`)
          }
        }
      }
    }

    const finalResult = {
      success: downloadedCount > 0 || errors.length === 0,
      downloadedCount,
      downloadIds,
      errors: errors.length > 0 ? errors : undefined,
      folderPath: folderPrefix,
      filesList: filesList.length > 0 ? filesList : undefined
    }
    
    console.log('📊 [DEBUG] Final result:', finalResult)
    return finalResult
  } catch (error: any) {
    console.error("❌ [DEBUG] downloadChatImages error:", error)
    return { 
      success: false, 
      errors: [error?.message || String(error) || "Failed to download chat images"]
    }
  }
}
