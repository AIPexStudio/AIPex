import { useEffect, useMemo, useState } from "react";
import { ChromeStorageAdapter } from "../storage/storage-adapter.js";

/**
 * React hook for Chrome storage (similar to @plasmohq/storage/hook)
 */
export function useStorage<T = unknown>(
  key: string,
  defaultValue?: T,
): [T | undefined, (value: T) => Promise<void>, boolean] {
  const [value, setValue] = useState<T | undefined>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);

  const storage = useMemo(() => new ChromeStorageAdapter<T>(), []);

  useEffect(() => {
    void storage.load(key).then((storedValue) => {
      setValue(storedValue ?? defaultValue);
      setIsLoading(false);
    });

    const unwatch = storage.watch(key, ({ newValue }) => {
      setValue(newValue ?? defaultValue);
    });

    return unwatch;
  }, [key, defaultValue, storage]);

  const setStoredValue = async (newValue: T) => {
    await storage.save(key, newValue);
    setValue(newValue);
  };

  return [value, setStoredValue, isLoading];
}
