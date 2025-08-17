# AIPex Browser Extension MCP Servers

This document describes all the MCP (Model Context Protocol) server functions available in the AIPex browser extension.

## Overview

The AIPex browser extension provides comprehensive MCP server functionality for browser automation and management. All functions are designed to work with the Chrome Extensions API and provide simplified, consistent interfaces.

## Available MCP Tools

### Tab Management

#### `get_all_tabs`
- **Description**: Get all open tabs across all windows
- **Returns**: Array of `SimplifiedTab` objects with `id`, `index`, `windowId`, `title`, and `url`
- **Usage**: `{ tool: "get_all_tabs" }`

#### `get_current_tab`
- **Description**: Get the currently active tab
- **Returns**: `SimplifiedTab` object or `null`
- **Usage**: `{ tool: "get_current_tab" }`

#### `switch_to_tab`
- **Description**: Switch to a specific tab by ID
- **Parameters**: `{ tabId: number }`
- **Returns**: Success status
- **Usage**: `{ tool: "switch_to_tab", args: { tabId: 123 } }`

#### `create_new_tab`
- **Description**: Create a new tab with the specified URL
- **Parameters**: `{ url: string }`
- **Returns**: Tab creation result with `tabId` and `url`
- **Usage**: `{ tool: "create_new_tab", args: { url: "https://example.com" } }`

#### `get_current_tab_content`
- **Description**: Extract text content from the current active tab
- **Returns**: Object with `title`, `url`, and `content` (truncated to 200KB)
- **Usage**: `{ tool: "get_current_tab_content" }`

#### `get_tab_info`
- **Description**: Get detailed information about a specific tab
- **Parameters**: `{ tabId: number }`
- **Returns**: `SimplifiedTab` object or `null`
- **Usage**: `{ tool: "get_tab_info", args: { tabId: 123 } }`

#### `duplicate_tab`
- **Description**: Duplicate an existing tab
- **Parameters**: `{ tabId: number }`
- **Returns**: Success status and new tab ID
- **Usage**: `{ tool: "duplicate_tab", args: { tabId: 123 } }`

#### `close_tab`
- **Description**: Close a specific tab
- **Parameters**: `{ tabId: number }`
- **Returns**: Success status
- **Usage**: `{ tool: "close_tab", args: { tabId: 123 } }`

### Tab Group Management

#### `organize_tabs`
- **Description**: Use AI to automatically group tabs by topic/purpose
- **Returns**: Success status
- **Usage**: `{ tool: "organize_tabs" }`

#### `ungroup_tabs`
- **Description**: Remove all tab groups in the current window
- **Returns**: Success status and number of groups ungrouped
- **Usage**: `{ tool: "ungroup_tabs" }`

#### `get_all_tab_groups`
- **Description**: Get all tab groups across all windows
- **Returns**: Array of `TabGroup` objects
- **Usage**: `{ tool: "get_all_tab_groups" }`

#### `create_tab_group`
- **Description**: Create a new tab group with specified tabs
- **Parameters**: `{ tabIds: number[], title?: string, color?: string }`
- **Returns**: Success status and group ID
- **Usage**: `{ tool: "create_tab_group", args: { tabIds: [123, 124], title: "Work", color: "green" } }`

#### `update_tab_group`
- **Description**: Update tab group properties
- **Parameters**: `{ groupId: number, updates: { title?: string, color?: string, collapsed?: boolean } }`
- **Returns**: Success status
- **Usage**: `{ tool: "update_tab_group", args: { groupId: 456, updates: { title: "New Title", collapsed: true } } }`

### Bookmark Management

#### `get_all_bookmarks`
- **Description**: Get all bookmarks in a flattened list
- **Returns**: Array of `SimplifiedBookmark` objects
- **Usage**: `{ tool: "get_all_bookmarks" }`

#### `get_bookmark_folders`
- **Description**: Get bookmark folder structure
- **Returns**: Array of `SimplifiedBookmark` objects representing folders
- **Usage**: `{ tool: "get_bookmark_folders" }`

#### `create_bookmark`
- **Description**: Create a new bookmark
- **Parameters**: `{ title: string, url: string, parentId?: string }`
- **Returns**: Success status and bookmark ID
- **Usage**: `{ tool: "create_bookmark", args: { title: "Example", url: "https://example.com", parentId: "1" } }`

#### `delete_bookmark`
- **Description**: Delete a bookmark by ID
- **Parameters**: `{ bookmarkId: string }`
- **Returns**: Success status
- **Usage**: `{ tool: "delete_bookmark", args: { bookmarkId: "123" } }`

