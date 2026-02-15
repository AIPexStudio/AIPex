/**
 * Element Capture Service
 *
 * Common element capture logic extracted from use-case
 * Provides reusable API for:
 * - Listening for user clicks on elements
 * - Collecting element metadata
 * - Generating selectors
 * - Screenshot functionality
 */

import { captureVisibleTabWithElementCrop } from "../tools/screenshot-helpers.js";
import type { ElementCaptureEvent, ElementCaptureOptions } from "./types.js";

type CaptureCallback = (event: ElementCaptureEvent) => void;

export class ElementCaptureService {
  private static instance: ElementCaptureService | null = null;
  private isCapturing = false;
  private currentTabId: number | null = null;
  private captureCallback: CaptureCallback | null = null;
  private messageListener:
    | ((message: unknown, sender: chrome.runtime.MessageSender) => void)
    | null = null;
  private lastCaptureTimestamp = 0;

  private constructor() {}

  static getInstance(): ElementCaptureService {
    if (!ElementCaptureService.instance) {
      ElementCaptureService.instance = new ElementCaptureService();
    }
    return ElementCaptureService.instance;
  }

  /**
   * Start capturing elements
   */
  async startCapture(
    options: ElementCaptureOptions,
    callback: CaptureCallback,
  ): Promise<void> {
    if (this.isCapturing) {
      throw new Error("Capture already in progress");
    }

    console.log(
      "[ElementCaptureService] Starting capture for tab:",
      options.tabId,
    );

    // Check if tab is valid
    try {
      const tab = await chrome.tabs.get(options.tabId);
      if (!tab || !tab.url) {
        throw new Error("Invalid tab");
      }

      // Check if it's a restricted page (chrome://, etc.)
      if (
        tab.url.startsWith("chrome://") ||
        tab.url.startsWith("chrome-extension://") ||
        tab.url.startsWith("edge://") ||
        tab.url.startsWith("about:")
      ) {
        throw new Error(
          "Cannot capture on browser internal pages. Please navigate to a regular webpage.",
        );
      }
    } catch (error) {
      throw new Error(
        "Invalid tab: " +
          (error instanceof Error ? error.message : String(error)),
      );
    }

    this.isCapturing = true;
    this.currentTabId = options.tabId;
    this.captureCallback = callback;
    this.lastCaptureTimestamp = 0;

    // Set up message listener
    this.setupMessageListener();

    // Send message to content script to start capture
    try {
      // Try sending message first
      await chrome.tabs.sendMessage(options.tabId, {
        request: "start-capture",
      });
      console.log("✅ [ElementCaptureService] Capture started successfully");
    } catch (error) {
      console.error(
        "❌ [ElementCaptureService] Failed to start capture:",
        error,
      );

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // If content script is not loaded, provide helpful error
      if (errorMessage.includes("Receiving end does not exist")) {
        this.stopCapture();
        throw new Error(
          "Cannot connect to page. The page content script is not loaded. Please refresh the page and try again, or navigate to the page first.",
        );
      }

      this.stopCapture();
      throw new Error(`Failed to start capture: ${errorMessage}`);
    }
  }

  /**
   * Stop capturing elements
   */
  async stopCapture(): Promise<void> {
    if (!this.isCapturing) {
      return;
    }

    console.log("[ElementCaptureService] Stopping capture");

    this.isCapturing = false;

    // Send message to content script to stop capture
    if (this.currentTabId) {
      try {
        await chrome.tabs.sendMessage(this.currentTabId, {
          request: "stop-capture",
        });
        console.log("✅ [ElementCaptureService] Capture stopped successfully");
      } catch (error) {
        console.warn(
          "⚠️ [ElementCaptureService] Failed to stop capture:",
          error,
        );
      }
    }

    // Cleanup
    this.cleanup();
  }

