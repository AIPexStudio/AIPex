import { BaseKeyValueStorage } from "./index.js";

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

export class IndexedDBStorage<
  T extends { id: string },
> extends BaseKeyValueStorage<T> {
  private readonly config: Required<IndexedDBConfig>;
  private db: IDBDatabase | null = null;

  constructor(config: IndexedDBConfig) {
    super();
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
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.config.storeName], "readwrite");
      const store = transaction.objectStore(this.config.storeName);
      const request = store.put({ ...data, id: key });

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error(`Failed to save: ${request.error}`));
    });
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
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.config.storeName], "readwrite");
      const store = transaction.objectStore(this.config.storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error(`Failed to delete: ${request.error}`));
    });
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

  override async clear(): Promise<void> {
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

  protected extractKey(item: T): string | undefined {
    return item.id;
  }
}
