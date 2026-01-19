import { tool } from "@aipexstudio/aipex-core";
import { z } from "zod";
import { SmartElementHandle, snapshotManager } from "../automation";
import {
  playClickAnimationAndReturn,
  scrollAndMoveFakeMouseToElement,
  waitForEventsAfterAction,
} from "./ui-operations";

async function getElementByUid(tabId, uid) {
  const node = snapshotManager.getNodeByUid(tabId, uid);
  if (!node) {
    throw new Error(
      "No such element found in the snapshot, the page content may have changed, please call search_elements again to get a fresh snapshot.",
    );
  }
  if (node.backendDOMNodeId) {
    return new SmartElementHandle(tabId, node, node.backendDOMNodeId);
  }
  return null;
}
export const clickTool = tool({
  name: "click",
  description: "Click an element using its unique UID from a snapshot",
  parameters: z.object({
    tabId: z.number().describe("The ID of the tab to click on"),
    uid: z
      .string()
      .describe("The unique identifier of an element from the page snapshot"),
    dblClick: z
      .boolean()
      .optional()
      .default(false)
      .describe("Set to true for double clicks"),
  }),
  execute: async ({ tabId, uid, dblClick = false }) => {
    let handle = null;
    try {
      handle = await getElementByUid(tabId, uid);
      if (!handle) {
        throw new Error(
          "Element not found in current snapshot. Call take_snapshot first.",
        );
      }
      await handle.asLocator().click({ count: dblClick ? 2 : 1 });
      return {
        success: true,
        message: `Element ${dblClick ? "double " : ""}clicked successfully`,
      };
    } finally {
      if (handle) {
        handle.dispose();
      }
    }
  },
});
export const fillElementByUidTool = tool({
  name: "fill_element_by_uid",
  description: "Fill an input element using its unique UID from a snapshot",
  parameters: z.object({
    tabId: z.number().describe("The ID of the tab to fill the element in"),
    uid: z.string().describe("The unique identifier of the element to fill"),
    value: z.string().describe("The value to fill into the element"),
  }),
  execute: async ({ tabId, uid, value }) => {
    let handle = null;
    try {
      handle = await getElementByUid(tabId, uid);
      if (!handle) {
        throw new Error(
          "Element not found in current snapshot. Call take_snapshot first.",
        );
      }
      await handle.asLocator().fill(value);
      return {
        success: true,
        message: "Element filled successfully",
      };
    } finally {
      if (handle) {
        handle.dispose();
      }
    }
  },
});
export const hoverElementByUidTool = tool({
  name: "hover_element_by_uid",
  description: "Hover over an element using its unique UID from a snapshot",
  parameters: z.object({
    tabId: z.number().describe("The ID of the tab to hover over"),
    uid: z
      .string()
      .describe("The unique identifier of the element to hover over"),
  }),
  execute: async ({ tabId, uid }) => {
    let handle = null;
    try {
      handle = await getElementByUid(tabId, uid);
      if (!handle) {
        throw new Error(
          "Element not found in current snapshot. Call take_snapshot first.",
        );
      }
      await handle.asLocator().hover();
      return {
        success: true,
        message: "Element hovered successfully",
      };
    } finally {
      if (handle) {
        handle.dispose();
      }
    }
  },
});
export const getEditorValueTool = tool({
  name: "get_editor_value",
  description:
    "Get the complete content from a code editor (Monaco, CodeMirror, ACE) or textarea without truncation. Use this before filling to avoid data loss.",
  parameters: z.object({
    tabId: z.number().describe("The ID of the tab"),
    uid: z
      .string()
      .describe("The unique identifier of the editor element from snapshot"),
  }),
  execute: async ({ tabId, uid }) => {
    let handle = null;
    try {
      handle = await getElementByUid(tabId, uid);
      if (!handle) {
        throw new Error(
          "Element not found in current snapshot. Call take_snapshot first.",
        );
      }
      const value = await handle.asLocator().getEditorValue();
      if (value === null) {
        return {
          success: false,
          message:
            "Failed to get editor value - element may not be an input/textarea/editor",
        };
      }
      return {
        success: true,
        value,
        length: value.length,
      };
    } finally {
      if (handle) {
        handle.dispose();
      }
    }
  },
});
export const fillFormTool = tool({
  name: "fill_form",
  description:
    "Fill multiple form elements at once using their UIDs from a snapshot",
  parameters: z.object({
    tabId: z.number().describe("The ID of the tab to fill the elements in"),
    elements: z
      .array(
        z.object({
          uid: z.string().describe("The unique identifier of the element"),
          value: z.string().describe("The value to fill into the element"),
        }),
      )
      .describe("Array of elements to fill with their UIDs and values"),
  }),
  execute: async ({ tabId, elements }) => {
    const results = [];
    let successCount = 0;
    for (const element of elements) {
      let handle = null;
      try {
        handle = await getElementByUid(tabId, element.uid);
        if (!handle) {
          results.push({
            uid: element.uid,
            success: false,
            error:
              "Element not found in current snapshot. Call take_snapshot first.",
          });
          continue;
        }
        // Scroll to element and move fake mouse (optional visual feedback)
        await scrollAndMoveFakeMouseToElement({
          tabId,
          handle,
        });
        // Fill the element with event handling
        await waitForEventsAfterAction(async () => {
          await handle.asLocator().fill(element.value);
        });
        results.push({
          uid: element.uid,
          success: true,
        });
        successCount++;
      } catch (error) {
        results.push({
          uid: element.uid,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        if (handle) {
          handle.dispose();
        }
      }
    }
    // Play animation after filling all fields
    if (successCount > 0) {
      await playClickAnimationAndReturn(tabId);
    }
    return {
      success: successCount === elements.length,
      totalElements: elements.length,
      successCount,
      failureCount: elements.length - successCount,
      results,
      message:
        successCount === elements.length
          ? `Successfully filled all ${elements.length} form fields`
          : `Filled ${successCount} of ${elements.length} form fields`,
    };
  },
});
