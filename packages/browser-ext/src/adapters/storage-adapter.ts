import type { KeyValueStorage } from "@aipexstudio/aipex-core";

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
 * Simple Chrome Storage wrapper for non-core usage
 * This is a convenience wrapper for browser-ext specific storage needs
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