#### `search_bookmarks`
- **Description**: Search bookmarks by title or URL
- **Parameters**: `{ query: string }`
- **Returns**: Array of matching `SimplifiedBookmark` objects
- **Usage**: `{ tool: "search_bookmarks", args: { query: "github" } }`

### History Management

#### `get_recent_history`
- **Description**: Get recent browsing history (last 7 days by default)
- **Parameters**: `{ limit?: number }` (default: 50)
- **Returns**: Array of `HistoryItem` objects
- **Usage**: `{ tool: "get_recent_history", args: { limit: 100 } }`

#### `search_history`
- **Description**: Search browsing history
- **Parameters**: `{ query: string, limit?: number }` (default limit: 50)
- **Returns**: Array of matching `HistoryItem` objects
- **Usage**: `{ tool: "search_history", args: { query: "stackoverflow", limit: 20 } }`

#### `delete_history_item`
- **Description**: Delete a specific history item by URL
- **Parameters**: `{ url: string }`
- **Returns**: Success status
- **Usage**: `{ tool: "delete_history_item", args: { url: "https://example.com" } }`

#### `clear_history`
- **Description**: Clear browsing history for specified number of days
- **Parameters**: `{ days?: number }` (default: 1)
- **Returns**: Success status
- **Usage**: `{ tool: "clear_history", args: { days: 7 } }`

### Window Management

#### `get_all_windows`
- **Description**: Get all browser windows
- **Returns**: Array of `SimplifiedWindow` objects
- **Usage**: `{ tool: "get_all_windows" }`

#### `get_current_window`
- **Description**: Get the currently focused window
- **Returns**: `SimplifiedWindow` object
- **Usage**: `{ tool: "get_current_window" }`

#### `switch_to_window`
- **Description**: Switch focus to a specific window
- **Parameters**: `{ windowId: number }`
- **Returns**: Success status
- **Usage**: `{ tool: "switch_to_window", args: { windowId: 123 } }`

#### `create_new_window`
- **Description**: Create a new browser window
- **Parameters**: `{ url?: string }`
- **Returns**: Success status and window ID
- **Usage**: `{ tool: "create_new_window", args: { url: "https://example.com" } }`

#### `close_window`
- **Description**: Close a specific window
- **Parameters**: `{ windowId: number }`
- **Returns**: Success status
- **Usage**: `{ tool: "close_window", args: { windowId: 123 } }`

#### `minimize_window`
- **Description**: Minimize a specific window
- **Parameters**: `{ windowId: number }`
- **Returns**: Success status
- **Usage**: `{ tool: "minimize_window", args: { windowId: 123 } }`

#### `maximize_window`
- **Description**: Maximize a specific window
- **Parameters**: `{ windowId: number }`
- **Returns**: Success status
- **Usage**: `{ tool: "maximize_window", args: { windowId: 123 } }`

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

## Response Format

All MCP tools return responses in the following format:

```typescript
{
  success: boolean
  data?: any
  error?: string
}
```

## Error Handling

All functions include comprehensive error handling and return meaningful error messages when operations fail. Common error scenarios include:

- Invalid IDs (tab, window, bookmark, etc.)
- Missing required parameters
- Permission denied
- Network errors
- Chrome API errors

## Usage Examples

### Basic Tab Management
```javascript
// Get all tabs
const response = await callMcpTool({ tool: "get_all_tabs" })

// Switch to a specific tab
const response = await callMcpTool({ 
  tool: "switch_to_tab", 
  args: { tabId: 123 } 
})
```

### Bookmark Operations
```javascript
// Create a bookmark
const response = await callMcpTool({
  tool: "create_bookmark",
  args: {
    title: "GitHub",
    url: "https://github.com",
    parentId: "1" // Bookmarks bar
  }
})

// Search bookmarks
const response = await callMcpTool({
  tool: "search_bookmarks",
  args: { query: "documentation" }
})
```

### Window Management
```javascript
// Create new window
const response = await callMcpTool({
  tool: "create_new_window",
  args: { url: "https://example.com" }
})

// Switch between windows
const response = await callMcpTool({
  tool: "switch_to_window",
  args: { windowId: 456 }
})
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

## Integration with AI

The MCP servers are designed to work seamlessly with AI assistants, providing natural language interfaces for browser automation. The AI can use these tools to:

- Organize and manage tabs intelligently
- Search and manage bookmarks
- Navigate browsing history
- Control window layouts
- Automate repetitive browser tasks

All functions are optimized for AI interaction with clear, consistent interfaces and comprehensive error handling.
