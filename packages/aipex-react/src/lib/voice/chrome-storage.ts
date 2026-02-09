/**
 * Chrome Storage adapter for voice mode
 * Uses native Chrome Storage API for extension context
 */

import { useState, useEffect, useRef } from "react";

/**
 * Chrome Storage class for direct Chrome extension storage access
 */
export class ChromeStorage {
  private area: chrome.storage.StorageArea;

  constructor(area: "local" | "sync" = "local") {
    this.area = chrome.storage[area];
  }

  /**
   * Get a value from storage
   */
  async get<T = unknown>(key: string): Promise<T | undefined> {
    const result = await this.area.get(key);
    return result[key] as T | undefined;
  }

  /**
   * Set a value in storage
   */
  async set(key: string, value: unknown): Promise<void> {
    await this.area.set({ [key]: value });
  }

  /**
   * Remove a value from storage
   */
  async remove(key: string): Promise<void> {
    await this.area.remove(key);
  }

  /**
   * Clear all storage
   */
  async clear(): Promise<void> {
    await this.area.clear();
  }

  /**
   * Get all keys from storage
   */
  async getAll(): Promise<Record<string, unknown>> {
    return new Promise((resolve) => {
      this.area.get(null, (items) => {
        resolve(items || {});
      });
    });
  }

  /**
   * Watch for changes to a specific key
   */
  watch<T = unknown>(
    key: string,
    callback: (change: { newValue?: T; oldValue?: T }) => void,
  ): () => void {
    const listener = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName === "local" && changes[key]) {
        callback({
          newValue: changes[key].newValue as T | undefined,
          oldValue: changes[key].oldValue as T | undefined,
        });
      }
    };

    chrome.storage.onChanged.addListener(listener);

    // Return unsubscribe function
    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }
}

/**
 * React hook for Chrome extension storage
 * Returns [value, setValue, isLoading]
 */
export function useChromeStorage<T = unknown>(
  key: string,
  defaultValue?: T,
): [T | undefined, (value: T) => Promise<void>, boolean] {
  const [value, setValue] = useState<T | undefined>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const defaultValueRef = useRef(defaultValue);

  useEffect(() => {
    const storage = new ChromeStorage();

    // Load initial value
    storage.get<T>(key).then((storedValue) => {
      setValue(storedValue ?? defaultValueRef.current);
      setIsLoading(false);
    });

    // Watch for changes
    const unwatch = storage.watch<T>(key, ({ newValue }) => {
      setValue(newValue ?? defaultValueRef.current);
    });

    return unwatch;
  }, [key]);

  const setStoredValue = async (newValue: T) => {
    const storage = new ChromeStorage();
    await storage.set(key, newValue);
    setValue(newValue);
  };

  return [value, setStoredValue, isLoading];
}
