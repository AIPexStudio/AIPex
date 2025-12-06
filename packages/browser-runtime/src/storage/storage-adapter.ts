import { type KeyValueStorage, safeJsonParse } from "@aipexstudio/aipex-core";

export type WatchCallback<T> = (change: { newValue?: T; oldValue?: T }) => void;

/**
 * ChromeStorageAdapter - Implements KeyValueStorage interface using Chrome Storage API
 *
 * Features:
 * - Full KeyValueStorage implementation (save/load/delete/listAll/query/clear)
 * - Real-time change watching (watch method)
 * - Automatic localStorage fallback for non-extension environments
 * - Backwards compatible get/set/remove aliases
 */
export class ChromeStorageAdapter<T = unknown> implements KeyValueStorage<T> {
  private readonly areaName: "local" | "sync";

  constructor(area: "local" | "sync" = "local") {
    this.areaName = area;
  }

  private get area(): chrome.storage.StorageArea | null {
    if (typeof chrome !== "undefined" && chrome.storage?.[this.areaName]) {
      return chrome.storage[this.areaName];
    }
    return null;
  }

  async save(key: string, data: T): Promise<void> {
    const area = this.area;
    if (area) {
      await area.set({ [key]: data });
    } else {
      localStorage.setItem(key, JSON.stringify(data));
    }
  }

  async load(key: string): Promise<T | null> {
    const area = this.area;
    if (area) {
      const result = await area.get(key);
      return (result[key] as T) ?? null;
    }
    const parsed = safeJsonParse<T>(localStorage.getItem(key));
    return parsed ?? null;
  }

  async delete(key: string): Promise<void> {
    const area = this.area;
    if (area) {
      await area.remove(key);
    } else {
      localStorage.removeItem(key);
    }
  }

  async listAll(): Promise<T[]> {
    const area = this.area;
    if (area) {
      return new Promise((resolve) => {
        area.get(null, (items) => {
          const values = Object.values(items ?? {}) as T[];
          resolve(values);
        });
      });
    }
    const values: T[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        try {
          const value = safeJsonParse<T>(localStorage.getItem(key));
          if (value !== undefined) {
            values.push(value);
          }
        } catch {
          // Skip non-JSON values
        }
      }
    }
    return values;
  }

  async query(predicate: (item: T) => boolean): Promise<T[]> {
    const allItems = await this.listAll();
    return allItems.filter(predicate);
  }

  async clear(): Promise<void> {
    const area = this.area;
    if (area) {
      await area.clear();
    } else {
      localStorage.clear();
    }
  }

  /**
   * Watch for changes to a specific key
   * Returns an unwatch function to stop listening
   */
  watch(key: string, callback: WatchCallback<T>): () => void {
    if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
      const listener = (
        changes: { [key: string]: chrome.storage.StorageChange },
        areaName: string,
      ) => {
        if (areaName === this.areaName && changes[key]) {
          callback({
            newValue: changes[key].newValue as T | undefined,
            oldValue: changes[key].oldValue as T | undefined,
          });
        }
      };

      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    }
    return () => {};
  }

  /**
   * Get all items as a key-value object
   */
  async getAll(): Promise<Record<string, T>> {
    const area = this.area;
    if (area) {
      return new Promise((resolve) => {
        area.get(null, (items) => {
          resolve((items ?? {}) as Record<string, T>);
        });
      });
    }
    const result: Record<string, T> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        try {
          const value = safeJsonParse<T>(localStorage.getItem(key));
          if (value !== undefined) {
            result[key] = value;
          }
        } catch {
          // Skip non-JSON values
        }
      }
    }
    return result;
  }

  // Backwards compatible aliases (deprecated, use save/load/delete instead)
  async get(key: string): Promise<T | null> {
    return this.load(key);
  }

  async set(key: string, value: T): Promise<void> {
    return this.save(key, value);
  }

  async remove(key: string): Promise<void> {
    return this.delete(key);
  }
}

export const chromeStorageAdapter = new ChromeStorageAdapter();
