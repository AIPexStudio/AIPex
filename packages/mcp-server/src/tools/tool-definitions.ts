/**
 * Static MCP tool definitions for all browser-runtime tools.
 * These mirror the Zod schemas defined in @aipexstudio/browser-runtime.
 * A sync test verifies these stay in sync with the actual tool exports.
 */

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/** Names of tools whose results may contain base64 image data */
export const SCREENSHOT_TOOLS = new Set([
  "capture_screenshot",
  "capture_tab_screenshot",
  "capture_screenshot_with_highlight",
]);

export const toolDefinitions: ToolDefinition[] = [
  // =========================================================================
  // Tab Management (6 tools)
  // =========================================================================
  {
    name: "get_all_tabs",
    description:
      "Get all open tabs across all windows with their IDs, titles, and URLs",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_current_tab",
    description: "Get information about the currently active tab",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "create_new_tab",
    description: "Create a new tab with the specified URL",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          format: "uri",
          description: "The URL to open in the new tab",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "get_tab_info",
    description: "Get detailed information about a specific tab",
    inputSchema: {
      type: "object",
      properties: {
        tabId: { type: "number", description: "The ID of the tab" },
      },
      required: ["tabId"],
    },
  },
  {
    name: "close_tab",
    description: "Close a specific tab or the current tab",
    inputSchema: {
      type: "object",
      properties: {
        tabId: {
          type: ["number", "null"],
          description: "Tab ID to close (defaults to current tab)",
        },
      },
    },
  },
  {
    name: "ungroup_tabs",
    description: "Remove all tab groups in the current window",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },

  // =========================================================================
  // Element Interaction (6 tools)
  // =========================================================================
  {
    name: "search_elements",
    description:
      "Search for elements in the current page using a query string with grep/glob pattern support",
    inputSchema: {
      type: "object",
      properties: {
        tabId: {
          type: "number",
          description: "The ID of the tab to search the elements in",
        },
        query: {
          type: "string",
          description: "Search query string with grep/glob pattern support",
        },
        contextLevels: {
          type: "number",
          description: "Number of context lines to include",
          default: 1,
        },
      },
      required: ["tabId", "query"],
    },
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
            "The unique identifier of an element from the page snapshot",
        },
        dblClick: {
          type: "boolean",
          description: "Set to true for double clicks",
          default: false,
        },
      },
      required: ["tabId", "uid"],
    },
  },
  {
    name: "fill_element_by_uid",
    description: "Fill an input element using its unique UID from a snapshot",
    inputSchema: {
      type: "object",
      properties: {
        tabId: {
          type: "number",
          description: "The ID of the tab to fill the element in",
        },
        uid: {
          type: "string",
          description: "The unique identifier of the element to fill",
        },
        value: {
          type: "string",
          description: "The value to fill into the element",
        },
      },
      required: ["tabId", "uid", "value"],
    },
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
            "The unique identifier of the editor element from snapshot",
        },
      },
      required: ["tabId", "uid"],
    },
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
          description: "The ID of the tab to fill the elements in",
        },
        elements: {
          type: "array",
          items: {
            type: "object",
            properties: {
              uid: {
                type: "string",
                description: "The unique identifier of the element",
              },
              value: {
                type: "string",
                description: "The value to fill into the element",
              },
            },
            required: ["uid", "value"],
          },
          description: "Array of elements to fill with their UIDs and values",
        },
      },
      required: ["tabId", "elements"],
    },
  },
  {
    name: "hover_element_by_uid",
    description: "Hover over an element using its unique UID from a snapshot",
    inputSchema: {
      type: "object",
      properties: {
        tabId: {
          type: "number",
          description: "The ID of the tab to hover over",
        },
        uid: {
          type: "string",
          description: "The unique identifier of the element to hover over",
        },
      },
      required: ["tabId", "uid"],
    },
  },

  // =========================================================================
  // Computer Tool (1 tool)
  // =========================================================================
  {
    name: "computer",
    description: `Use mouse and keyboard to interact with a web browser based on screenshot coordinates. NOTE: This tool requires focus mode.

IMPORTANT: Before using any coordinate-based actions (click, hover, scroll, drag), you MUST first call capture_screenshot(sendToLLM=true) to take a screenshot. All coordinate values are in screenshot pixel space and will be mapped to viewport CSS pixels.`,
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: [
            "left_click",
            "right_click",
            "type",
            "wait",
            "scroll",
            "key",
            "left_click_drag",
            "double_click",
            "triple_click",
            "scroll_to",
            "hover",
          ],
          description:
            "The action to perform: left_click, right_click, double_click, triple_click, type, wait, scroll, key, left_click_drag, scroll_to, hover",
        },
        coordinate: {
          type: ["array", "null"],
          items: { type: "number" },
          minItems: 2,
          maxItems: 2,
          description:
            "(x, y): Coordinates in screenshot pixel space. Required for click, scroll, and hover actions.",
        },
        text: {
          type: ["string", "null"],
          description:
            'Text to type (for type action) or keys to press (for key action). Supports shortcuts like "cmd+a".',
        },
        start_coordinate: {
          type: ["array", "null"],
          items: { type: "number" },
          minItems: 2,
          maxItems: 2,
          description: "Starting coordinates for left_click_drag action.",
        },
        scroll_direction: {
          type: ["string", "null"],
          enum: ["up", "down", "left", "right"],
          description: "Direction to scroll for scroll action.",
        },
        scroll_amount: {
          type: ["number", "null"],
          description: "Number of pixels to scroll.",
        },
        duration: {
          type: ["number", "null"],
          description: "Duration in seconds for wait action.",
        },
        tabId: {
          type: ["number", "null"],
          description:
            "The ID of the tab to operate on. Defaults to current active tab.",
        },
        uid: {
          type: ["string", "null"],
          description: "Element UID from snapshot for scroll_to action.",
        },
      },
      required: ["action"],
    },
  },

  // =========================================================================
  // Page Content (4 tools)
  // =========================================================================
  {
    name: "get_page_metadata",
    description:
      "Get page metadata including title, description, keywords, etc.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "scroll_to_element",
    description: "Scroll to a DOM element and center it in the viewport",
    inputSchema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: "CSS selector of the element to scroll to",
        },
      },
      required: ["selector"],
    },
  },
  {
    name: "highlight_element",
    description: "Permanently highlight DOM elements with drop shadow effect",
    inputSchema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: "CSS selector of the element to highlight",
        },
        color: {
          type: ["string", "null"],
          description: "Shadow color (e.g., '#00d4ff')",
        },
        duration: {
          type: ["number", "null"],
          description: "Duration in milliseconds (0 = permanent)",
        },
        intensity: {
          type: ["string", "null"],
          enum: ["subtle", "normal", "strong"],
          description: "Highlight intensity",
        },
        persist: {
          type: ["boolean", "null"],
          description: "Whether to keep the highlight permanently",
        },
      },
      required: ["selector"],
    },
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
            "CSS selector of the element(s) containing the text to search",
        },
        searchText: {
          type: "string",
          description: "The text or phrase to highlight",
        },
        caseSensitive: {
          type: ["boolean", "null"],
          description: "Case sensitive search",
        },
        wholeWords: {
          type: ["boolean", "null"],
          description: "Match whole words only",
        },
        highlightColor: {
          type: ["string", "null"],
          description: "Text color",
        },
        backgroundColor: {
          type: ["string", "null"],
          description: "Background color",
        },
        fontWeight: {
          type: ["string", "null"],
          description: "Font weight",
        },
        persist: {
          type: ["boolean", "null"],
          description: "Whether to keep the highlight permanently",
        },
      },
      required: ["selector", "searchText"],
    },
  },

  // =========================================================================
  // Screenshot (3 tools)
  // =========================================================================
  {
    name: "capture_screenshot",
    description:
      "Capture screenshot of current visible tab and return as base64 data URL. When sendToLLM=true, the screenshot will be sent to the LLM for visual analysis AND visual coordinate tools (computer) will be unlocked for subsequent interactions. NOTE: This tool requires focus mode.",
    inputSchema: {
      type: "object",
      properties: {
        sendToLLM: {
          type: ["boolean", "null"],
          description:
            "Whether to send the screenshot to LLM for visual analysis. When true, visual coordinate tools will be enabled.",
          default: false,
        },
      },
    },
  },
  {
    name: "capture_screenshot_with_highlight",
    description:
      "Capture screenshot of the current visible tab, optionally highlighting and cropping to a specific element identified by CSS selector. NOTE: This tool requires focus mode.",
    inputSchema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: "CSS selector of element to highlight/focus on",
        },
        cropToElement: {
          type: "boolean",
          description:
            "Whether to crop the screenshot to the element region (plus padding)",
          default: false,
        },
        padding: {
          type: "number",
          minimum: 0,
          maximum: 150,
          description:
            "Padding around element in pixels when cropping (default: 50)",
          default: 50,
        },
        sendToLLM: {
          type: ["boolean", "null"],
          description:
            "Whether to send the screenshot to LLM for visual analysis. Defaults to true.",
          default: true,
        },
      },
    },
  },
  {
    name: "capture_tab_screenshot",
    description:
      "Capture screenshot of a specific tab by ID. When sendToLLM=true, the screenshot will be sent to the LLM for visual analysis AND visual coordinate tools (computer) will be unlocked for subsequent interactions. NOTE: This tool requires focus mode.",
    inputSchema: {
      type: "object",
      properties: {
        tabId: { type: "number", description: "The tab ID to capture" },
        sendToLLM: {
          type: ["boolean", "null"],
          description:
            "Whether to send the screenshot to LLM for visual analysis. When true, visual coordinate tools will be enabled.",
          default: false,
        },
      },
      required: ["tabId"],
    },
  },

  // =========================================================================
  // Downloads (2 tools)
  // =========================================================================
  {
    name: "download_image",
    description:
      "Download an image from base64 data to the user's local filesystem",
    inputSchema: {
      type: "object",
      properties: {
        imageData: {
          type: "string",
          description: "The base64 image data URL (data:image/...)",
        },
        filename: {
          type: ["string", "null"],
          description: "Optional filename (without extension)",
        },
        folderPath: {
          type: ["string", "null"],
          description: "Optional folder path",
        },
      },
      required: ["imageData"],
    },
  },
  {
    name: "download_chat_images",
    description: "Download multiple images from chat messages in batch",
    inputSchema: {
      type: "object",
      properties: {
        messages: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              parts: {
                type: ["array", "null"],
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    imageData: { type: ["string", "null"] },
                    imageTitle: { type: ["string", "null"] },
                  },
                  required: ["type"],
                },
              },
            },
            required: ["id"],
          },
          description: "Array of chat messages containing images",
        },
        folderPrefix: {
          type: ["string", "null"],
          description: "Optional folder prefix for organizing downloads",
        },
        filenamingStrategy: {
          type: "string",
          enum: ["descriptive", "sequential", "timestamp"],
          description: "Strategy for naming files",
          default: "descriptive",
        },
        displayResults: {
          type: "boolean",
          description: "Whether to display the download results",
          default: true,
        },
      },
      required: ["messages"],
    },
  },

  // =========================================================================
  // Interventions (4 tools)
  // =========================================================================
  {
    name: "list_interventions",
    description:
      "List all available human intervention types. Use this to discover what interventions the AI can request from the user.",
    inputSchema: {
      type: "object",
      properties: {
        enabledOnly: {
          type: "boolean",
          description: "Only list enabled interventions (default: false)",
          default: false,
        },
      },
    },
  },
  {
    name: "get_intervention_info",
    description:
      "Get detailed information about a specific intervention type, including input/output schemas and examples.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["monitor-operation", "voice-input", "user-selection"],
          description: "Intervention type",
        },
      },
      required: ["type"],
    },
  },
  {
    name: "request_intervention",
    description:
      "Request a human intervention. This will pause AI execution and wait for user input.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["monitor-operation", "voice-input", "user-selection"],
          description: "Intervention type",
        },
        params: {
          type: ["object", "null"],
          description: "Intervention-specific parameters",
        },
        timeout: {
          type: "number",
          description: "Timeout in seconds (default: 300)",
          default: 300,
        },
        reason: {
          type: ["string", "null"],
          description: "Explain to the user why this intervention is needed",
        },
      },
      required: ["type"],
    },
  },
  {
    name: "cancel_intervention",
    description: "Cancel the currently active intervention.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: ["string", "null"],
          description:
            "Intervention ID (optional, will cancel current if not provided)",
        },
      },
    },
  },

  // =========================================================================
  // Skills (6 tools)
  // =========================================================================
  {
    name: "load_skill",
    description:
      "Load the main content (SKILL.md) of a skill. Use this to understand what a skill does, its capabilities, available scripts, and how to use it.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "The name of the skill to load" },
      },
      required: ["name"],
    },
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
            'The path to the script file (e.g., "scripts/init_skill.js"), MUST start with "scripts/"',
        },
        args: {
          description: "Arguments to pass to the script",
        },
      },
      required: ["skillName", "scriptPath"],
    },
  },
  {
    name: "read_skill_reference",
    description:
      "Read a reference document from a skill. Reference files are located in the references/ directory.",
    inputSchema: {
      type: "object",
      properties: {
        skillName: { type: "string", description: "The name of the skill" },
        refPath: {
          type: "string",
          description:
            'The path to the reference file (e.g., "references/guide.md"), MUST start with "references/"',
        },
      },
      required: ["skillName", "refPath"],
    },
  },
  {
    name: "get_skill_asset",
    description:
      "Get an asset file from a skill. Assets are located in the assets/ directory.",
    inputSchema: {
      type: "object",
      properties: {
        skillName: { type: "string", description: "The name of the skill" },
        assetPath: {
          type: "string",
          description:
            'The path to the asset file (e.g., "assets/icon.png"), MUST start with "assets/"',
        },
      },
      required: ["skillName", "assetPath"],
    },
  },
  {
    name: "list_skills",
    description:
      "List all available skills in the system. Shows enabled skills by default, or all skills if specified.",
    inputSchema: {
      type: "object",
      properties: {
        enabledOnly: {
          type: ["boolean", "null"],
          description: "If true, only show enabled skills. Default: false",
        },
      },
    },
  },
  {
    name: "get_skill_info",
    description:
      "Get detailed information about a specific skill, including its scripts, references, assets, and metadata.",
    inputSchema: {
      type: "object",
      properties: {
        skillName: { type: "string", description: "The name of the skill" },
      },
      required: ["skillName"],
    },
  },
];

/** Quick lookup set of all defined tool names */
export const toolNameSet = new Set(toolDefinitions.map((t) => t.name));
