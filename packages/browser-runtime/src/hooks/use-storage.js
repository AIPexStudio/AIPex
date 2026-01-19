import { useEffect, useMemo, useState } from "react";
import { ChromeStorageAdapter } from "../storage/storage-adapter.js";
/**
 * React hook for Chrome storage (similar to @plasmohq/storage/hook)
 */
export function useStorage(key, defaultValue) {
  const [value, setValue] = useState(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const storage = useMemo(() => new ChromeStorageAdapter(), []);
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
  const setStoredValue = async (newValue) => {
    await storage.save(key, newValue);
    setValue(newValue);
  };
  return [value, setStoredValue, isLoading];
}
