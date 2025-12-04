import { BaseKeyValueStorage, type WatchCallback } from "./index.js";

export class InMemoryStorage<T> extends BaseKeyValueStorage<T> {
  private store = new Map<string, T>();
  private watchers = new Map<string, Set<WatchCallback<T>>>();

  async save(key: string, data: T): Promise<void> {
    const oldValue = this.store.get(key);
    this.store.set(key, data);
    this.notifyWatchers(key, { newValue: data, oldValue });
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
    return this.store.get(key) ?? null;
  }

  async delete(key: string): Promise<void> {
    const oldValue = this.store.get(key);
    this.store.delete(key);
    if (oldValue !== undefined) {
      this.notifyWatchers(key, { oldValue });
    }
  }

  async listAll(): Promise<T[]> {
    return Array.from(this.store.values());
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

  override async clear(): Promise<void> {
    this.store.clear();
  }

  protected extractKey(item: T): string | undefined {
    if (item && typeof item === "object" && "id" in item) {
      const id = (item as { id: unknown }).id;
      return typeof id === "string" ? id : undefined;
    }
    return undefined;
  }
}
