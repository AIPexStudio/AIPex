/**
 * Current Page Context Provider
 * Provides context from the currently active browser tab
 */
export class CurrentPageProvider {
  id = "browser.current-page";
  name = "Current Page";
  description = "Provides content from the currently active browser tab";
  capabilities = {
    canList: true,
    canSearch: false,
    canWatch: true,
    types: ["page"],
  };
  async getContexts(_query) {
    const context = await this.getCurrentPage();
    return context ? [context] : [];
  }
  async getContext(id) {
    if (!id.startsWith("page-")) return null;
    return this.getCurrentPage();
  }
  watch(callback) {
    const handleChange = () => {
      void this.getContexts().then(callback);
    };
    chrome.tabs.onActivated.addListener(handleChange);
    chrome.tabs.onUpdated.addListener(handleChange);
    return () => {
      chrome.tabs.onActivated.removeListener(handleChange);
      chrome.tabs.onUpdated.removeListener(handleChange);
    };
  }
  async getCurrentPage() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab || !tab.id) return null;
      let content = "";
      try {
        const result = await chrome.tabs.sendMessage(tab.id, {
          action: "getPageContent",
        });
        content = result?.content ?? "";
      } catch {
        content = `URL: ${tab.url}\nTitle: ${tab.title}`;
      }
      return {
        id: `page-${tab.id}`,
        type: "page",
        providerId: this.id,
        label: tab.title ?? "Current Page",
        value: content,
        metadata: {
          tabId: tab.id,
          url: tab.url,
          title: tab.title,
        },
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("Failed to get current page context:", error);
      return null;
    }
  }
}
