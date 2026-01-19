import { tool } from "@aipexstudio/aipex-core";
import { z } from "zod";
import { executeComputerAction } from "../automation/computer";

export const computerTool = tool({
  name: "computer",
  description: `Use mouse and keyboard to interact with a web browser based on screenshot coordinates.

IMPORTANT: Before using any coordinate-based actions (click, hover, scroll, drag), you MUST first call capture_screenshot(sendToLLM=true) to take a screenshot. All coordinate values are in screenshot pixel space and will be mapped to viewport CSS pixels.

* Whenever you intend to click on an element like an icon, consult the screenshot to determine the coordinates of the element.
* If you tried clicking on a program or link but it failed to load, try adjusting your click location so that the cursor tip visually falls on the element center.
* Make sure to click any buttons, links, icons, etc with the cursor tip in the center of the element. Don't click boxes on their edges unless asked.`,
  parameters: z.object({
    action: z
      .enum([
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
      ])
      .describe(`The action to perform:
* \`left_click\`: Click the left mouse button at the specified coordinates.
* \`right_click\`: Click the right mouse button at the specified coordinates to open context menus.
* \`double_click\`: Double-click the left mouse button at the specified coordinates.
* \`triple_click\`: Triple-click the left mouse button at the specified coordinates.
* \`type\`: Type a string of text at the current cursor position.
* \`wait\`: Wait for a specified number of seconds.
* \`scroll\`: Scroll up, down, left, or right at the specified coordinates.
* \`key\`: Press a specific keyboard key or key combination.
* \`left_click_drag\`: Drag from start_coordinate to coordinate.
* \`scroll_to\`: Scroll an element into view using its element UID from snapshot.
* \`hover\`: Move the mouse cursor to the specified coordinates without clicking. Useful for revealing tooltips, dropdown menus, or triggering hover states.`),
    coordinate: z
      .array(z.number())
      .min(2)
      .max(2)
      .nullable()
      .optional()
      .describe(
        "(x, y): The x (pixels from the left edge) and y (pixels from the top edge) coordinates in screenshot pixel space. Required for left_click, right_click, double_click, triple_click, scroll, and hover. For left_click_drag, this is the end position.",
      ),
    text: z
      .string()
      .nullable()
      .optional()
      .describe(
        'The text to type (for type action) or the key(s) to press (for key action). For key action: Provide space-separated keys (e.g., "Backspace Backspace Delete"). Supports keyboard shortcuts using the platform modifier key (use "cmd" on Mac, "ctrl" on Windows/Linux, e.g., "cmd+a" for select all). Common keys: Enter, Tab, Escape, ArrowUp/Down/Left/Right, Backspace, Delete.',
      ),
    start_coordinate: z
      .array(z.number())
      .min(2)
      .max(2)
      .nullable()
      .optional()
      .describe(
        "Starting coordinates for left_click_drag action in screenshot pixel space.",
      ),
    scroll_direction: z
      .enum(["up", "down", "left", "right"])
      .nullable()
      .optional()
      .describe("Direction to scroll for scroll action."),
    scroll_amount: z
      .number()
      .nullable()
      .optional()
      .describe(
        "Number of pixels to scroll. Defaults to ~2 viewport heights for standard scrolling.",
      ),
    duration: z
      .number()
      .nullable()
      .optional()
      .describe("Duration in seconds for wait action."),
    tabId: z
      .number()
      .nullable()
      .optional()
      .describe(
        "The ID of the tab to operate on. Defaults to current active tab.",
      ),
    uid: z
      .string()
      .nullable()
      .optional()
      .describe("Element UID from snapshot for scroll_to action."),
  }),
  execute: async (params) => {
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
      duration: params.duration ?? undefined,
      tabId: params.tabId ?? undefined,
      uid: params.uid ?? undefined,
    });
  },
});
