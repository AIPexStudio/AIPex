import { BaseKeyValueStorage } from "./index.js";

export class InMemoryStorage<T> extends BaseKeyValueStorage<T> {
  private store = new Map<string, T>();

  async save(key: string, data: T): Promise<void> {
    this.store.set(key, data);
  }

  async load(key: string): Promise<T | null> {
    return this.store.get(key) ?? null;
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async listAll(): Promise<T[]> {
    return Array.from(this.store.values());
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
