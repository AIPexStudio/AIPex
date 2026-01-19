import { type KeyValueStorage } from "@aipexstudio/aipex-core";
export type WatchCallback<T> = (change: {
    newValue?: T;
    oldValue?: T;
}) => void;
/**
 * ChromeStorageAdapter - Implements KeyValueStorage interface using Chrome Storage API
 *
 * Features:
 * - Full KeyValueStorage implementation (save/load/delete/listAll/query/clear)
 * - Real-time change watching (watch method)
 * - Automatic localStorage fallback for non-extension environments
 * - Backwards compatible get/set/remove aliases
 */
export declare class ChromeStorageAdapter<T = unknown> implements KeyValueStorage<T> {
    private readonly areaName;
    constructor(area?: "local" | "sync");
    private get area();
    save(key: string, data: T): Promise<void>;
    load(key: string): Promise<T | null>;
    delete(key: string): Promise<void>;
    listAll(): Promise<T[]>;
    query(predicate: (item: T) => boolean): Promise<T[]>;
    clear(): Promise<void>;
    /**
     * Watch for changes to a specific key
     * Returns an unwatch function to stop listening
     */
    watch(key: string, callback: WatchCallback<T>): () => void;
    /**
     * Get all items as a key-value object
     */
    getAll(): Promise<Record<string, T>>;
    get(key: string): Promise<T | null>;
    set(key: string, value: T): Promise<void>;
    remove(key: string): Promise<void>;
}
export declare const chromeStorageAdapter: ChromeStorageAdapter<unknown>;
