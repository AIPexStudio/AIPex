/**
 * Bookmarks Context Provider
 * Provides contexts from browser bookmarks
 */
export class BookmarksProvider {
    id = "browser.bookmarks";
    name = "Bookmarks";
    description = "Provides contexts from browser bookmarks";
    capabilities = {
        canList: true,
        canSearch: true,
        canWatch: false,
        types: ["bookmark"],
    };
    async getContexts(query) {
        try {
            const tree = await chrome.bookmarks.getTree();
            const bookmarks = [];
            this.traverseBookmarks(tree, bookmarks);
            let filtered = bookmarks;
            // Apply search filter
            if (query?.search) {
                const searchLower = query.search.toLowerCase();
                filtered = filtered.filter((ctx) => ctx.label.toLowerCase().includes(searchLower) ||
                    (typeof ctx.value === "string" &&
                        ctx.value.toLowerCase().includes(searchLower)));
            }
            // Apply limit (default to 50)
            const limit = query?.limit ?? 50;
            filtered = filtered.slice(0, limit);
            return filtered;
        }
        catch (error) {
            console.error("Failed to get bookmarks context:", error);
            return [];
        }
    }
    async getContext(id) {
        if (!id.startsWith("bookmark-"))
            return null;
        const bookmarkId = id.replace("bookmark-", "");
        try {
            const [bookmark] = await chrome.bookmarks.get(bookmarkId);
            if (!bookmark || !bookmark.url)
                return null;
            return {
                id: `bookmark-${bookmark.id}`,
                type: "bookmark",
                providerId: this.id,
                label: bookmark.title ?? "Untitled",
                value: bookmark.url,
                metadata: {
                    url: bookmark.url,
                    title: bookmark.title,
                },
                timestamp: Date.now(),
            };
        }
        catch (error) {
            console.error(`Failed to get bookmark ${bookmarkId}:`, error);
            return null;
        }
    }
    traverseBookmarks(nodes, bookmarks) {
        for (const node of nodes) {
            if (node.url) {
                bookmarks.push({
                    id: `bookmark-${node.id}`,
                    type: "bookmark",
                    providerId: this.id,
                    label: node.title ?? "Untitled",
                    value: node.url,
                    metadata: {
                        url: node.url,
                        title: node.title,
                    },
                    timestamp: Date.now(),
                });
            }
            if (node.children) {
                this.traverseBookmarks(node.children, bookmarks);
            }
        }
    }
}
