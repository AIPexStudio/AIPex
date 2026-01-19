/**
 * Browser Storage Implementations
 * Provides storage adapters for browser extensions
 */
export { type IndexedDBConfig, IndexedDBStorage } from "./indexeddb-storage.js";
export { ChromeStorageAdapter, chromeStorageAdapter, type WatchCallback, } from "./storage-adapter.js";
