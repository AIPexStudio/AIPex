import { Session } from "./session.js";
import type { SessionSummary, StorageAdapter } from "./storage.js";

/**
 * IndexedDB adapter for session persistence
 * Works in browser environments, supports larger data sizes
 */
export class IndexedDBAdapter implements StorageAdapter {
  private readonly dbName: string;
  private readonly storeName = "sessions";
  private readonly version = 1;
  private db: IDBDatabase | null = null;

  constructor(dbName = "aipex_sessions") {
    this.dbName = dbName;

    if (typeof indexedDB === "undefined") {
      throw new Error("IndexedDB is not available in this environment");
    }
  }

  private async openDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, {
            keyPath: "id",
          });

          // Create indexes
          objectStore.createIndex("lastActiveAt", "metadata.lastActiveAt", {
            unique: false,
          });
          objectStore.createIndex("createdAt", "metadata.createdAt", {
            unique: false,
          });
        }
      };
    });
  }

  async save(session: Session): Promise<void> {
    const db = await this.openDB();
    const serialized = session.toJSON();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.put(serialized);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error(`Failed to save session: ${request.error}`));
    });
  }

  async load(id: string): Promise<Session | null> {
    const db = await this.openDB();

    return new Promise((resolve, _reject) => {
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        if (request.result) {
          try {
            const session = Session.fromJSON(request.result);
            resolve(session);
          } catch (error) {
            console.error(`Failed to deserialize session: ${error}`);
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error(`Failed to load session: ${request.error}`);
        resolve(null);
      };
    });
  }

  async delete(id: string): Promise<void> {
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error(`Failed to delete session: ${request.error}`));
    });
  }

  async listAll(): Promise<SessionSummary[]> {
    const db = await this.openDB();

    return new Promise((resolve, _reject) => {
      const transaction = db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const summaries: SessionSummary[] = [];

        for (const data of request.result) {
          try {
            const session = Session.fromJSON(data);
            const stats = session.getStats();
            summaries.push({
              id: session.id,
              turnCount: stats.totalTurns,
              createdAt: stats.createdAt,
              lastActiveAt: stats.lastActiveAt,
            });
          } catch (error) {
            console.error(`Failed to deserialize session: ${error}`);
          }
        }

        resolve(summaries);
      };

      request.onerror = () => {
        console.error(`Failed to list sessions: ${request.error}`);
        resolve([]);
      };
    });
  }

  async clear(): Promise<void> {
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error(`Failed to clear sessions: ${request.error}`));
    });
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
