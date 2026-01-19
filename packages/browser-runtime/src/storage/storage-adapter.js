import { safeJsonParse } from "@aipexstudio/aipex-core";
/**
 * ChromeStorageAdapter - Implements KeyValueStorage interface using Chrome Storage API
 *
 * Features:
 * - Full KeyValueStorage implementation (save/load/delete/listAll/query/clear)
 * - Real-time change watching (watch method)
 * - Automatic localStorage fallback for non-extension environments
 * - Backwards compatible get/set/remove aliases
 */
export class ChromeStorageAdapter {
    areaName;
    constructor(area = "local") {
        this.areaName = area;
    }
    get area() {
        if (typeof chrome !== "undefined" && chrome.storage?.[this.areaName]) {
            return chrome.storage[this.areaName];
        }
        return null;
    }
    async save(key, data) {
        const area = this.area;
        if (area) {
            await area.set({ [key]: data });
        }
        else {
            localStorage.setItem(key, JSON.stringify(data));
        }
    }
    async load(key) {
        const area = this.area;
        if (area) {
            const result = await area.get(key);
            return result[key] ?? null;
        }
        const parsed = safeJsonParse(localStorage.getItem(key));
        return parsed ?? null;
    }
    async delete(key) {
        const area = this.area;
        if (area) {
            await area.remove(key);
        }
        else {
            localStorage.removeItem(key);
        }
    }
    async listAll() {
        const area = this.area;
        if (area) {
            return new Promise((resolve) => {
                area.get(null, (items) => {
                    const values = Object.values(items ?? {});
                    resolve(values);
                });
            });
        }
        const values = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                try {
                    const value = safeJsonParse(localStorage.getItem(key));
                    if (value !== undefined) {
                        values.push(value);
                    }
                }
                catch {
                    // Skip non-JSON values
                }
            }
        }
        return values;
    }
    async query(predicate) {
        const allItems = await this.listAll();
        return allItems.filter(predicate);
    }
    async clear() {
        const area = this.area;
        if (area) {
            await area.clear();
        }
        else {
            localStorage.clear();
        }
    }
    /**
     * Watch for changes to a specific key
     * Returns an unwatch function to stop listening
     */
    watch(key, callback) {
        if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
            const listener = (changes, areaName) => {
                if (areaName === this.areaName && changes[key]) {
                    callback({
                        newValue: changes[key].newValue,
                        oldValue: changes[key].oldValue,
                    });
                }
            };
            chrome.storage.onChanged.addListener(listener);
            return () => chrome.storage.onChanged.removeListener(listener);
        }
        return () => { };
    }
    /**
     * Get all items as a key-value object
     */
    async getAll() {
        const area = this.area;
        if (area) {
            return new Promise((resolve) => {
                area.get(null, (items) => {
                    resolve((items ?? {}));
                });
            });
        }
        const result = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                try {
                    const value = safeJsonParse(localStorage.getItem(key));
                    if (value !== undefined) {
                        result[key] = value;
                    }
                }
                catch {
                    // Skip non-JSON values
                }
            }
        }
        return result;
    }
    // Backwards compatible aliases (deprecated, use save/load/delete instead)
    async get(key) {
        return this.load(key);
    }
    async set(key, value) {
        return this.save(key, value);
    }
    async remove(key) {
        return this.delete(key);
    }
}
export const chromeStorageAdapter = new ChromeStorageAdapter();
