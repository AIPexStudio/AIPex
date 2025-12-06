import type { KeyValueStorage, WatchCallback } from "@aipexstudio/aipex-core";

export interface IndexedDBConfig {
  dbName: string;
  storeName: string;
  version?: number;
  indexes?: Array<{
    name: string;
    keyPath: string | string[];
    unique?: boolean;
  }>;
}

export class IndexedDBStorage<T extends { id: string }>
  implements KeyValueStorage<T>
{
  private readonly config: Required<IndexedDBConfig>;
  private db: IDBDatabase | null = null;
  private watchers = new Map<string, Set<WatchCallback<T>>>();

  constructor(config: IndexedDBConfig) {
    this.config = {
      version: 1,
      indexes: [],
      ...config,
    };

    if (typeof indexedDB === "undefined") {
      throw new Error("IndexedDB is not available in this environment");
    }
  }

  private async openDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, this.config.version);

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(this.config.storeName)) {
          const objectStore = db.createObjectStore(this.config.storeName, {
            keyPath: "id",
          });

          for (const index of this.config.indexes) {
            objectStore.createIndex(index.name, index.keyPath, {
              unique: index.unique ?? false,
            });
          }
        }
      };
    });
  }

  async save(key: string, data: T): Promise<void> {
    const oldValue = await this.load(key);
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.config.storeName], "readwrite");
      const store = transaction.objectStore(this.config.storeName);
      const request = store.put({ ...data, id: key });

      request.onsuccess = () => {
        this.notifyWatchers(key, {
          newValue: data,
          oldValue: oldValue ?? undefined,
        });
        resolve();
      };
      request.onerror = () =>
        reject(new Error(`Failed to save: ${request.error}`));
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
    const db = await this.openDB();

    return new Promise((resolve) => {
      const transaction = db.transaction([this.config.storeName], "readonly");
      const store = transaction.objectStore(this.config.storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result ?? null);
      };

      request.onerror = () => {
        console.error(`Failed to load: ${request.error}`);
        resolve(null);
      };
    });
  }

  async delete(key: string): Promise<void> {
    const oldValue = await this.load(key);
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.config.storeName], "readwrite");
      const store = transaction.objectStore(this.config.storeName);
      const request = store.delete(key);

      request.onsuccess = () => {
        if (oldValue) {
          this.notifyWatchers(key, { oldValue });
        }
        resolve();
      };
      request.onerror = () =>
        reject(new Error(`Failed to delete: ${request.error}`));
    });
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

  async listAll(): Promise<T[]> {
    const db = await this.openDB();

    return new Promise((resolve) => {
      const transaction = db.transaction([this.config.storeName], "readonly");
      const store = transaction.objectStore(this.config.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result ?? []);
      };

      request.onerror = () => {
        console.error(`Failed to list all: ${request.error}`);
        resolve([]);
      };
    });
  }

  async query(predicate: (item: T) => boolean): Promise<T[]> {
    const allItems = await this.listAll();
    return allItems.filter(predicate);
  }

  async clear(): Promise<void> {
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.config.storeName], "readwrite");
      const store = transaction.objectStore(this.config.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error(`Failed to clear: ${request.error}`));
    });
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
