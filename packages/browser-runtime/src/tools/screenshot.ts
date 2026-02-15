import { tool } from "@aipexstudio/aipex-core";
import { z } from "zod";
import { cacheScreenshotMetadata } from "../automation/computer";
import { RuntimeScreenshotStorage } from "../lib/screenshot-storage";
import { getAutomationMode } from "../runtime/automation-mode";
import { getActiveTab } from "./index";
import {
  captureVisibleTabWithElementCrop,
  MAX_PADDING,
} from "./screenshot-helpers.js";

// Re-export the shared helper types/function so existing consumers aren't broken
export type {
  CaptureWithElementCropOptions,
  CaptureWithElementCropResult,
} from "./screenshot-helpers.js";
export { captureVisibleTabWithElementCrop } from "./screenshot-helpers.js";

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
  execute: async ({ sendToLLM = false }) => {
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

    // Get viewport dimensions for metadata caching (graceful degradation)
    let viewport: { width: number; height: number } | undefined;
    try {
      const viewportDimensions = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => ({
          width: window.innerWidth,
          height: window.innerHeight,
        }),
      });
      viewport = viewportDimensions[0]?.result ?? undefined;
    } catch (e) {
      console.warn("[Screenshot] Failed to get viewport dimensions:", e);
      // Continue without viewport metadata – screenshot still works
    }

    // Get image dimensions for metadata
    let imageWidth = 0;
    let imageHeight = 0;

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
      imageWidth = img.width;
      imageHeight = img.height;

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
    } else {
      // Get original image dimensions for non-LLM screenshots
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = dataUrl;
      });
      imageWidth = img.width;
      imageHeight = img.height;
    }

    // Save screenshot to IndexedDB and get uid
    let screenshotUid: string | undefined;
    try {
      screenshotUid = await RuntimeScreenshotStorage.saveScreenshot(dataUrl, {
        tabId: tab.id,
        width: imageWidth,
        height: imageHeight,
        viewportWidth: viewport?.width ?? 0,
        viewportHeight: viewport?.height ?? 0,
      });
    } catch (err) {
      console.error("[Screenshot] Failed to save to IndexedDB:", err);
      // Continue even if storage fails
    }

    if (sendToLLM) {
      return {
        success: true,
        imageData: dataUrl,
        sendToLLM: true,
        screenshotUid,
        tabId: tab.id,
        url: tab.url,
        title: tab.title,
      };
    }

    return {
      success: true,
      captured: true,
      sendToLLM: false,
      screenshotUid,
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
  execute: async ({ tabId, sendToLLM = false }) => {
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

    // Get viewport dimensions for metadata caching (graceful degradation)
    let viewport: { width: number; height: number } | undefined;
    try {
      const viewportDimensions = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => ({
          width: window.innerWidth,
          height: window.innerHeight,
        }),
      });
      viewport = viewportDimensions[0]?.result ?? undefined;
    } catch (e) {
      console.warn("[Screenshot] Failed to get viewport dimensions:", e);
      // Continue without viewport metadata – screenshot still works
    }

    // Get image dimensions for metadata
    let imageWidth = 0;
    let imageHeight = 0;

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
      imageWidth = img.width;
      imageHeight = img.height;

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
    } else {
      // Get original image dimensions for non-LLM screenshots
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = dataUrl;
      });
      imageWidth = img.width;
      imageHeight = img.height;
    }

    // Save screenshot to IndexedDB and get uid
    let screenshotUid: string | undefined;
    try {
      screenshotUid = await RuntimeScreenshotStorage.saveScreenshot(dataUrl, {
        tabId,
        width: imageWidth,
        height: imageHeight,
        viewportWidth: viewport?.width ?? 0,
        viewportHeight: viewport?.height ?? 0,
      });
    } catch (err) {
      console.error("[Screenshot] Failed to save to IndexedDB:", err);
      // Continue even if storage fails
    }

    if (sendToLLM) {
      return {
        success: true,
        imageData: dataUrl,
        sendToLLM: true,
        screenshotUid,
        tabId,
        url: tab.url,
        title: tab.title,
      };
    }

    return {
      success: true,
      captured: true,
      sendToLLM: false,
      screenshotUid,
      tabId,
      url: tab.url,
      title: tab.title,
    };
  },
});

/** Maximum allowed CSS selector length to prevent injection of excessively long strings */
const MAX_SELECTOR_LENGTH = 500;

// ===================== Tool definition =====================

