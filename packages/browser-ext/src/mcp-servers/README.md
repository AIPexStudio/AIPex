# AIPex MCP Server Tools

This directory contains all the MCP (Model Context Protocol) server tools for the AIPex browser extension, organized into separate files by category.

## Tool Categories

**Total: 112 MCP Tools** (organized into 14 categories)

> ✅ **All tools are now fully integrated with the MCP client and can be called by AI!**
> 
> **🎯 AI Integration Status**: All 112 tools are now available to the AI assistant. When users chat with the AI, it can access and use any of these tools based on the user's request, allowing for comprehensive browser automation and management.
> **🔧 Permission Requirements**: Some tools require specific Chrome extension permissions. If you encounter permission errors, use the `check_permissions` tool to diagnose issues. The extension needs these permissions in `package.json`:
> - `management` - for extension management tools
> - `downloads` - for download management tools
> - `sessions` - for session management tools
> - `contextMenus` - for context menu tools

### 1. Tab Management (`tab-management.ts`)
Tools for managing browser tabs.

- `getAllTabs()` - Get all open tabs across all windows
- `getCurrentTab()` - Get the currently active tab
- `switchToTab(tabId)` - Switch to a specific tab by ID
- `createNewTab(url)` - Create a new tab with the specified URL
- `getTabInfo(tabId)` - Get detailed information about a specific tab
- `duplicateTab(tabId)` - Duplicate an existing tab
- `closeTab(tabId)` - Close a specific tab
- `getCurrentTabContent()` - Get the visible text content of the current tab

### 2. Tab Groups (`tab-groups.ts`)
Tools for managing tab groups and AI-powered organization.

- `ungroupAllTabs()` - Remove all tab groups in the current window
- `groupTabsByAI()` - Use AI to automatically group tabs by topic/purpose
- `getAllTabGroups()` - Get all tab groups across all windows
- `createTabGroup(tabIds, title?, color?)` - Create a new tab group with specified tabs
- `updateTabGroup(groupId, updates)` - Update tab group properties

### 3. Bookmarks (`bookmarks.ts`)
Tools for managing browser bookmarks.

- `getAllBookmarks()` - Get all bookmarks in a flattened list
- `getBookmarkFolders()` - Get bookmark folder structure
- `createBookmark(title, url, parentId?)` - Create a new bookmark
- `deleteBookmark(bookmarkId)` - Delete a bookmark by ID
- `searchBookmarks(query)` - Search bookmarks by title/URL
- `getBookmark(bookmarkId)` - Get bookmark by ID
- `updateBookmark(bookmarkId, changes)` - Update bookmark properties
- `moveBookmark(bookmarkId, destination)` - Move bookmark to a different folder
- `createBookmarkFolder(title, parentId?)` - Create a new bookmark folder
- `deleteBookmarkFolder(folderId)` - Delete a bookmark folder and all its contents
- `getBookmarksFromFolder(folderId)` - Get bookmarks from a specific folder

### 4. History (`history.ts`)
Tools for managing browsing history.

- `getRecentHistory(limit?)` - Get recent browsing history
- `searchHistory(query, limit?)` - Search browsing history
- `deleteHistoryItem(url)` - Delete a specific history item by URL
- `clearHistory(days?)` - Clear browsing history for specified days
- `getHistoryForUrl(url)` - Get history for a specific URL
- `getHistoryForTimeRange(startTime, endTime, limit?)` - Get history for a specific time range
- `getMostVisitedSites(limit?)` - Get most visited sites
- `getHistoryStats()` - Get history statistics

### 5. Windows (`windows.ts`)
Tools for managing browser windows.

- `getAllWindows()` - Get all browser windows
- `getCurrentWindow()` - Get the current focused window
- `switchToWindow(windowId)` - Switch focus to a specific window
- `createNewWindow(url?)` - Create a new browser window
- `closeWindow(windowId)` - Close a specific window
- `minimizeWindow(windowId)` - Minimize a specific window
- `maximizeWindow(windowId)` - Maximize a specific window
- `restoreWindow(windowId)` - Restore a minimized window
- `updateWindow(windowId, updates)` - Update window properties
- `getWindow(windowId)` - Get window by ID
- `getWindowsByType(type)` - Get all windows of a specific type
- `arrangeWindowsInGrid(columns?)` - Arrange windows in a grid layout
- `cascadeWindows()` - Cascade windows

### 6. Page Content (`page-content.ts`)
Tools for extracting and analyzing page content.

- `getPageMetadata()` - Get page metadata and content
- `extractPageText()` - Extract text content from the current page
- `getPageLinks()` - Get all links from the current page
- `getPageImages()` - Get all images from the current page
- `searchPageText(query)` - Search for text on the current page
- `getPagePerformance()` - Get page performance metrics
- `getPageAccessibility()` - Get page accessibility information

