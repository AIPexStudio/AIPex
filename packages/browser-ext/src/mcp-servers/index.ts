// Tab Management

// Bookmarks
export * from "./bookmarks";
// Clipboard
export * from "./clipboard";
// Context Menus
export * from "./context-menus";
// Downloads
export * from "./downloads";
// Extensions
export * from "./extensions";
// History
export * from "./history";
// Page Content
export * from "./page-content";
// Screenshot
export * from "./screenshot";
// Sessions
export * from "./sessions";
// Storage
export * from "./storage";
// Tab Groups
export * from "./tab-groups";
export * from "./tab-management";
// Legacy exports from tools.ts (for backward compatibility)
export {
  chatCompletion,
  clearHistory,
  closeTab,
  closeWindow,
  createBookmark,
  createNewTab,
  createNewWindow,
  createTabGroup,
  deleteBookmark,
  deleteHistoryItem,
  duplicateTab,
  // Bookmark management
  getAllBookmarks,
  // Tab group management
  getAllTabGroups,
  getAllTabs,
  // Window management
  getAllWindows,
  getBookmarkFolders,
  getCurrentTab,
  getCurrentTabContent,
  getCurrentWindow,
  // History management
  getRecentHistory,
  getTabContent,
  // Utility functions
  getTabInfo,
  groupTabsByAI,
  maximizeWindow,
  minimizeWindow,
  searchBookmarks,
  searchHistory,
  switchToTab,
  switchToWindow,
  ungroupAllTabs,
  updateTabGroup,
} from "./tools";
// Utils
export * from "./utils";
// Windows
export * from "./windows";
