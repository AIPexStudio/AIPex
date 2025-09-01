// Tab Management
export * from "./tab-management"

// Tab Groups
export * from "./tab-groups"

// Bookmarks
export * from "./bookmarks"

// History
export * from "./history"

// Windows
export * from "./windows"

// Page Content
export * from "./page-content"

// Clipboard
export * from "./clipboard"

// Storage
export * from "./storage"

// Utils
export * from "./utils"

// Extensions
export * from "./extensions"

// Downloads
export * from "./downloads"

// Sessions
export * from "./sessions"

// Context Menus
export * from "./context-menus"

// Screenshot
export * from "./screenshot"

// Legacy exports from tools.ts (for backward compatibility)
export {
  getAllTabs,
  getCurrentTab,
  switchToTab,
  groupTabsByAI,
  ungroupAllTabs,
  chatCompletion,
  getCurrentTabContent,
  createNewTab,
  // Bookmark management
  getAllBookmarks,
  getBookmarkFolders,
  createBookmark,
  deleteBookmark,
  searchBookmarks,
  // History management
  getRecentHistory,
  searchHistory,
  deleteHistoryItem,
  clearHistory,
  // Window management
  getAllWindows,
  getCurrentWindow,
  switchToWindow,
  createNewWindow,
  closeWindow,
  minimizeWindow,
  maximizeWindow,
  // Tab group management
  getAllTabGroups,
  createTabGroup,
  updateTabGroup,
  // Utility functions
  getTabInfo,
  duplicateTab,
  closeTab
} from "./tools"


