import { callMcpTool } from "./index.js"

// Simple MCP-style client that provides tool descriptions and handles tool calls
export class BrowserMcpClient {
  tools = [
    // Tab Management
    {
      name: "get_all_tabs",
      description: "Get all open tabs across all windows with their IDs, titles, and URLs",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "get_current_tab",
      description: "Get information about the currently active tab",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "switch_to_tab",
      description: "Switch to a specific tab by ID",
      inputSchema: {
        type: "object",
        properties: {
          tabId: {
            type: "number",
            description: "The ID of the tab to switch to"
          }
        },
        required: ["tabId"]
      }
    },
    {
      name: "create_new_tab",
      description: "Create a new tab with the specified URL",
      inputSchema: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "The URL to open in the new tab"
          }
        },
        required: ["url"]
      }
    },
    {
      name: "get_tab_info",
      description: "Get detailed information about a specific tab",
      inputSchema: {
        type: "object",
        properties: {
          tabId: {
            type: "number",
            description: "The ID of the tab"
          }
        },
        required: ["tabId"]
      }
    },
    {
      name: "duplicate_tab",
      description: "Duplicate an existing tab",
      inputSchema: {
        type: "object",
        properties: {
          tabId: {
            type: "number",
            description: "The ID of the tab to duplicate"
          }
        },
        required: ["tabId"]
      }
    },
    {
      name: "close_tab",
      description: "Close a specific tab",
      inputSchema: {
        type: "object",
        properties: {
          tabId: {
            type: "number",
            description: "The ID of the tab to close"
          }
        },
        required: ["tabId"]
      }
    },
    {
      name: "get_current_tab_content",
      description: "Get the visible text content of the current tab",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },

    // Tab Groups
    {
      name: "organize_tabs",
      description: "Use AI to automatically group tabs by topic/purpose",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "ungroup_tabs",
      description: "Remove all tab groups in the current window",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "get_all_tab_groups",
      description: "Get all tab groups across all windows",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "create_tab_group",
      description: "Create a new tab group with specified tabs",
      inputSchema: {
        type: "object",
        properties: {
          tabIds: {
            type: "array",
            items: { type: "number" },
            description: "Array of tab IDs to group"
          },
          title: {
            type: "string",
            description: "Title for the tab group"
          },
          color: {
            type: "string",
            description: "Color for the tab group"
          }
        },
        required: ["tabIds"]
      }
    },
    {
      name: "update_tab_group",
      description: "Update tab group properties",
      inputSchema: {
        type: "object",
        properties: {
          groupId: {
            type: "number",
            description: "The ID of the tab group"
          },
          updates: {
            type: "object",
            properties: {
              title: { type: "string" },
              color: { type: "string" },
              collapsed: { type: "boolean" }
            }
          }
        },
        required: ["groupId", "updates"]
      }
    },

    // Bookmarks
    {
      name: "get_all_bookmarks",
      description: "Get all bookmarks in a flattened list",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "get_bookmark_folders",
      description: "Get bookmark folder structure",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "create_bookmark",
      description: "Create a new bookmark",
      inputSchema: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Title of the bookmark"
          },
          url: {
            type: "string",
            description: "URL of the bookmark"
          },
          parentId: {
            type: "string",
            description: "Parent folder ID (optional)"
          }
        },
        required: ["title", "url"]
      }
    },
    {
      name: "delete_bookmark",
      description: "Delete a bookmark by ID",
      inputSchema: {
        type: "object",
        properties: {
          bookmarkId: {
            type: "string",
            description: "The ID of the bookmark to delete"
          }
        },
        required: ["bookmarkId"]
      }
    },
    {
      name: "search_bookmarks",
      description: "Search bookmarks by title/URL",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query"
          }
        },
        required: ["query"]
      }
    },

    // History
    {
      name: "get_recent_history",
      description: "Get recent browsing history",
      inputSchema: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Maximum number of history items to return"
          }
        }
      }
    },
    {
      name: "search_history",
      description: "Search browsing history",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query"
          },
          limit: {
            type: "number",
            description: "Maximum number of results"
          }
        },
        required: ["query"]
      }
    },
    {
      name: "delete_history_item",
      description: "Delete a specific history item by URL",
      inputSchema: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "URL of the history item to delete"
          }
        },
        required: ["url"]
      }
    },
    {
      name: "clear_history",
      description: "Clear browsing history for specified days",
      inputSchema: {
        type: "object",
        properties: {
          days: {
            type: "number",
            description: "Number of days of history to clear"
          }
        }
      }
    },

    // Windows
    {
      name: "get_all_windows",
      description: "Get all browser windows",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "get_current_window",
      description: "Get the current focused window",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "switch_to_window",
      description: "Switch focus to a specific window",
      inputSchema: {
        type: "object",
        properties: {
          windowId: {
            type: "number",
            description: "The ID of the window to switch to"
          }
        },
        required: ["windowId"]
      }
    },
    {
      name: "create_new_window",
      description: "Create a new browser window",
      inputSchema: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "URL to open in the new window"
          }
        }
      }
    },
    {
      name: "close_window",
      description: "Close a specific window",
      inputSchema: {
        type: "object",
        properties: {
          windowId: {
            type: "number",
            description: "The ID of the window to close"
          }
        },
        required: ["windowId"]
      }
    },
    {
      name: "minimize_window",
      description: "Minimize a specific window",
      inputSchema: {
        type: "object",
        properties: {
          windowId: {
            type: "number",
            description: "The ID of the window to minimize"
          }
        },
        required: ["windowId"]
      }
    },
    {
      name: "maximize_window",
      description: "Maximize a specific window",
      inputSchema: {
        type: "object",
        properties: {
          windowId: {
            type: "number",
            description: "The ID of the window to maximize"
          }
        },
        required: ["windowId"]
      }
    },

    // Page Content
    {
      name: "get_page_metadata",
      description: "Get page metadata including title, description, keywords, etc.",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "extract_page_text",
      description: "Extract text content from the current page with word count and reading time",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "get_page_links",
      description: "Get all links from the current page",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "get_page_images",
      description: "Get all images from the current page",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "search_page_text",
      description: "Search for text on the current page",
      inputSchema: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Text to search for"
          }
        },
        required: ["query"]
      }
    },
    {
      name: "get_interactive_elements",
      description: "Get all interactive elements (links, buttons, inputs) from the current page with their selectors and properties",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "click_element",
      description: "Click an element on the current page using its CSS selector",
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector of the element to click (e.g., 'a[href*=\"google\"]', '.button', '#submit')"
          }
        },
        required: ["selector"]
      }
    },
    {
      name: "summarize_page",
      description: "Summarize the current page content with key points and reading statistics",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "fill_input",
      description: "Fill an input field with text using CSS selector",
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector of the input field to fill (e.g., 'input[name=\"username\"]', '#email', '.search-input')"
          },
          text: {
            type: "string",
            description: "Text to fill in the input field"
          }
        },
        required: ["selector", "text"]
      }
    },
    {
      name: "clear_input",
      description: "Clear the content of an input field using CSS selector",
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector of the input field to clear (e.g., 'input[name=\"username\"]', '#email', '.search-input')"
          }
        },
        required: ["selector"]
      }
    },
    {
      name: "get_input_value",
      description: "Get the current value of an input field using CSS selector",
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector of the input field to get value from (e.g., 'input[name=\"username\"]', '#email', '.search-input')"
          }
        },
        required: ["selector"]
      }
    },
    {
      name: "submit_form",
      description: "Submit a form using CSS selector",
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector of the form to submit (e.g., 'form', '#login-form', '.contact-form')"
          }
        },
        required: ["selector"]
      }
    },
    {
      name: "get_form_elements",
      description: "Get all form elements and their input fields on the current page",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "scroll_to_element",
      description: "Scroll to a DOM element and center it in the viewport",
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector of the element to scroll to (e.g., '#my-element', '.content', 'h2')"
          }
        },
        required: ["selector"]
      }
    },
    {
      name: "highlight_element",
      description: "Permanently highlight DOM elements with intelligent auto-color detection for maximum contrast, featuring stunning visual effects including overlay borders, virtual mouse arrows, spotlights and other advanced styles",
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector of the element to highlight (e.g., '#my-element', '.content', 'h2')"
          },
          color: {
            type: "string",
            description: "Highlight color (e.g., '#00d4ff', '#ff0066', '#00ff88'). If not specified, automatically selects the highest contrast color based on element's background and text colors for optimal visibility"
          },
          duration: {
            type: "number",
            description: "Duration in milliseconds to show highlight. Default: 0 (permanent highlight)"
          },
          style: {
            type: "string",
            enum: ["glow", "pulse", "shine", "bounce", "outline", "background", "border", "shadow", "gradient", "neon", "overlay", "cursor", "spotlight", "frame", "pointer"],
            description: "Highlight style: 'glow' (glowing effect, default), 'pulse' (pulsing animation), 'shine' (shining sweep), 'bounce' (bouncing animation), 'outline' (outline border), 'background' (background color), 'border' (solid border), 'shadow' (drop shadow), 'gradient' (animated gradient), 'neon' (neon light effect), 'overlay' (overlay border), 'cursor' (virtual mouse arrow), 'spotlight' (spotlight effect), 'frame' (colored frame), 'pointer' (pointing arrow)"
          },
          intensity: {
            type: "string",
            enum: ["subtle", "normal", "strong"],
            description: "Effect intensity: 'subtle' (gentle), 'normal' (default), 'strong' (dramatic)"
          },
          animation: {
            type: "boolean",
            description: "Whether to enable animations. Default: true"
          },
          persist: {
            type: "boolean",
            description: "Whether to keep the highlight permanently. Default: true (permanent highlight)"
          },
          customCSS: {
            type: "string",
            description: "Custom CSS styles to apply instead of predefined styles"
          }
        },
        required: ["selector"]
      }
    },
    {
      name: "highlight_text_inline",
      description: "Highlight specific words or phrases within text content using inline styling (bold + red color)",
      inputSchema: {
        type: "object",
        properties: {
          selector: {
            type: "string",
            description: "CSS selector of the element(s) containing the text to search (e.g., 'p', '.content', 'article')"
          },
          searchText: {
            type: "string",
            description: "The text or phrase to highlight within the selected elements"
          },
          caseSensitive: {
            type: "boolean",
            description: "Whether the search should be case sensitive. Default: false"
          },
          wholeWords: {
            type: "boolean",
            description: "Whether to match whole words only. Default: false"
          },
          highlightColor: {
            type: "string",
            description: "Color for the highlighted text. Default: '#DC143C' (crimson red)"
          },
          backgroundColor: {
            type: "string",
            description: "Background color for the highlighted text. Default: 'transparent'"
          },
          fontWeight: {
            type: "string",
            description: "Font weight for the highlighted text. Default: 'bold'"
          },
          persist: {
            type: "boolean",
            description: "Whether to keep the highlights permanently. Default: true"
          }
        },
        required: ["selector", "searchText"]
      }
    },

    // Clipboard
    {
      name: "copy_to_clipboard",
      description: "Copy text to clipboard",
      inputSchema: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "Text to copy to clipboard"
          }
        },
        required: ["text"]
      }
    },
    {
      name: "read_from_clipboard",
      description: "Read text from clipboard",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "copy_current_page_url",
      description: "Copy current page URL to clipboard",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "copy_current_page_title",
      description: "Copy current page title to clipboard",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "copy_selected_text",
      description: "Copy selected text from current page",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "copy_page_as_markdown",
      description: "Copy page content as markdown format",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "copy_page_as_text",
      description: "Copy page content as plain text",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },

    // Storage
    {
      name: "get_storage_value",
      description: "Get a value from storage",
      inputSchema: {
        type: "object",
        properties: {
          key: {
            type: "string",
            description: "Storage key"
          }
        },
        required: ["key"]
      }
    },
    {
      name: "set_storage_value",
      description: "Set a value in storage",
      inputSchema: {
        type: "object",
        properties: {
          key: {
            type: "string",
            description: "Storage key"
          },
          value: {
            type: "string",
            description: "Value to store"
          }
        },
        required: ["key", "value"]
      }
    },
    {
      name: "get_extension_settings",
      description: "Get extension settings",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "get_ai_config",
      description: "Get AI configuration",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },

    // Utils
    {
      name: "get_browser_info",
      description: "Get browser information",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "get_system_info",
      description: "Get system information",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "get_current_datetime",
      description: "Get current date and time",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "validate_url",
      description: "Validate if a URL is properly formatted",
      inputSchema: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "URL to validate"
          }
        },
        required: ["url"]
      }
    },
    {
      name: "extract_domain",
      description: "Extract domain from URL",
      inputSchema: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "URL to extract domain from"
          }
        },
        required: ["url"]
      }
    },
    {
      name: "get_text_stats",
      description: "Get text statistics including word count, reading time, etc.",
      inputSchema: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "Text to analyze"
          }
        },
        required: ["text"]
      }
    },
    {
      name: "check_permissions",
      description: "Check if all required permissions are available for the extension",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },

    // Extensions
    {
      name: "get_all_extensions",
      description: "Get all installed extensions with their details",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "get_extension",
      description: "Get extension details by ID",
      inputSchema: {
        type: "object",
        properties: {
          extensionId: {
            type: "string",
            description: "The ID of the extension"
          }
        },
        required: ["extensionId"]
      }
    },
    {
      name: "set_extension_enabled",
      description: "Enable or disable an extension",
      inputSchema: {
        type: "object",
        properties: {
          extensionId: {
            type: "string",
            description: "The ID of the extension"
          },
          enabled: {
            type: "boolean",
            description: "Whether to enable or disable the extension"
          }
        },
        required: ["extensionId", "enabled"]
      }
    },
    {
      name: "uninstall_extension",
      description: "Uninstall an extension",
      inputSchema: {
        type: "object",
        properties: {
          extensionId: {
            type: "string",
            description: "The ID of the extension to uninstall"
          }
        },
        required: ["extensionId"]
      }
    },
    {
      name: "get_extension_permissions",
      description: "Get extension permissions",
      inputSchema: {
        type: "object",
        properties: {
          extensionId: {
            type: "string",
            description: "The ID of the extension"
          }
        },
        required: ["extensionId"]
      }
    },

    // Downloads
    {
      name: "get_all_downloads",
      description: "Get all downloads with their status and progress",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "get_download",
      description: "Get download details by ID",
      inputSchema: {
        type: "object",
        properties: {
          downloadId: {
            type: "number",
            description: "The ID of the download"
          }
        },
        required: ["downloadId"]
      }
    },
    {
      name: "pause_download",
      description: "Pause a download",
      inputSchema: {
        type: "object",
        properties: {
          downloadId: {
            type: "number",
            description: "The ID of the download to pause"
          }
        },
        required: ["downloadId"]
      }
    },
    {
      name: "resume_download",
      description: "Resume a paused download",
      inputSchema: {
        type: "object",
        properties: {
          downloadId: {
            type: "number",
            description: "The ID of the download to resume"
          }
        },
        required: ["downloadId"]
      }
    },
    {
      name: "cancel_download",
      description: "Cancel a download",
      inputSchema: {
        type: "object",
        properties: {
          downloadId: {
            type: "number",
            description: "The ID of the download to cancel"
          }
        },
        required: ["downloadId"]
      }
    },
    {
      name: "remove_download",
      description: "Remove a download from history",
      inputSchema: {
        type: "object",
        properties: {
          downloadId: {
            type: "number",
            description: "The ID of the download to remove"
          }
        },
        required: ["downloadId"]
      }
    },
    {
      name: "open_download",
      description: "Open a downloaded file",
      inputSchema: {
        type: "object",
        properties: {
          downloadId: {
            type: "number",
            description: "The ID of the download to open"
          }
        },
        required: ["downloadId"]
      }
    },
    {
      name: "show_download_in_folder",
      description: "Show a download in its folder",
      inputSchema: {
        type: "object",
        properties: {
          downloadId: {
            type: "number",
            description: "The ID of the download"
          }
        },
        required: ["downloadId"]
      }
    },
    {
      name: "get_download_stats",
      description: "Get download statistics",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "download_text_as_markdown",
      description: "Download text content as a markdown file to the user's local filesystem",
      inputSchema: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "The text content to download as markdown"
          },
          filename: {
            type: "string",
            description: "Optional filename for the download (without .md extension). If not provided, a timestamped filename will be generated"
          }
        },
        required: ["text"]
      }
    },

    // Sessions
    {
      name: "get_all_sessions",
      description: "Get all recently closed sessions",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "get_session",
      description: "Get session details by ID",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "The ID of the session"
          }
        },
        required: ["sessionId"]
      }
    },
    {
      name: "restore_session",
      description: "Restore a closed session",
      inputSchema: {
        type: "object",
        properties: {
          sessionId: {
            type: "string",
            description: "The ID of the session to restore"
          }
        },
        required: ["sessionId"]
      }
    },
    {
      name: "get_current_device",
      description: "Get current device information",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "get_all_devices",
      description: "Get all devices information",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },

    // Context Menus
    {
      name: "create_context_menu_item",
      description: "Create a new context menu item",
      inputSchema: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "Unique ID for the menu item"
          },
          title: {
            type: "string",
            description: "Title of the menu item"
          },
          contexts: {
            type: "array",
            items: { type: "string" },
            description: "Contexts where the menu item should appear"
          },
          documentUrlPatterns: {
            type: "array",
            items: { type: "string" },
            description: "URL patterns where the menu item should appear"
          }
        },
        required: ["id", "title"]
      }
    },
    {
      name: "update_context_menu_item",
      description: "Update an existing context menu item",
      inputSchema: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "ID of the menu item to update"
          },
          updates: {
            type: "object",
            properties: {
              title: { type: "string" },
              contexts: { type: "array", items: { type: "string" } },
              documentUrlPatterns: { type: "array", items: { type: "string" } }
            }
          }
        },
        required: ["id", "updates"]
      }
    },
    {
      name: "remove_context_menu_item",
      description: "Remove a context menu item",
      inputSchema: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "ID of the menu item to remove"
          }
        },
        required: ["id"]
      }
    },
    {
      name: "remove_all_context_menu_items",
      description: "Remove all context menu items",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "get_context_menu_items",
      description: "Get all context menu items (limited by Chrome API)",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    // Screenshot tools
    {
      name: "capture_screenshot",
      description: "Capture screenshot of current visible tab and return as base64 data URL",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "capture_tab_screenshot",
      description: "Capture screenshot of a specific tab by ID",
      inputSchema: {
        type: "object",
        properties: {
          tabId: {
            type: "number",
            description: "The ID of the tab to capture"
          }
        },
        required: ["tabId"]
      }
    },
    {
      name: "capture_screenshot_to_clipboard",
      description: "Capture screenshot of current tab and save directly to clipboard",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "read_clipboard_image",
      description: "Read image from clipboard and return as base64 data URL for display",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    },
    {
      name: "get_clipboard_image_info",
      description: "Check if clipboard contains an image and get basic info without reading full data",
      inputSchema: {
        type: "object",
        properties: {},
        required: []
      }
    }
  ]

  async listTools() {
    return { tools: this.tools }
  }

  async callTool(name: string, args: any) {
    return await callMcpTool({ tool: name as any, args })
  }

  getToolDescriptions() {
    return this.tools.map(tool => ({
      name: tool.name,
      description: tool.description
    }))
  }
}

export const browserMcpClient = new BrowserMcpClient()
