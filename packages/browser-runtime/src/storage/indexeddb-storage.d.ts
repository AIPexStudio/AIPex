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
export declare class IndexedDBStorage<T extends {
    id: string;
}> implements KeyValueStorage<T> {
    private readonly config;
    private db;
    private watchers;
    constructor(config: IndexedDBConfig);
    private openDB;
    save(key: string, data: T): Promise<void>;
    private notifyWatchers;
    load(key: string): Promise<T | null>;
    delete(key: string): Promise<void>;
    watch(key: string, callback: WatchCallback<T>): () => void;
    listAll(): Promise<T[]>;
    query(predicate: (item: T) => boolean): Promise<T[]>;
    clear(): Promise<void>;
    close(): Promise<void>;
}
