import { tool } from "@aipexstudio/aipex-core";
import { z } from "zod";
import { executeScriptInActiveTab, getActiveTab } from "./index";

/**
 * Get information about the current active page
 */
export const getPageInfoTool = tool({
  name: "get_page_info",
  description:
    "Get information about the current active page (URL, title, etc.)",
  parameters: z.object({}),
  execute: async () => {
    const tab = await getActiveTab();

    return {
      url: tab.url,
      title: tab.title,
      id: tab.id,
      favIconUrl: tab.favIconUrl,
    };
  },
});

/**
 * Scroll the current page
 */
export const scrollPageTool = tool({
  name: "scroll_page",
  description:
    "Scroll the current page in a specific direction or to a position",
  parameters: z.object({
    direction: z
      .enum(["up", "down", "top", "bottom"])
      .describe("Direction to scroll"),
    pixels: z
      .number()
      .nullable()
      .optional()
      .describe("Number of pixels to scroll (for up/down)"),
  }),
  execute: async ({ direction, pixels = 500 }) => {
    await executeScriptInActiveTab(
      (dir: string, px: number) => {
        switch (dir) {
          case "up":
            window.scrollBy({ top: -px, behavior: "smooth" });
            break;
          case "down":
            window.scrollBy({ top: px, behavior: "smooth" });
            break;
          case "top":
            window.scrollTo({ top: 0, behavior: "smooth" });
            break;
          case "bottom":
            window.scrollTo({
              top: document.body.scrollHeight,
              behavior: "smooth",
            });
            break;
        }
      },
      [direction, pixels],
    );

    return { success: true, direction, scrolled: pixels };
  },
});

/**
 * Navigate to a specific URL
 */
export const navigateToUrlTool = tool({
  name: "navigate_to_url",
  description: "Navigate the current tab to a specific URL",
  parameters: z.object({
    url: z.string().url().describe("The URL to navigate to"),
    newTab: z
      .boolean()
      .nullable()
      .optional()
      .describe("Whether to open in a new tab"),
  }),
  execute: async ({ url, newTab = false }) => {
    if (newTab) {
      const tab = await chrome.tabs.create({ url });
      return { success: true, tabId: tab.id, url };
    } else {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab?.id) {
        throw new Error("No active tab found");
      }

      await chrome.tabs.update(tab.id, { url });
      return { success: true, tabId: tab.id, url };
    }
  },
});

/**
 * Get the text content of the current page
 */
export const getPageContentTool = tool({
  name: "get_page_content",
  description: "Get the text content of the current page",
  parameters: z.object({
    selector: z
      .string()
      .nullable()
      .nullable()
      .optional()
      .describe("CSS selector to get content from (default: body)"),
  }),
  execute: async ({ selector = "body" }) => {
    const content = await executeScriptInActiveTab(
      (sel: string) => {
        const element = document.querySelector(sel);
        return element ? element.textContent : null;
      },
      [selector],
    );

    if (!content) {
      throw new Error(`No content found for selector: ${selector}`);
    }

    return { content, selector };
  },
});

/**
 * Click an element on the page
 */
export const clickElementTool = tool({
  name: "click_element",
  description: "Click an element on the current page using a CSS selector",
  parameters: z.object({
    selector: z.string().describe("CSS selector of the element to click"),
  }),
  execute: async ({ selector }) => {
    const result = await executeScriptInActiveTab(
      (sel: string) => {
        const element = document.querySelector(sel);
        if (!element) {
          return { success: false, error: "Element not found" };
        }
        if (element instanceof HTMLElement) {
          element.click();
          return { success: true };
        }
        return { success: false, error: "Element is not clickable" };
      },
      [selector],
    );

    if (!result?.success) {
      throw new Error(result?.error ?? "Failed to click element");
    }

    return { success: true, selector };
  },
});

/**
 * Fill a form field on the page
 */
export const fillFormFieldTool = tool({
  name: "fill_form_field",
  description: "Fill a form field on the current page",
  parameters: z.object({
    selector: z.string().describe("CSS selector of the input field"),
    value: z.string().describe("Value to fill in the field"),
  }),
  execute: async ({ selector, value }) => {
    const result = await executeScriptInActiveTab(
      (sel: string, val: string) => {
        const element = document.querySelector(sel);
        if (!element) {
          return { success: false, error: "Element not found" };
        }
        if (
          element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement
        ) {
          element.value = val;
          element.dispatchEvent(new Event("input", { bubbles: true }));
          element.dispatchEvent(new Event("change", { bubbles: true }));
          return { success: true };
        }
        return { success: false, error: "Element is not an input field" };
      },
      [selector, value],
    );

    if (!result?.success) {
      throw new Error(result?.error ?? "Failed to fill form field");
    }

    return { success: true, selector, value };
  },
});