  /**
   * Set up message listener
   */
  private setupMessageListener(): void {
    // Remove old listener if any
    if (this.messageListener) {
      chrome.runtime.onMessage.removeListener(this.messageListener);
    }

    // Create new listener
    this.messageListener = (
      message: unknown,
      _sender: chrome.runtime.MessageSender,
    ) => {
      if (
        typeof message === "object" &&
        message !== null &&
        "request" in message &&
        message.request === "capture-click-event" &&
        "data" in message
      ) {
        this.handleCaptureEvent((message as { data: unknown }).data);
      }
    };

    // Add listener
    chrome.runtime.onMessage.addListener(this.messageListener);
  }

  /**
   * Handle capture event
   */
  private handleCaptureEvent(data: unknown): void {
    if (!this.isCapturing || !this.captureCallback) {
      return;
    }

    // Type guard for data
    if (typeof data !== "object" || data === null) {
      return;
    }

    const eventData = data as {
      timestamp?: number;
      url?: string;
      tagName?: string;
      selector?: string;
      id?: string;
      classes?: string[];
      textContent?: string;
      attributes?: Record<string, string>;
      rect?: { x: number; y: number; width: number; height: number };
    };

    // Prevent duplicates: if timestamps are same or very close (within 50ms), skip
    if (
      eventData.timestamp &&
      Math.abs(eventData.timestamp - this.lastCaptureTimestamp) < 50
    ) {
      console.log("🚫 [ElementCaptureService] Duplicate event ignored");
      return;
    }
    if (eventData.timestamp) {
      this.lastCaptureTimestamp = eventData.timestamp;
    }

    console.log(
      "🎯 [ElementCaptureService] Captured:",
      eventData.tagName,
      eventData.selector,
    );

    // Convert to standard format
    const event: ElementCaptureEvent = {
      timestamp: eventData.timestamp || Date.now(),
      url: eventData.url || "",
      title: "", // Can get from tab if needed
      tagName: eventData.tagName || "",
      selector: eventData.selector || "",
      id: eventData.id || undefined,
      classes: eventData.classes || [],
      text: eventData.textContent || undefined,
      attributes: eventData.attributes || {},
      rect: eventData.rect,
    };

    // Call callback
    this.captureCallback(event);
  }

  /**
   * Capture screenshot functionality (with highlight / element crop).
   *
   * Delegates to the shared `captureVisibleTabWithElementCrop` helper so that
   * the element-rect resolution, DPR scaling, crop, and restricted-page
   * checks are consistent with `captureScreenshotWithHighlightTool`.
   *
   * Falls back to a full-page screenshot if the selector cannot be resolved.
   */
  async captureScreenshot(
    selector: string,
    options?: {
      cropToElement?: boolean;
      padding?: number;
    },
  ): Promise<string | null> {
    try {
      if (!this.currentTabId) {
        console.warn("⚠️ [ElementCaptureService] No current tab for screenshot");
        return null;
      }

      const tab = await chrome.tabs.get(this.currentTabId);
      if (!tab.windowId) {
        console.warn("⚠️ [ElementCaptureService] No window ID for tab");
        return null;
      }

      const result = await captureVisibleTabWithElementCrop({
        tabId: this.currentTabId,
        windowId: tab.windowId,
        tabUrl: tab.url,
        selector,
        cropToElement: options?.cropToElement ?? true,
        padding: options?.padding ?? 50,
      });

      return result.dataUrl;
    } catch (error) {
      console.error("❌ [ElementCaptureService] Screenshot error:", error);
      return null;
    }
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.messageListener) {
      chrome.runtime.onMessage.removeListener(this.messageListener);
      this.messageListener = null;
    }

    this.currentTabId = null;
    this.captureCallback = null;
    this.lastCaptureTimestamp = 0;
  }

  /**
   * Check if capture is active
   */
  isActive(): boolean {
    return this.isCapturing;
  }

  /**
   * Get current capturing tab ID
   */
  getCurrentTabId(): number | null {
    return this.currentTabId;
  }
}

// Export singleton instance
export const elementCaptureService = ElementCaptureService.getInstance();
