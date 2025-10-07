/**
 * Storage utility - A drop-in replacement for @plasmohq/storage
 * Uses native Chrome Storage API
 */

export class Storage {
  private area: chrome.storage.StorageArea

  constructor(area: 'local' | 'sync' = 'local') {
    this.area = chrome.storage[area]
  }

  /**
   * Get a value from storage
   */
  async get<T = any>(key: string): Promise<T | undefined> {
    const result = await this.area.get(key)
    return result[key] as T | undefined
  }

  /**
   * Set a value in storage
   */
  async set(key: string, value: any): Promise<void> {
    await this.area.set({ [key]: value })
  }

  /**
   * Remove a value from storage
   */
  async remove(key: string): Promise<void> {
    await this.area.remove(key)
  }

  /**
   * Clear all storage
   */
  async clear(): Promise<void> {
    await this.area.clear()
  }

  /**
   * Get all keys from storage
   */
  async getAll(): Promise<{ [key: string]: any }> {
    return new Promise((resolve) => {
      this.area.get(null, (items) => {
        resolve(items || {})
      })
    })
  }

  /**
   * Watch for changes to a specific key
   */
  watch<T = any>(
    key: string,
    callback: (change: { newValue?: T; oldValue?: T }) => void
  ): () => void {
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'local' && changes[key]) {
        callback({
          newValue: changes[key].newValue,
          oldValue: changes[key].oldValue,
        })
      }
    }

    chrome.storage.onChanged.addListener(listener)

    // Return unsubscribe function
    return () => {
      chrome.storage.onChanged.removeListener(listener)
    }
  }
}

/**
 * React hook for storage (similar to @plasmohq/storage/hook)
 */
import { useState, useEffect } from 'react'

export function useStorage<T = any>(
  key: string,
  defaultValue?: T
): [T | undefined, (value: T) => Promise<void>, boolean] {
  const [value, setValue] = useState<T | undefined>(defaultValue)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storage = new Storage()

    // Load initial value
    storage.get<T>(key).then((storedValue) => {
      setValue(storedValue ?? defaultValue)
      setIsLoading(false)
    })

    // Watch for changes
    const unwatch = storage.watch<T>(key, ({ newValue }) => {
      setValue(newValue ?? defaultValue)
    })

    return unwatch
  }, [key, defaultValue])

  const setStoredValue = async (newValue: T) => {
    const storage = new Storage()
    await storage.set(key, newValue)
    setValue(newValue)
  }

  return [value, setStoredValue, isLoading]
}