### 7. Clipboard (`clipboard.ts`)
Tools for clipboard operations.

- `copyToClipboard(text)` - Copy text to clipboard
- `readFromClipboard()` - Read text from clipboard
- `copyCurrentPageUrl()` - Copy current page URL to clipboard
- `copyCurrentPageTitle()` - Copy current page title to clipboard
- `copySelectedText()` - Copy selected text from current page
- `copyPageAsMarkdown()` - Copy page content as markdown
- `copyPageAsText()` - Copy page content as plain text
- `copyPageLinks()` - Copy all links from current page
- `copyPageMetadata()` - Copy page metadata

### 8. Storage (`storage.ts`)
Tools for managing extension storage and settings.

- `getStorageValue(key)` - Get a value from storage
- `setStorageValue(key, value)` - Set a value in storage
- `removeStorageValue(key)` - Remove a value from storage
- `getAllStorageKeys()` - Get all storage keys
- `clearAllStorage()` - Clear all storage
- `getExtensionSettings()` - Get extension settings
- `updateExtensionSettings(updates)` - Update extension settings
- `getAiConfig()` - Get AI configuration
- `setAiConfig(config)` - Set AI configuration
- `exportStorageData()` - Export storage data
- `importStorageData(jsonData)` - Import storage data
- `getStorageStats()` - Get storage usage statistics

### 9. Utils (`utils.ts`)
Utility and helper functions.

- `getBrowserInfo()` - Get browser information
- `getSystemInfo()` - Get system information
- `getCurrentDateTime()` - Get current date and time
- `formatTimestamp(timestamp, format?)` - Format a timestamp
- `generateRandomString(length?, type?)` - Generate a random string
- `validateUrl(url)` - Validate URL
- `extractDomain(url)` - Extract domain from URL
- `getUrlParameters(url)` - Get URL parameters
- `buildUrl(baseUrl, parameters)` - Build URL with parameters
- `getTextStats(text)` - Get text statistics
- `convertTextCase(text, caseType)` - Convert text case

### 10. Extensions (`extensions.ts`)
Tools for managing browser extensions.

- `getAllExtensions()` - Get all installed extensions
- `getExtension(extensionId)` - Get extension by ID
- `setExtensionEnabled(extensionId, enabled)` - Enable/disable extension
- `uninstallExtension(extensionId)` - Uninstall extension
- `getExtensionPermissions(extensionId)` - Get extension permissions

### 11. Downloads (`downloads.ts`)
Tools for managing downloads.

- `getAllDownloads()` - Get all downloads
- `getDownload(downloadId)` - Get download by ID
- `pauseDownload(downloadId)` - Pause download
- `resumeDownload(downloadId)` - Resume download
- `cancelDownload(downloadId)` - Cancel download
- `removeDownload(downloadId)` - Remove download from history
- `openDownload(downloadId)` - Open download file
- `showDownloadInFolder(downloadId)` - Show download in folder
- `getDownloadStats()` - Get download statistics
- `downloadTextAsMarkdown(text, filename?)` - Download text content as markdown file

### 12. Sessions (`sessions.ts`)
Tools for managing browser sessions.

- `getAllSessions()` - Get all sessions
- `getSession(sessionId)` - Get session by ID
- `restoreSession(sessionId)` - Restore session
- `getCurrentDevice()` - Get current device
- `getAllDevices()` - Get all devices

### 13. Context Menus (`context-menus.ts`)
Tools for managing context menus.

- `createContextMenuItem(options)` - Create context menu item
- `updateContextMenuItem(id, updates)` - Update context menu item
- `removeContextMenuItem(id)` - Remove context menu item
- `removeAllContextMenuItems()` - Remove all context menu items
- `getContextMenuItems()` - Get context menu items

### 14. Screenshot (`screenshot.ts`)
Tools for capturing screenshots and managing clipboard images.

- `captureScreenshot()` - Capture screenshot of current visible tab and return as base64 data URL
- `captureTabScreenshot(tabId)` - Capture screenshot of a specific tab by ID
- `captureScreenshotToClipboard()` - Capture screenshot and save directly to clipboard
- `readClipboardImage()` - Read image from clipboard and return as base64 data URL for display
- `getClipboardImageInfo()` - Check if clipboard contains image and get basic info

## Data Types

### SimplifiedTab
```typescript
{
  id: number
  index: number
  windowId: number
  title?: string
  url?: string
}
```

### SimplifiedBookmark
```typescript
{
  id: string
  title: string
  url?: string
  parentId?: string
  children?: SimplifiedBookmark[]
}
```

### HistoryItem
```typescript
{
  id: string
  url: string
  title: string
  lastVisitTime: number
  visitCount: number
}
```

### SimplifiedWindow
```typescript
{
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
```

