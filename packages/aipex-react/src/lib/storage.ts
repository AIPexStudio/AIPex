/**
 * LocalStorage adapter implementing KeyValueStorage interface
 * Provides a simple browser localStorage backend for settings and data persistence
 */

import type { KeyValueStorage, WatchCallback } from "@aipexstudio/aipex-core";

export class LocalStorageKeyValueAdapter<T = unknown>
  implements KeyValueStorage<T>
{
  private watchers = new Map<string, Set<WatchCallback<T>>>();
  private storageListener: ((event: StorageEvent) => void) | null = null;

  constructor() {
    this.setupStorageListener();
  }

  private setupStorageListener(): void {
    if (typeof window === "undefined") return;

    this.storageListener = (event: StorageEvent) => {
      if (event.key && this.watchers.has(event.key)) {
        const callbacks = this.watchers.get(event.key);
        if (callbacks) {
          let newValue: T | undefined;
          let oldValue: T | undefined;

          try {
            newValue = event.newValue
              ? (JSON.parse(event.newValue) as T)
              : undefined;
          } catch {
            newValue = undefined;
          }

          try {
            oldValue = event.oldValue
              ? (JSON.parse(event.oldValue) as T)
              : undefined;
          } catch {
            oldValue = undefined;
          }

          for (const callback of callbacks) {
            callback({ newValue, oldValue });
          }
        }
      }
    };

    window.addEventListener("storage", this.storageListener);
  }

  async save(key: string, data: T): Promise<void> {
    if (typeof localStorage === "undefined") return;
    const oldValue = await this.load(key);
    localStorage.setItem(key, JSON.stringify(data));
    this.notifyWatchers(key, {
      newValue: data,
      oldValue: oldValue ?? undefined,
    });
  }

  private notifyWatchers(
    key: string,
    change: { newValue?: T; oldValue?: T },
  ): void {
    const callbacks = this.watchers.get(key);
    if (callbacks) {
      for (const callback of callbacks) {
        callback(change);
      }
    }
  }

  async load(key: string): Promise<T | null> {
    if (typeof localStorage === "undefined") return null;
    try {
      const value = localStorage.getItem(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    if (typeof localStorage === "undefined") return;
    const oldValue = await this.load(key);
    localStorage.removeItem(key);
    if (oldValue !== null) {
      this.notifyWatchers(key, { oldValue: oldValue ?? undefined });
    }
  }

  async listAll(): Promise<T[]> {
    if (typeof localStorage === "undefined") return [];
    const results: T[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            results.push(JSON.parse(value) as T);
          }
        } catch {
          // Skip non-JSON values
        }
      }
    }
    return results;
  }

  async query(predicate: (item: T) => boolean): Promise<T[]> {
    const allItems = await this.listAll();
    return allItems.filter(predicate);
  }

  async clear(): Promise<void> {
    if (typeof localStorage === "undefined") return;
    localStorage.clear();
  }

  watch(key: string, callback: WatchCallback<T>): () => void {
    let callbacks = this.watchers.get(key);
    if (!callbacks) {
      callbacks = new Set();
      this.watchers.set(key, callbacks);
    }
    callbacks.add(callback);

    return () => {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.watchers.delete(key);
      }
    };
  }
}

export const localStorageKeyValueAdapter = new LocalStorageKeyValueAdapter();
