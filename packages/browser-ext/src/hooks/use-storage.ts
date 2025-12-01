import { useEffect, useMemo, useState } from "react";
import { Storage } from "../adapters/storage-adapter";

/**
 * React hook for Chrome storage (similar to @plasmohq/storage/hook)
 */
export function useStorage<T = any>(
  key: string,
  defaultValue?: T,
): [T | undefined, (value: T) => Promise<void>, boolean] {
  const [value, setValue] = useState<T | undefined>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);

  // Create storage instance once
  const storage = useMemo(() => new Storage(), []);

  useEffect(() => {
    // Load initial value
    void storage.get<T>(key).then((storedValue: T | undefined) => {
      setValue(storedValue ?? defaultValue);
      setIsLoading(false);
    });

    // Watch for changes
    const unwatch = storage.watch<T>(key, ({ newValue }) => {
      setValue(newValue ?? defaultValue);
    });

    return unwatch;
  }, [key, defaultValue, storage]);

  const setStoredValue = async (newValue: T) => {
    await storage.set(key, newValue);
    setValue(newValue);
  };

  return [value, setStoredValue, isLoading];
}