### TabGroup
```typescript
{
  id: number
  title: string
  color: string
  collapsed: boolean
  windowId: number
  tabCount: number
}
```

## Usage Examples

### Basic Tab Management
```typescript
import { getAllTabs, switchToTab, createNewTab } from "~mcp-servers"

// Get all tabs
const tabs = await getAllTabs()
console.log(`Found ${tabs.length} tabs`)

// Switch to a specific tab
await switchToTab(123)

// Create a new tab
const newTab = await createNewTab("https://example.com")
```

### Bookmark Operations
```typescript
import { getAllBookmarks, createBookmark, searchBookmarks } from "~mcp-servers"

// Get all bookmarks
const bookmarks = await getAllBookmarks()

// Create a bookmark
await createBookmark("GitHub", "https://github.com", "1")

// Search bookmarks
const results = await searchBookmarks("documentation")
```

### Page Content Analysis
```typescript
import { getPageMetadata, extractPageText, getPageLinks } from "~mcp-servers"

// Get page metadata
const metadata = await getPageMetadata()
console.log(`Page: ${metadata.title}`)

// Extract text content
const content = await extractPageText()
console.log(`Word count: ${content.wordCount}`)

// Get all links
const links = await getPageLinks()
console.log(`Found ${links.links.length} links`)
```

### Screenshot Operations
```typescript
import { captureScreenshot, readClipboardImage, captureScreenshotToClipboard } from "~mcp-servers"

// Capture current tab screenshot
const screenshot = await captureScreenshot()
if (screenshot.success) {
  console.log("Screenshot captured:", screenshot.imageData)
}

// Capture specific tab screenshot
const tabScreenshot = await captureTabScreenshot(123)

// Capture and save to clipboard
await captureScreenshotToClipboard()

// Read image from clipboard
const clipboardImage = await readClipboardImage()
if (clipboardImage.success) {
  console.log("Image found in clipboard:", clipboardImage.imageData)
}

// Check if clipboard has image
const imageInfo = await getClipboardImageInfo()
if (imageInfo.hasImage) {
  console.log("Clipboard has image:", imageInfo.imageType)
}
```

⚠️ **Important Note on Token Management**: 
Screenshot tools return base64 image data which can be very large (tens of thousands of tokens). To prevent AI context overflow, the system automatically:
- Replaces base64 data with summary text in AI conversation context
- Stores actual image data separately for UI display
- Shows images in the chat interface without sending them to the AI model

This ensures optimal performance while maintaining full functionality.

### Download Text as Markdown
```typescript
import { downloadTextAsMarkdown } from "~mcp-servers"

// Download text content as markdown with auto-generated filename
const markdownContent = "# My Document\n\nThis is some **markdown** content."
const result = await downloadTextAsMarkdown(markdownContent)
if (result.success) {
  console.log("Download started with ID:", result.downloadId)
}

// Download text content with custom filename
await downloadTextAsMarkdown(
  "# Custom Document\n\nCustom content here.",
  "my-custom-document"
)

// Example with current page content as markdown
const pageContent = await extractPageText()
if (pageContent.success) {
  const markdownFormat = `# ${pageContent.title}\n\n${pageContent.text}`
  await downloadTextAsMarkdown(markdownFormat, `page-${Date.now()}`)
}
```

### Clipboard Operations
```typescript
import { copyToClipboard, copyCurrentPageUrl, copySelectedText } from "~mcp-servers"

// Copy text to clipboard
await copyToClipboard("Hello, world!")

// Copy current page URL
await copyCurrentPageUrl()

// Copy selected text
await copySelectedText()
```

## Error Handling

All functions include comprehensive error handling and return meaningful error messages when operations fail. Common error scenarios include:

- Invalid IDs (tab, window, bookmark, etc.)
- Missing required parameters
- Permission denied
- Network errors
- Chrome API errors

## Response Format

All MCP tools return responses in the following format:

```typescript
{
  success: boolean
  data?: any
  error?: string
}
```

## Permissions Required

The extension requires the following Chrome permissions:

- `tabs` - Tab management
- `windows` - Window management
- `tabGroups` - Tab group management
- `bookmarks` - Bookmark management
- `history` - History management
- `scripting` - Content script execution
- `storage` - Data storage
- `activeTab` - Current tab access
- `clipboardRead` - Read clipboard content
- `clipboardWrite` - Write to clipboard

## Integration with AI

The MCP servers are designed to work seamlessly with AI assistants, providing natural language interfaces for browser automation. The AI can use these tools to:

- Organize and manage tabs intelligently
- Search and manage bookmarks
- Navigate browsing history
- Control window layouts
- Extract and analyze page content
- Perform clipboard operations
- Manage extension settings
- Automate repetitive browser tasks

All functions are optimized for AI interaction with clear, consistent interfaces and comprehensive error handling.
