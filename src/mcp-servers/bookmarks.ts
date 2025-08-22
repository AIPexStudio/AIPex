export type SimplifiedBookmark = {
  id: string
  title: string
  url?: string
  parentId?: string
  children?: SimplifiedBookmark[]
}

/**
 * Get all bookmarks in a flattened list
 */
export async function getAllBookmarks(): Promise<SimplifiedBookmark[]> {
  const bookmarks = await chrome.bookmarks.getTree()
  
  function flattenBookmarks(nodes: chrome.bookmarks.BookmarkTreeNode[]): SimplifiedBookmark[] {
    const result: SimplifiedBookmark[] = []
    
    for (const node of nodes) {
      if (node.url) {
        // This is a bookmark
        result.push({
          id: node.id,
          title: node.title,
          url: node.url,
          parentId: node.parentId
        })
      } else if (node.children) {
        // This is a folder, recursively process children
        result.push(...flattenBookmarks(node.children))
      }
    }
    
    return result
  }
  
  return flattenBookmarks(bookmarks)
}

/**
 * Get bookmark folder structure
 */
export async function getBookmarkFolders(): Promise<SimplifiedBookmark[]> {
  const bookmarks = await chrome.bookmarks.getTree()
  
  function getFolders(nodes: chrome.bookmarks.BookmarkTreeNode[]): SimplifiedBookmark[] {
    const result: SimplifiedBookmark[] = []
    
    for (const node of nodes) {
      if (!node.url && node.children) {
        // This is a folder
        result.push({
          id: node.id,
          title: node.title,
          parentId: node.parentId,
          children: getFolders(node.children)
        })
      }
    }
    
    return result
  }
  
  return getFolders(bookmarks)
}

/**
 * Create a new bookmark
 */
export async function createBookmark(title: string, url: string, parentId?: string): Promise<{ success: boolean; bookmarkId?: string; error?: string }> {
  try {
    const bookmark = await chrome.bookmarks.create({
      title,
      url,
      parentId: parentId || "1" // Default to bookmarks bar
    })
    return { success: true, bookmarkId: bookmark.id }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Delete a bookmark by ID
 */
export async function deleteBookmark(bookmarkId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await chrome.bookmarks.remove(bookmarkId)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Search bookmarks by title/URL
 */
export async function searchBookmarks(query: string): Promise<SimplifiedBookmark[]> {
  const results = await chrome.bookmarks.search(query)
  return results.map(bookmark => ({
    id: bookmark.id,
    title: bookmark.title,
    url: bookmark.url,
    parentId: bookmark.parentId
  }))
}

/**
 * Get bookmark by ID
 */
export async function getBookmark(bookmarkId: string): Promise<SimplifiedBookmark | null> {
  try {
    const bookmarks = await chrome.bookmarks.get(bookmarkId)
    if (bookmarks.length === 0) return null
    
    const bookmark = bookmarks[0]
    return {
      id: bookmark.id,
      title: bookmark.title,
      url: bookmark.url,
      parentId: bookmark.parentId
    }
  } catch {
    return null
  }
}

/**
 * Update bookmark properties
 */
export async function updateBookmark(bookmarkId: string, changes: { title?: string; url?: string }): Promise<{ success: boolean; error?: string }> {
  try {
    await chrome.bookmarks.update(bookmarkId, changes)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Move bookmark to a different folder
 */
export async function moveBookmark(bookmarkId: string, destination: { parentId?: string; index?: number }): Promise<{ success: boolean; error?: string }> {
  try {
    await chrome.bookmarks.move(bookmarkId, destination)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Create a new bookmark folder
 */
export async function createBookmarkFolder(title: string, parentId?: string): Promise<{ success: boolean; folderId?: string; error?: string }> {
  try {
    const folder = await chrome.bookmarks.create({
      title,
      parentId: parentId || "1" // Default to bookmarks bar
    })
    return { success: true, folderId: folder.id }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Delete a bookmark folder and all its contents
 */
export async function deleteBookmarkFolder(folderId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await chrome.bookmarks.removeTree(folderId)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Get bookmarks from a specific folder
 */
export async function getBookmarksFromFolder(folderId: string): Promise<SimplifiedBookmark[]> {
  try {
    const children = await chrome.bookmarks.getChildren(folderId)
    return children.map(bookmark => ({
      id: bookmark.id,
      title: bookmark.title,
      url: bookmark.url,
      parentId: bookmark.parentId
    }))
  } catch {
    return []
  }
}
