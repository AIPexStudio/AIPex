/**
 * Screenshot Context Provider
 * Provides screenshot of the currently visible tab
 */
export class ScreenshotProvider {
  id = "browser.screenshot";
  name = "Screenshot";
  description = "Captures screenshot of the currently visible browser tab";
  capabilities = {
    canList: true,
    canSearch: false,
    canWatch: false,
    types: ["screenshot"],
  };
  async getContexts(_query) {
    const context = await this.captureScreenshot();
    return context ? [context] : [];
  }
  async getContext(id) {
    if (id !== "screenshot") return null;
    return this.captureScreenshot();
  }
  async captureScreenshot() {
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
