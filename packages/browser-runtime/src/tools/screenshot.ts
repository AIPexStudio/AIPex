import { tool } from "@aipexstudio/aipex-core";
import { z } from "zod";
import { getActiveTab } from "./index";

async function compressImage(
  dataUrl: string,
  quality: number = 0.6,
  maxWidth: number = 1024,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });
}

export const takeScreenshotTool = tool({
  name: "take_screenshot",
  description: "Capture a screenshot of the current visible tab",
  parameters: z.object({
    compress: z
      .boolean()
      .nullable()
      .optional()
      .describe("Whether to compress the image for LLM consumption"),
  }),
  execute: async ({ compress = false }) => {
    const tab = await getActiveTab();

    if (!tab.id || !tab.windowId) {
      throw new Error("No active tab found");
    }

    if (
      tab.url &&
      (tab.url.startsWith("chrome://") ||
        tab.url.startsWith("chrome-extension://"))
    ) {
      throw new Error("Cannot capture browser internal pages");
    }

    if (tab.status === "loading") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    await chrome.windows.update(tab.windowId, { focused: true });
    await new Promise((resolve) => setTimeout(resolve, 100));

    let dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: "png",
      quality: 90,
    });

    if (!dataUrl || !dataUrl.startsWith("data:image/")) {
      throw new Error("Invalid image data captured");
    }

    if (compress) {
      dataUrl = await compressImage(dataUrl, 0.6, 1024);
    }

    return {
      success: true,
      imageData: dataUrl,
      tabId: tab.id,
      url: tab.url,
      title: tab.title,
    };
  },
});

export const takeScreenshotOfTabTool = tool({
  name: "take_screenshot_of_tab",
  description: "Capture a screenshot of a specific tab by ID",
  parameters: z.object({
    tabId: z.number().describe("The tab ID to capture"),
    compress: z
      .boolean()
      .nullable()
      .optional()
      .describe("Whether to compress the image for LLM consumption"),
  }),
  execute: async ({ tabId, compress = false }) => {
    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.windowId) {
      throw new Error("Tab not found");
    }

    await chrome.tabs.update(tabId, { active: true });
    await new Promise((resolve) => setTimeout(resolve, 100));

    let dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: "png",
      quality: 90,
    });

    if (compress) {
      dataUrl = await compressImage(dataUrl, 0.6, 1024);
    }

    return {
      success: true,
      imageData: dataUrl,
      tabId,
      url: tab.url,
      title: tab.title,
    };
  },
});

export const copyScreenshotToClipboardTool = tool({
  name: "copy_screenshot_to_clipboard",
  description: "Capture a screenshot and copy it to the clipboard",
  parameters: z.object({}),
  execute: async () => {
    const tab = await getActiveTab();

    if (!tab.id || !tab.windowId) {
      throw new Error("No active tab found");
    }

    await chrome.windows.update(tab.windowId, { focused: true });
    await new Promise((resolve) => setTimeout(resolve, 100));

    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: "png",
      quality: 90,
    });

    const response = await fetch(dataUrl);
    const blob = await response.blob();

    await navigator.clipboard.write([
      new ClipboardItem({
        [blob.type]: blob,
      }),
    ]);

    return {
      success: true,
      message: "Screenshot copied to clipboard",
    };
  },
});
