/**
 * Screenshot Context Provider
 * Provides screenshot of the currently visible tab
 */

import type {
  Context,
  ContextProvider,
  ContextQuery,
} from "@aipexstudio/aipex-core";

export class ScreenshotProvider implements ContextProvider {
  id = "browser.screenshot";
  name = "Screenshot";
  description = "Captures screenshot of the currently visible browser tab";

  capabilities = {
    canList: true,
    canSearch: false,
    canWatch: false,
    types: ["screenshot" as const],
  };

  async getContexts(_query?: ContextQuery): Promise<Context[]> {
    const context = await this.captureScreenshot();
    return context ? [context] : [];
  }

  async getContext(id: string): Promise<Context | null> {
    if (id !== "screenshot") return null;
    return this.captureScreenshot();
  }

  private async captureScreenshot(): Promise<Context | null> {
    try {
      const dataUrl = await chrome.tabs.captureVisibleTab({
        format: "png",
      });

      return {
        id: "screenshot",
        type: "screenshot",
        providerId: this.id,
        label: "Current Screenshot",
        value: dataUrl,
        metadata: {
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("Failed to capture screenshot:", error);
      return null;
    }
  }
}
