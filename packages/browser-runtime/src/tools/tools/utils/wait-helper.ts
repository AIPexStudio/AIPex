import { tool } from "@aipexstudio/aipex-core";
import { z } from "zod";

/**
 * Wait for a specified duration
 */
export async function wait(milliseconds: number): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await new Promise((resolve) => setTimeout(resolve, milliseconds));
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Wait for element to appear
 */
export async function waitForElement(
  tabId: number,
  selector: string,
  timeout = 5000,
): Promise<{
  success: boolean;
  found?: boolean;
  error?: string;
}> {
  try {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: (sel: string) => {
          return document.querySelector(sel) !== null;
        },
        args: [selector],
      });

      if (results[0]?.result) {
        return { success: true, found: true };
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return { success: true, found: false };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export const waitTool = tool({
  name: "wait",
  description:
    "Wait for a specified time, useful for waiting for page load, element to appear",
  parameters: z.object({
    time: z
      .number()
      .min(0)
      .max(30000)
      .describe("The time to wait in milliseconds (max 30 seconds)"),
  }),
  execute: async ({ time }: { time: number }) => {
    return await wait(time);
  },
});

export const waitForElementTool = tool({
  name: "wait_for_element",
  description: "Wait for an element to appear on the page",
  parameters: z.object({
    tabId: z.number().describe("ID of the tab"),
    selector: z.string().describe("CSS selector for the element"),
    timeout: z
      .number()
      .nullable()
      .optional()
      .describe("Maximum time to wait in milliseconds (default: 5000)"),
  }),
  execute: async ({
    tabId,
    selector,
    timeout,
  }: {
    tabId: number;
    selector: string;
    timeout?: number;
  }) => {
    return await waitForElement(tabId, selector, timeout);
  },
});
