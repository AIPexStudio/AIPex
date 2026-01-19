/**
 * Tabs Context Provider
 * Provides contexts from all open browser tabs
 */
export class TabsProvider {
    id = "browser.tabs";
    name = "Open Tabs";
    description = "Provides contexts from all open browser tabs";
    capabilities = {
        canList: true,
        canSearch: true,
        canWatch: true,
        types: ["tab"],
    };
    async getContexts(query) {
        try {
            const tabs = await chrome.tabs.query({});
            let contexts = tabs
                .filter((tab) => tab.id && tab.title)
                .map((tab) => ({
                id: `tab-${tab.id}`,
                type: "tab",
                providerId: this.id,
                label: tab.title ?? "Untitled",
                value: tab.url ?? "",
                metadata: {
                    tabId: tab.id,
                    url: tab.url,
                    title: tab.title,
                    favIconUrl: tab.favIconUrl,
                },
                timestamp: Date.now(),
            }));
            // Apply search filter
            if (query?.search) {
                const searchLower = query.search.toLowerCase();
                contexts = contexts.filter((ctx) => ctx.label.toLowerCase().includes(searchLower) ||
                    ctx.value.toLowerCase().includes(searchLower));
            }
            // Apply limit
            if (query?.limit && query.limit > 0) {
                contexts = contexts.slice(0, query.limit);
            }
            return contexts;
        }
        catch (error) {
            console.error("Failed to get tabs context:", error);
            return [];
        }
    }
    async getContext(id) {
        if (!id.startsWith("tab-"))
            return null;
        const tabId = parseInt(id.replace("tab-", ""), 10);
        if (Number.isNaN(tabId))
            return null;
        try {
            const tab = await chrome.tabs.get(tabId);
            if (!tab || !tab.id)
                return null;
            return {
                id: `tab-${tab.id}`,
                type: "tab",
                providerId: this.id,
                label: tab.title ?? "Untitled",
                value: tab.url ?? "",
                metadata: {
                    tabId: tab.id,
                    url: tab.url,
                    title: tab.title,
                    favIconUrl: tab.favIconUrl,
                },
                timestamp: Date.now(),
            };
        }
        catch (error) {
            console.error(`Failed to get tab ${tabId}:`, error);
            return null;
        }
    }
    watch(callback) {
        const handleChange = () => {
            void this.getContexts().then(callback);
        };
        chrome.tabs.onCreated.addListener(handleChange);
        chrome.tabs.onRemoved.addListener(handleChange);
        chrome.tabs.onUpdated.addListener(handleChange);
        return () => {
            chrome.tabs.onCreated.removeListener(handleChange);
            chrome.tabs.onRemoved.removeListener(handleChange);
            chrome.tabs.onUpdated.removeListener(handleChange);
        };
    }
}
