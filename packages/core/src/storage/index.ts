export type WatchCallback<T> = (change: { newValue?: T; oldValue?: T }) => void;

export interface KeyValueStorage<T> {
  save(key: string, data: T): Promise<void>;
  load(key: string): Promise<T | null>;
  delete(key: string): Promise<void>;
  listAll(): Promise<T[]>;
  query(predicate: (item: T) => boolean): Promise<T[]>;
  clear?(): Promise<void>;
  watch(key: string, callback: WatchCallback<T>): () => void;
}

export abstract class BaseKeyValueStorage<T> implements KeyValueStorage<T> {
  abstract save(key: string, data: T): Promise<void>;
  abstract load(key: string): Promise<T | null>;
  abstract delete(key: string): Promise<void>;
  abstract listAll(): Promise<T[]>;
  abstract watch(key: string, callback: WatchCallback<T>): () => void;

  async query(predicate: (item: T) => boolean): Promise<T[]> {
    const allItems = await this.listAll();
    return allItems.filter(predicate);
  }

  async clear?(): Promise<void> {
    const allItems = await this.listAll();
    for (const item of allItems) {
      const key = this.extractKey(item);
      if (key) {
        await this.delete(key);
      }
    }
  }

  protected abstract extractKey(item: T): string | undefined;
}
