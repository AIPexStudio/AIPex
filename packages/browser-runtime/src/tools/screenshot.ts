import { tool } from "@aipexstudio/aipex-core";
import { z } from "zod";
import { cacheScreenshotMetadata } from "../automation/computer";
import { getAutomationMode } from "../runtime/automation-mode";
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

export const captureScreenshotTool = tool({
  name: "capture_screenshot",
  description:
    "Capture screenshot of current visible tab and return as base64 data URL. When sendToLLM=true, the screenshot will be sent to the LLM for visual analysis AND visual coordinate tools (computer) will be unlocked for subsequent interactions. NOTE: This tool requires focus mode.",
  parameters: z.object({
    sendToLLM: z
      .boolean()
      .nullable()
      .optional()
      .default(false)
      .describe(
        "Whether to send the screenshot to LLM for visual analysis. When true, visual coordinate tools will be enabled.",
      ),
  }),
  execute: async ({ sendToLLM = false }: { sendToLLM?: boolean | null }) => {
    const mode = await getAutomationMode();
    console.log("🔧 [captureScreenshot] Automation mode:", mode);

    // Background mode: reject screenshot with visual feedback
    if (mode === "background") {
      throw new Error(
        "Screenshot capture is disabled in background mode. Please switch to focus mode to use visual tools.",
      );
    }

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

    // Get viewport dimensions for metadata caching
    const viewportDimensions = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => ({
        width: window.innerWidth,
        height: window.innerHeight,
      }),
    });
    const viewport = viewportDimensions[0]?.result;

    if (sendToLLM) {
      // Compress for LLM
      dataUrl = await compressImage(dataUrl, 0.6, 1024);

      // Extract image dimensions
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = dataUrl;
      });

      // Cache screenshot metadata for computer tool
      if (viewport) {
        cacheScreenshotMetadata(
          tab.id,
          img.width,
          img.height,
          viewport.width,
          viewport.height,
        );
      }
    }

    return {
      success: true,
      imageData: sendToLLM ? dataUrl : undefined,
      captured: !sendToLLM,
      tabId: tab.id,
      url: tab.url,
      title: tab.title,
    };
  },
});

export const captureTabScreenshotTool = tool({
  name: "capture_tab_screenshot",
  description:
    "Capture screenshot of a specific tab by ID. When sendToLLM=true, the screenshot will be sent to the LLM for visual analysis AND visual coordinate tools (computer) will be unlocked for subsequent interactions. NOTE: This tool requires focus mode.",
  parameters: z.object({
    tabId: z.number().describe("The tab ID to capture"),
    sendToLLM: z
      .boolean()
      .nullable()
      .optional()
      .default(false)
      .describe(
        "Whether to send the screenshot to LLM for visual analysis. When true, visual coordinate tools will be enabled.",
      ),
  }),
  execute: async ({
    tabId,
    sendToLLM = false,
  }: {
    tabId: number;
    sendToLLM?: boolean | null;
  }) => {
    const mode = await getAutomationMode();
    console.log("🔧 [captureTabScreenshot] Automation mode:", mode);

    // Background mode: reject screenshot with visual feedback
    if (mode === "background") {
      throw new Error(
        "Screenshot capture is disabled in background mode. Please switch to focus mode to use visual tools.",
      );
    }

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

    // Get viewport dimensions for metadata caching
    const viewportDimensions = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => ({
        width: window.innerWidth,
        height: window.innerHeight,
      }),
    });
    const viewport = viewportDimensions[0]?.result;

    if (sendToLLM) {
      // Compress for LLM
      dataUrl = await compressImage(dataUrl, 0.6, 1024);

      // Extract image dimensions
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = dataUrl;
      });

      // Cache screenshot metadata for computer tool
      if (viewport) {
        cacheScreenshotMetadata(
          tabId,
          img.width,
          img.height,
          viewport.width,
          viewport.height,
        );
      }
    }

    return {
      success: true,
      imageData: sendToLLM ? dataUrl : undefined,
      captured: !sendToLLM,
      tabId,
      url: tab.url,
      title: tab.title,
    };
  },
});

export const captureScreenshotToClipboardTool = tool({
  name: "capture_screenshot_to_clipboard",
  description:
    "Capture screenshot of current tab and save directly to clipboard. NOTE: This tool requires focus mode.",
  parameters: z.object({}),
  execute: async () => {
    const mode = await getAutomationMode();
    console.log("🔧 [captureScreenshotToClipboard] Automation mode:", mode);

    // Background mode: reject screenshot
    if (mode === "background") {
      throw new Error(
        "Screenshot capture is disabled in background mode. Please switch to focus mode to use visual tools.",
      );
    }

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
