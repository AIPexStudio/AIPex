import type { KeyValueStorage } from "@aipexstudio/aipex-core";
import type { StorageAdapter } from "../types/adapter";

/**
 * ChromeStorageAdapter - Implements KeyValueStorage interface using Chrome Storage API
 *
 * This adapter allows the core package to work with Chrome's storage
 * without having any browser-specific dependencies.
 */
export class ChromeStorageAdapter<T> implements KeyValueStorage<T> {
  private area: chrome.storage.StorageArea;

  constructor(area: "local" | "sync" = "local") {
    this.area = chrome.storage[area];
  }

  async save(key: string, data: T): Promise<void> {
    await this.area.set({ [key]: data });
  }

  async load(key: string): Promise<T | null> {
    const result = await this.area.get(key);
    return (result[key] as T) ?? null;
  }

  async delete(key: string): Promise<void> {
    await this.area.remove(key);
  }

  async listAll(): Promise<T[]> {
    return new Promise((resolve) => {
      this.area.get(null, (items) => {
        const values = Object.values(items ?? {}) as T[];
        resolve(values);
      });
    });
  }

  async query(predicate: (item: T) => boolean): Promise<T[]> {
    const allItems = await this.listAll();
    return allItems.filter(predicate);
  }

  async clear(): Promise<void> {
    await this.area.clear();
  }
}

/**
 * Create a StorageAdapter implementation for Chrome extension storage
 * This implements the StorageAdapter interface used by hooks
 */
export function createChromeStorageAdapter(
  area: "local" | "sync" = "local",
): StorageAdapter {
  return {
    async get<T>(key: string): Promise<T | undefined> {
      return new Promise((resolve) => {
        if (typeof chrome !== "undefined" && chrome.storage?.[area]) {
          chrome.storage[area].get(key, (result) => {
            resolve((result[key] as T | undefined) ?? undefined);
          });
        } else {
          // Fallback to localStorage in non-extension environments
          try {
            const value = localStorage.getItem(key);
            resolve(value ? (JSON.parse(value) as T) : undefined);
          } catch {
            resolve(undefined);
          }
        }
      });
    },
    async set<T>(key: string, value: T): Promise<void> {
      return new Promise((resolve) => {
        if (typeof chrome !== "undefined" && chrome.storage?.[area]) {
          chrome.storage[area].set({ [key]: value }, () => resolve());
        } else {
          // Fallback to localStorage
          localStorage.setItem(key, JSON.stringify(value));
          resolve();
        }
      });
    },
    async remove(key: string): Promise<void> {
      return new Promise((resolve) => {
        if (typeof chrome !== "undefined" && chrome.storage?.[area]) {
          chrome.storage[area].remove(key, () => resolve());
        } else {
          // Fallback to localStorage
          localStorage.removeItem(key);
          resolve();
        }
      });
    },
    async clear(): Promise<void> {
      return new Promise((resolve) => {
        if (typeof chrome !== "undefined" && chrome.storage?.[area]) {
          chrome.storage[area].clear(() => resolve());
        } else {
          // Fallback to localStorage
          localStorage.clear();
          resolve();
        }
      });
    },
  };
}

/**
 * Storage - A feature-rich Chrome Storage wrapper
 *
 * This class provides additional features beyond the StorageAdapter interface:
 * - Real-time change watching (watch method)
 * - Batch operations (getAll)
 * - Direct Chrome Storage API access
 *
 * Use this class when you need:
 * 1. To watch for storage changes in real-time
 * 2. Browser-extension specific storage needs
 * 3. More direct control over Chrome Storage API
 *
 * Use StorageAdapter (createChromeStorageAdapter) when:
 * 1. You need a simple get/set/remove interface
 * 2. You want consistent interface for testing
 * 3. You're working with hook-based configuration (like useChatConfig)
 */
export class Storage {
  private area: chrome.storage.StorageArea;

  constructor(area: "local" | "sync" = "local") {
    this.area = chrome.storage[area];
  }

  async get<T = any>(key: string): Promise<T | undefined> {
    const result = await this.area.get(key);
    return result[key] as T | undefined;
  }

  async set(key: string, value: any): Promise<void> {
    await this.area.set({ [key]: value });
  }

  async remove(key: string): Promise<void> {
    await this.area.remove(key);
  }

  async clear(): Promise<void> {
    await this.area.clear();
  }

  async getAll(): Promise<{ [key: string]: any }> {
    return new Promise((resolve) => {
      this.area.get(null, (items) => {
        resolve(items ?? {});
      });
    });
  }

  /**
   * Watch for changes to a specific key
   * Returns an unwatch function to stop listening
   */
  watch<T = any>(
    key: string,
    callback: (change: { newValue?: T; oldValue?: T }) => void,
  ): () => void {
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string,
    ) => {
      if (areaName === "local" && changes[key]) {
        callback({
          newValue: changes[key].newValue as T | undefined,
          oldValue: changes[key].oldValue as T | undefined,
        });
      }
    };

    chrome.storage.onChanged.addListener(listener);

    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }
}
