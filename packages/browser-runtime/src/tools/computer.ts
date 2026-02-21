import { tool } from "@aipexstudio/aipex-core";
import { z } from "zod";
import { executeComputerAction } from "../automation/computer";
import { getAutomationMode } from "../runtime/automation-mode";

export const computerTool = tool({
  name: "computer",
  description: `[HIGH-COST FALLBACK] Coordinate-based mouse/keyboard interaction using screenshot pixels.

PREFER UID-BASED TOOLS FIRST: For clicking buttons, filling forms, or hovering elements, use search_elements to get UIDs, then use click/fill_element_by_uid/hover_element_by_uid. These are faster and more reliable.

USE THIS TOOL ONLY WHEN:
- search_elements returned 0 matches after trying 2 different query patterns
- UID-based actions failed twice (element not interactable)
- The goal requires visual/pixel-level interaction: canvas apps, drag-and-drop, sliders, charts, hover-only menus

PREREQUISITE: If you choose coordinate actions, you MUST first call capture_screenshot(sendToLLM=true). Coordinates are in screenshot pixel space.

* Click element centers, not edges. Adjust if clicks miss.`,
  parameters: z.object({
    action: z
      .enum([
        "left_click",
        "right_click",
        "type",
        "scroll",
        "key",
        "left_click_drag",
        "double_click",
        "triple_click",
        "scroll_to",
        "hover",
      ])
      .describe(`The action to perform:
* \`left_click\`: Click the left mouse button at the specified coordinates.
* \`right_click\`: Click the right mouse button at the specified coordinates to open context menus.
* \`double_click\`: Double-click the left mouse button at the specified coordinates.
* \`triple_click\`: Triple-click the left mouse button at the specified coordinates.
* \`type\`: Type a string of text at the current cursor position.
* \`scroll\`: Scroll up, down, left, or right at the specified coordinates.
* \`key\`: Press a specific keyboard key or key combination.
* \`left_click_drag\`: Drag from start_coordinate to coordinate.
* \`scroll_to\`: Scroll an element into view using its element UID from snapshot.
* \`hover\`: Move the mouse cursor to the specified coordinates without clicking. Useful for revealing tooltips, dropdown menus, or triggering hover states.`),
    coordinate: z
      .array(z.number())
      .min(2)
      .max(2)
      .optional()
      .describe(
        "(x, y): The x (pixels from the left edge) and y (pixels from the top edge) coordinates in screenshot pixel space. Required for left_click, right_click, double_click, triple_click, scroll, and hover. For left_click_drag, this is the end position.",
      ),
    text: z
      .string()
      .optional()
      .describe(
        'The text to type (for type action) or the key(s) to press (for key action). For key action: Provide space-separated keys (e.g., "Backspace Backspace Delete"). Supports keyboard shortcuts using the platform modifier key (use "cmd" on Mac, "ctrl" on Windows/Linux, e.g., "cmd+a" for select all). Common keys: Enter, Tab, Escape, ArrowUp/Down/Left/Right, Backspace, Delete.',
      ),
    start_coordinate: z
      .array(z.number())
      .min(2)
      .max(2)
      .optional()
      .describe(
        "Starting coordinates for left_click_drag action in screenshot pixel space.",
      ),
    scroll_direction: z
      .enum(["up", "down", "left", "right"])
      .optional()
      .describe("Direction to scroll for scroll action."),
    scroll_amount: z
      .number()
      .optional()
      .describe(
        "Number of pixels to scroll. Defaults to ~2 viewport heights for standard scrolling.",
      ),
    tabId: z
      .number()
      .optional()
      .describe(
        "The ID of the tab to operate on. Defaults to current active tab.",
      ),
    uid: z
      .string()
      .optional()
      .describe("Element UID from snapshot for scroll_to action."),
  }),
  execute: async (params) => {
    const mode = await getAutomationMode();
    console.log("🔧 [computer] Automation mode:", mode);

    // Background mode: reject computer tool (visual coordinate-based interactions)
    if (mode === "background") {
      throw new Error(
        "Computer tool (visual coordinate interactions) is disabled in background mode. Please switch to focus mode to use visual automation tools.",
      );
    }

    return await executeComputerAction({
      action: params.action,
      coordinate: params.coordinate
        ? ([params.coordinate[0], params.coordinate[1]] as [number, number])
        : undefined,
      text: params.text ?? undefined,
      start_coordinate: params.start_coordinate
        ? ([params.start_coordinate[0], params.start_coordinate[1]] as [
            number,
            number,
          ])
        : undefined,
      scroll_direction: params.scroll_direction ?? undefined,
      scroll_amount: params.scroll_amount ?? undefined,
      tabId: params.tabId ?? undefined,
      uid: params.uid ?? undefined,
    });
  },
});
