/**
 * Static MCP tool schemas for the bridge.
 *
 * These mirror the definitions in src/mcp/tools/unified-tool-definitions.ts
 * but are expressed as plain JSON Schema so the bridge has zero dependency
 * on the extension runtime (no Zod, no Chrome APIs).
 *
 * When tools are added/removed in the extension, update this file accordingly.
 */

export interface ToolSchema {
  name: string
  description: string
  inputSchema: {
    type: "object"
    properties: Record<string, unknown>
    required?: string[]
  }
}

export const toolSchemas: ToolSchema[] = [
  // ===== Browser Tools =====
  {
    name: "get_all_tabs",
    description:
      "Get all open tabs across all windows with their IDs, titles, and URLs",
    inputSchema: { type: "object", properties: {}, required: [] }
  },
  {
    name: "get_current_tab",
    description: "Get information about the currently active tab",
    inputSchema: { type: "object", properties: {}, required: [] }
  },
  {
    name: "switch_to_tab",
    description: "Switch to a specific tab by ID",
    inputSchema: {
      type: "object",
      properties: {
        tabId: { type: "number", description: "The ID of the tab to switch to" }
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
        url: { type: "string", description: "The URL to open in the new tab" }
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
        tabId: { type: "number", description: "The ID of the tab" }
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
        tabId: { type: "number", description: "The ID of the tab to close" }
      },
      required: ["tabId"]
    }
  },
  {
    name: "organize_tabs",
    description: "Use AI to automatically group tabs by topic/purpose",
    inputSchema: { type: "object", properties: {}, required: [] }
  },
  {
    name: "ungroup_tabs",
    description: "Remove all tab groups in the current window",
    inputSchema: { type: "object", properties: {}, required: [] }
  },

  // ===== UI Tools =====
  {
    name: "search_elements",
    description: `[FAST - USE FIRST] Search for elements in the current page using glob/grep patterns against the DOM snapshot. Returns matching elements with their UIDs for direct UID-based interaction.

GLOB SYNTAX:
- * matches any characters (e.g. button* finds all buttons)
- ? matches exactly one character
- [abc] matches any of those characters
- {a,b,c} matches any of those alternatives (e.g. {button,input}* finds all buttons and inputs)
- Patterns are case-sensitive by default; use [Ll] to match both cases

STARTER QUERIES:
- Broad scan:      {button,link,input,StaticText}*
- All interactive: {button,input,textarea,select,a}*
- Login/auth:      *[Ll]ogin*, *[Ss]ign*
- Submit/save:     *[Ss]ubmit*, *[Ss]ave*, *[Cc]onfirm*
- Search boxes:    *[Ss]earch*, {input,textarea}*
- Navigation:      {nav,link,a}*

WORKFLOW:
1. Call search_elements with a broad pattern to discover elements
2. Elements in the result have uid= attributes (e.g. uid=btn-42)
3. Pass that UID to click(tabId, uid) or fill_element_by_uid(tabId, uid, value)
4. If 0 results after 2 different patterns, fall back to capture_screenshot(sendToLLM=true)

This is the PREFERRED first step — much faster and cheaper than screenshots.`,
    inputSchema: {
      type: "object",
      properties: {
        tabId: {
          type: "number",
          description: "The ID of the tab to search the elements in"
        },
        query: {
          type: "string",
          description: "Search query string with grep/glob pattern support"
        },
        contextLevels: {
          type: "number",
          description: "Number of context lines to include"
        }
      },
      required: ["tabId", "query"]
    }
  },
  {
    name: "click",
    description: "Click an element using its unique UID from a snapshot",
    inputSchema: {
      type: "object",
      properties: {
        tabId: { type: "number", description: "The ID of the tab to click on" },
        uid: {
          type: "string",
          description:
            "The unique identifier of an element from the page snapshot"
        },
        dblClick: {
          type: "boolean",
          description: "Set to true for double clicks"
        }
      },
      required: ["tabId", "uid"]
    }
  },
  {
    name: "fill_element_by_uid",
    description: "Fill an input element using its unique UID from a snapshot",
    inputSchema: {
      type: "object",
      properties: {
        tabId: {
          type: "number",
          description: "The ID of the tab to fill the element in"
        },
        uid: {
          type: "string",
          description: "The unique identifier of the element to fill"
        },
        value: {
          type: "string",
          description: "The value to fill into the element"
        }
      },
      required: ["tabId", "uid", "value"]
    }
  },
  {
    name: "get_editor_value",
    description:
      "Get the complete content from a code editor (Monaco, CodeMirror, ACE) or textarea without truncation. Use this before filling to avoid data loss.",
    inputSchema: {
      type: "object",
      properties: {
        tabId: { type: "number", description: "The ID of the tab" },
        uid: {
          type: "string",
          description:
            "The unique identifier of the editor element from snapshot"
        }
      },
      required: ["tabId", "uid"]
    }
  },
  {
    name: "fill_form",
    description:
      "Fill multiple form elements at once using their UIDs from a snapshot",
    inputSchema: {
      type: "object",
      properties: {
        tabId: {
          type: "number",
          description: "The ID of the tab to fill the elements in"
        },
        elements: {
          type: "array",
          description: "Array of elements to fill with their UIDs and values"
        }
      },
      required: ["tabId", "elements"]
    }
  },
  {
    name: "hover_element_by_uid",
    description: "Hover over an element using its unique UID from a snapshot",
    inputSchema: {
      type: "object",
      properties: {
        tabId: {
          type: "number",
          description: "The ID of the tab to hover over"
        },
        uid: {
          type: "string",
          description: "The unique identifier of the element to hover over"
        }
      },
      required: ["tabId", "uid"]
    }
  },
  {
    name: "upload_file_to_input",
    description: `Upload a pre-attached file to a file input element (<input type="file">) on the page.

PREREQUISITES:
- The user must have already attached a file using the attachment button in the AIPex sidebar BEFORE sending the message
- The file content is NEVER sent to the AI (privacy guaranteed)

WORKFLOW:
1. Call this tool with just the tabId — the tool automatically finds the file input (including hidden ones)
2. If the page has multiple file inputs, use input_index to select which one (0 = first)
3. Optionally provide uid from a snapshot if you know the exact element

NOTE: Most websites hide the actual <input type="file"> behind a styled button. This tool handles both visible and hidden file inputs automatically — no need to find the element UID first.

AFTER UPLOAD: take a screenshot to verify the file was accepted, then proceed to submit the form.`,
    inputSchema: {
      type: "object",
      properties: {
        tabId: {
          type: "number",
          description: "The ID of the tab containing the file input element"
        },
        uid: {
          type: "string",
          description:
            "UID of the <input type='file'> element from the page snapshot. OPTIONAL — if omitted or the element is hidden, the tool automatically finds the file input by CSS selector."
        },
        input_index: {
          type: "number",
          description:
            "0-based index to select which file input to target when the page has multiple. Defaults to 0. Only used when uid is not provided or not found."
        },
        file_id: {
          type: "string",
          description:
            "ID of the specific attached file to use (the 'ref' value from the [Attached file...] message). Omit to use the most recently attached file."
        },
        file_path: {
          type: "string",
          description:
            "Absolute local file path to upload directly (e.g. '/Users/me/resume.pdf'). Uses CDP DOM.setFileInputFiles — no file content is read into memory. Takes priority over file_id and pre-attached files when provided."
        }
      },
      required: ["tabId"]
    }
  },
  {
    name: "computer",
    description: `[HIGH-COST FALLBACK] Coordinate-based mouse/keyboard interaction using screenshot pixels.

PREFER UID-BASED TOOLS FIRST: For clicking buttons, filling forms, or hovering elements, use search_elements to get UIDs, then use click/fill_element_by_uid/hover_element_by_uid. These are faster and more reliable.

USE THIS TOOL ONLY WHEN:
- search_elements returned 0 matches after trying 2 different query patterns
- UID-based actions failed twice (element not interactable)
- The goal requires visual/pixel-level interaction: canvas apps, drag-and-drop, sliders, charts, hover-only menus

PREREQUISITE: If you choose coordinate actions, you MUST first call capture_screenshot(sendToLLM=true). Coordinates are in screenshot pixel space.

* Click element centers, not edges. Adjust if clicks miss.`,
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: [
            "left_click",
            "right_click",
            "type",
            "scroll",
            "key",
            "left_click_drag",
            "double_click",
            "triple_click",
            "scroll_to",
            "hover"
          ],
          description: `The action to perform:
* \`left_click\`: Click the left mouse button at the specified coordinates.
* \`right_click\`: Click the right mouse button at the specified coordinates to open context menus.
* \`double_click\`: Double-click the left mouse button at the specified coordinates.
* \`triple_click\`: Triple-click the left mouse button at the specified coordinates.
* \`type\`: Type a string of text at the current cursor position.
* \`scroll\`: Scroll up, down, left, or right at the specified coordinates.
* \`key\`: Press a specific keyboard key or key combination.
* \`left_click_drag\`: Drag from start_coordinate to coordinate.
* \`scroll_to\`: Scroll an element into view using its element UID from snapshot.
* \`hover\`: Move the mouse cursor to the specified coordinates without clicking. Useful for revealing tooltips, dropdown menus, or triggering hover states.`
        },
        coordinate: {
          type: "array",
          description:
            "(x, y): The x (pixels from the left edge) and y (pixels from the top edge) coordinates in screenshot pixel space. Required for left_click, right_click, double_click, triple_click, scroll, and hover. For left_click_drag, this is the end position."
        },
        text: {
          type: "string",
          description:
            'The text to type (for type action) or the key(s) to press (for key action). For key action: Provide space-separated keys (e.g., "Backspace Backspace Delete"). Supports keyboard shortcuts using the platform modifier key (use "cmd" on Mac, "ctrl" on Windows/Linux, e.g., "cmd+a" for select all). Common keys: Enter, Tab, Escape, ArrowUp/Down/Left/Right, Backspace, Delete.'
        },
        start_coordinate: {
          type: "array",
          description:
            "Starting coordinates for left_click_drag action in screenshot pixel space."
        },
        scroll_direction: {
          type: "string",
          enum: ["up", "down", "left", "right"],
          description: "Direction to scroll for scroll action."
        },
        scroll_amount: {
          type: "number",
          description:
            "Number of pixels to scroll. Defaults to ~2 viewport heights for standard scrolling."
        },
        tabId: {
          type: "number",
          description:
            "The ID of the tab to operate on. Defaults to current active tab."
        },
        uid: {
          type: "string",
          description: "Element UID from snapshot for scroll_to action."
        }
      },
      required: ["action"]
    }
  },

  // ===== Page Tools =====
  {
    name: "get_page_metadata",
    description:
      "Get page metadata including title, description, keywords, etc.",
    inputSchema: { type: "object", properties: {}, required: [] }
  },
  {
    name: "scroll_to_element",
    description: "Scroll to a DOM element and center it in the viewport",
    inputSchema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: "CSS selector of the element to scroll to"
        }
      },
      required: ["selector"]
    }
  },
  {
    name: "highlight_element",
    description: "Permanently highlight DOM elements with drop shadow effect",
    inputSchema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: "CSS selector of the element to highlight"
        },
        color: {
          type: "string",
          description: "Shadow color (e.g., '#00d4ff')"
        },
        duration: {
          type: "number",
          description: "Duration in milliseconds (0 = permanent)"
        },
        intensity: {
          type: "string",
          enum: ["subtle", "normal", "strong"]
        },
        persist: {
          type: "boolean",
          description: "Whether to keep the highlight permanently"
        }
      },
      required: ["selector"]
    }
  },
  {
    name: "highlight_text_inline",
    description:
      "Highlight specific words or phrases within text content using inline styling",
    inputSchema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description:
            "CSS selector of the element(s) containing the text to search"
        },
        searchText: {
          type: "string",
          description: "The text or phrase to highlight"
        },
        caseSensitive: { type: "boolean" },
        wholeWords: { type: "boolean" },
        highlightColor: { type: "string" },
        backgroundColor: { type: "string" },
        fontWeight: { type: "string" },
        persist: { type: "boolean" }
      },
      required: ["selector", "searchText"]
    }
  },

  // ===== Screenshot Tools =====
  {
    name: "capture_screenshot",
    description: `[HIGH-COST FALLBACK] Capture screenshot of current visible tab.

TRY search_elements FIRST: For most interactions (clicking, filling, reading), use search_elements + UID-based tools. They are faster and don't send images to LLM.

USE THIS ONLY WHEN:
- search_elements cannot find the target after 2 query attempts
- You need to see visual layout, images, charts, or canvas content
- The page uses non-standard rendering that snapshots miss

When sendToLLM=true: Sends image to LLM (higher latency/cost, may capture sensitive on-screen data) and enables the computer tool for coordinate-based actions.`,
    inputSchema: {
      type: "object",
      properties: {
        sendToLLM: {
          type: "boolean",
          description:
            "Whether to send the screenshot to LLM for visual analysis. When true, enables computer tool for coordinate actions. Use sparingly - adds latency and token cost."
        }
      },
      required: []
    }
  },
  {
    name: "capture_tab_screenshot",
    description: `[HIGH-COST FALLBACK] Capture screenshot of a specific tab by ID.

TRY search_elements FIRST: For most interactions, use search_elements + UID-based tools instead.

USE THIS ONLY WHEN: Visual verification is essential, search_elements failed, or you need to see images/charts/canvas.

When sendToLLM=true: Sends image to LLM (higher latency/cost) and enables coordinate-based actions.`,
    inputSchema: {
      type: "object",
      properties: {
        tabId: {
          type: "number",
          description: "The ID of the tab to capture"
        },
        sendToLLM: {
          type: "boolean",
          description:
            "Whether to send the screenshot to LLM for visual analysis. When true, enables computer tool. Use sparingly."
        }
      },
      required: ["tabId"]
    }
  },

  // ===== Download Tools =====
  {
    name: "download_text_as_markdown",
    description:
      "Download text content as a markdown file to the user's local filesystem",
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "The text content to download as markdown"
        },
        filename: {
          type: "string",
          description:
            "Descriptive filename for the download (without .md extension)"
        },
        folderPath: {
          type: "string",
          description: "Optional folder path for organizing downloads"
        },
        displayResults: {
          type: "boolean",
          description: "Whether to display the download results"
        }
      },
      required: ["text"]
    }
  },
  {
    name: "download_image",
    description:
      "Download an image from base64 data to the user's local filesystem",
    inputSchema: {
      type: "object",
      properties: {
        imageData: {
          type: "string",
          description: "The base64 image data URL (data:image/...)"
        },
        filename: {
          type: "string",
          description:
            "Descriptive filename for the download (without extension)"
        },
        folderPath: {
          type: "string",
          description: "Optional folder path for organizing downloads"
        }
      },
      required: ["imageData"]
    }
  },
  {
    name: "download_chat_images",
    description:
      "Download multiple images from chat messages to the user's local filesystem",
    inputSchema: {
      type: "object",
      properties: {
        messages: {
          type: "array",
          description: "Array of chat messages containing images"
        },
        folderPrefix: {
          type: "string",
          description: "Descriptive folder name for organizing downloads"
        },
        filenamingStrategy: {
          type: "string",
          enum: ["descriptive", "sequential", "timestamp"]
        },
        displayResults: {
          type: "boolean",
          description: "Whether to display the download results"
        }
      },
      required: ["messages"]
    }
  },

  // ===== Intervention Tools =====
  {
    name: "list_interventions",
    description:
      "List all available human intervention tools. Use this to discover what types of human input you can request.",
    inputSchema: {
      type: "object",
      properties: {
        enabledOnly: {
          type: "boolean",
          description: "If true, only return enabled interventions"
        }
      },
      required: []
    }
  },
  {
    name: "get_intervention_info",
    description:
      "Get detailed information about a specific intervention type, including its input/output schema and examples.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          description:
            'The type of intervention to get information about (e.g., "monitor-operation", "voice-input", "user-selection")'
        }
      },
      required: ["type"]
    }
  },
  {
    name: "request_intervention",
    description:
      "Request human intervention during task execution. This allows you to ask the user to click on an element, provide voice input, or make a selection. IMPORTANT: Only use this when absolutely necessary and when the current conversation mode allows interventions.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          description:
            'The type of intervention to request (e.g., "monitor-operation", "voice-input", "user-selection")'
        },
        params: {
          description: "Type-specific parameters for the intervention"
        },
        timeout: {
          type: "number",
          description: "Timeout in seconds (default: 300)"
        },
        reason: {
          type: "string",
          description:
            "A clear explanation to the user about why you need their input"
        }
      },
      required: ["type"]
    }
  },
  {
    name: "cancel_intervention",
    description: "Cancel the currently active intervention request.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description:
            "Optional intervention ID to cancel. If not provided, cancels the current active intervention."
        }
      },
      required: []
    }
  },

  // ===== Skill Tools =====
  {
    name: "load_skill",
    description:
      "Load the main content (SKILL.md) of a skill. Use this to understand what a skill does, its capabilities, available scripts, and how to use it.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "The name of the skill to load" }
      },
      required: ["name"]
    }
  },
  {
    name: "execute_skill_script",
    description:
      "Execute a script that belongs to a skill. Scripts are located in the scripts/ directory of the skill package and can perform various operations.",
    inputSchema: {
      type: "object",
      properties: {
        skillName: { type: "string", description: "The name of the skill" },
        scriptPath: {
          type: "string",
          description:
            'The path to the script file (e.g., "scripts/init_skill.js"), MUST start with "scripts/"'
        },
        args: { description: "Arguments to pass to the script" }
      },
      required: ["skillName", "scriptPath"]
    }
  },
  {
    name: "read_skill_reference",
    description:
      "Read a reference document from a skill. Reference files are located in the references/ directory and contain additional documentation, guides, or examples.",
    inputSchema: {
      type: "object",
      properties: {
        skillName: { type: "string", description: "The name of the skill" },
        refPath: {
          type: "string",
          description:
            'The path to the reference file (e.g., "references/guide.md"), MUST start with "references/"'
        }
      },
      required: ["skillName", "refPath"]
    }
  },
  {
    name: "get_skill_asset",
    description:
      "Get an asset file from a skill. Assets are located in the assets/ directory and can be images, data files, or other resources.",
    inputSchema: {
      type: "object",
      properties: {
        skillName: { type: "string", description: "The name of the skill" },
        assetPath: {
          type: "string",
          description:
            'The path to the asset file (e.g., "assets/icon.png"), MUST start with "assets/"'
        }
      },
      required: ["skillName", "assetPath"]
    }
  },
  {
    name: "list_skills",
    description:
      "List all available skills in the system. Shows enabled skills by default, or all skills if specified.",
    inputSchema: {
      type: "object",
      properties: {
        enabledOnly: {
          type: "boolean",
          description: "If true, only show enabled skills. Default: false"
        }
      },
      required: []
    }
  },
  {
    name: "get_skill_info",
    description:
      "Get detailed information about a specific skill, including its scripts, references, assets, and metadata.",
    inputSchema: {
      type: "object",
      properties: {
        skillName: { type: "string", description: "The name of the skill" }
      },
      required: ["skillName"]
    }
  }
]
