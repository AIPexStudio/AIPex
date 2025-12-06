import { tool } from "@aipexstudio/aipex-core";
import { z } from "zod";
import {
  type ElementHandle,
  SmartElementHandle,
  snapshotManager,
} from "../automation";
import { getActiveTab } from "./index";

async function getElementByUid(
  tabId: number,
  uid: string,
): Promise<ElementHandle | null> {
  const node = snapshotManager.getNodeByUid(tabId, uid);
  if (!node) {
    throw new Error(
      "No such element found in the snapshot. The page content may have changed, please call take_snapshot again.",
    );
  }

  if (node.backendDOMNodeId) {
    return new SmartElementHandle(tabId, node, node.backendDOMNodeId);
  }

  return null;
}

export const clickElementByUidTool = tool({
  name: "click_element_by_uid",
  description:
    "Click an element by its UID from a snapshot. Use take_snapshot first to get element UIDs.",
  parameters: z.object({
    uid: z.string().describe("The element UID from the snapshot"),
    doubleClick: z
      .boolean()
      .nullable()
      .optional()
      .describe("Whether to double click"),
  }),
  execute: async ({
    uid,
    doubleClick = false,
  }: {
    uid: string;
    doubleClick?: boolean | null;
  }) => {
    const tab = await getActiveTab();

    if (!tab.id) {
      throw new Error("No active tab found");
    }

    let handle: ElementHandle | null = null;

    try {
      handle = await getElementByUid(tab.id, uid);
      if (!handle) {
        throw new Error(
          "Element not found in current snapshot. Call take_snapshot first.",
        );
      }

      await handle.asLocator().click({ count: doubleClick ? 2 : 1 });

      return {
        success: true,
        message: `Element ${doubleClick ? "double " : ""}clicked successfully`,
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
  description:
    "Fill a text input by its UID from a snapshot. Use take_snapshot first to get element UIDs.",
  parameters: z.object({
    uid: z.string().describe("The element UID from the snapshot"),
    value: z.string().describe("The value to fill"),
  }),
  execute: async ({ uid, value }: { uid: string; value: string }) => {
    const tab = await getActiveTab();

    if (!tab.id) {
      throw new Error("No active tab found");
    }

    let handle: ElementHandle | null = null;

    try {
      handle = await getElementByUid(tab.id, uid);
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
  description:
    "Hover over an element by its UID from a snapshot. Use take_snapshot first to get element UIDs.",
  parameters: z.object({
    uid: z.string().describe("The element UID from the snapshot"),
  }),
  execute: async ({ uid }: { uid: string }) => {
    const tab = await getActiveTab();

    if (!tab.id) {
      throw new Error("No active tab found");
    }

    let handle: ElementHandle | null = null;

    try {
      handle = await getElementByUid(tab.id, uid);
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

export const getEditorValueByUidTool = tool({
  name: "get_editor_value_by_uid",
  description:
    "Get the value of an editor or input element by its UID. Supports Monaco Editor, CodeMirror, ACE, and standard inputs.",
  parameters: z.object({
    uid: z.string().describe("The element UID from the snapshot"),
  }),
  execute: async ({ uid }: { uid: string }) => {
    const tab = await getActiveTab();

    if (!tab.id) {
      throw new Error("No active tab found");
    }

    let handle: ElementHandle | null = null;

    try {
      handle = await getElementByUid(tab.id, uid);
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