export const captureScreenshotWithHighlightTool = tool({
  name: "capture_screenshot_with_highlight",
  description:
    "Capture screenshot of the current visible tab, optionally highlighting and cropping to a specific element identified by CSS selector. The screenshot is always sent to the LLM for visual analysis. NOTE: This tool requires focus mode.",
  parameters: z.object({
    selector: z
      .string()
      .max(MAX_SELECTOR_LENGTH)
      .optional()
      .describe("CSS selector of element to highlight/focus on"),
    cropToElement: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Whether to crop the screenshot to the element region (plus padding)",
      ),
    padding: z
      .number()
      .min(0)
      .max(MAX_PADDING)
      .optional()
      .default(50)
      .describe("Padding around element in pixels when cropping (default: 50)"),
    sendToLLM: z
      .boolean()
      .nullable()
      .optional()
      .default(true)
      .describe(
        "Whether to send the screenshot to LLM for visual analysis. Defaults to true.",
      ),
  }),
  execute: async ({
    selector,
    cropToElement = false,
    padding = 50,
    sendToLLM = true,
  }) => {
    const mode = await getAutomationMode();
    console.log(
      "🔧 [captureScreenshotWithHighlight] Automation mode:",
      mode,
    );

    if (mode === "background") {
      throw new Error(
        "Screenshot capture is disabled in background mode. Please switch to focus mode to use visual tools.",
      );
    }

    const tab = await getActiveTab();

    if (!tab.id || !tab.windowId) {
      throw new Error("No active tab found");
    }

    // Delegate to shared helper for capture + element crop
    const capture = await captureVisibleTabWithElementCrop({
      tabId: tab.id,
      windowId: tab.windowId,
      tabUrl: tab.url,
      selector,
      cropToElement,
      padding,
    });

    let { dataUrl } = capture;

    // Get viewport dimensions (graceful degradation)
    let viewport: { width: number; height: number } | undefined;
    try {
      const viewportDimensions = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => ({
          width: window.innerWidth,
          height: window.innerHeight,
        }),
      });
      viewport = viewportDimensions[0]?.result ?? undefined;
    } catch (e) {
      console.warn(
        "[ScreenshotHighlight] Failed to get viewport dimensions:",
        e,
      );
    }

    if (sendToLLM) {
      // Compress for LLM
      dataUrl = await compressImage(dataUrl, 0.6, 1024);
    }

    // Extract image dimensions
    const finalImg = new Image();
    await new Promise<void>((resolve, reject) => {
      finalImg.onload = () => resolve();
      finalImg.onerror = () => reject(new Error("Failed to load image"));
      finalImg.src = dataUrl;
    });
    const imageWidth = finalImg.width;
    const imageHeight = finalImg.height;

    // Cache screenshot metadata for computer tool
    if (sendToLLM && viewport) {
      cacheScreenshotMetadata(
        tab.id,
        imageWidth,
        imageHeight,
        viewport.width,
        viewport.height,
      );
    }

    // Save screenshot to IndexedDB
    let screenshotUid: string | undefined;
    try {
      screenshotUid = await RuntimeScreenshotStorage.saveScreenshot(dataUrl, {
        tabId: tab.id,
        width: imageWidth,
        height: imageHeight,
        viewportWidth: viewport?.width ?? 0,
        viewportHeight: viewport?.height ?? 0,
      });
    } catch (err) {
      console.error(
        "[ScreenshotHighlight] Failed to save to IndexedDB:",
        err,
      );
    }

    if (sendToLLM) {
      return {
        success: true,
        imageData: dataUrl,
        sendToLLM: true,
        screenshotUid,
        tabId: tab.id,
        url: tab.url,
        title: tab.title,
        selector: selector ?? undefined,
        cropped: capture.cropped,
      };
    }

    return {
      success: true,
      captured: true,
      sendToLLM: false,
      screenshotUid,
      tabId: tab.id,
      url: tab.url,
      title: tab.title,
      selector: selector ?? undefined,
      cropped: capture.cropped,
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

// ===================== Clipboard image tools (P1) =====================

export const readClipboardImageTool = tool({
  name: "read_clipboard_image",
  description:
    "Read an image from the system clipboard and return it as a base64 data URL. " +
    "Useful for inspecting images the user has copied. Returns an error if no image is present.",
  parameters: z.object({}),
  execute: async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();

      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith("image/")) {
            const blob = await item.getType(type);

            // Convert blob to data URL
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () =>
                reject(new Error("Failed to read image data"));
              reader.readAsDataURL(blob);
            });

            return {
              success: true,
              imageData: dataUrl,
            };
          }
        }
      }

      return { success: false, error: "No image found in clipboard" };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to read clipboard: ${message}`,
      };
    }
  },
});

export const getClipboardImageInfoTool = tool({
  name: "get_clipboard_image_info",
  description:
    "Check whether the system clipboard contains an image, and if so return " +
    "its MIME type. Does NOT read the full image data.",
  parameters: z.object({}),
  execute: async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();

      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith("image/")) {
            return {
              success: true,
              hasImage: true,
              imageType: type,
            };
          }
        }
      }

      return { success: true, hasImage: false };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to read clipboard: ${message}`,
      };
    }
  },
});
