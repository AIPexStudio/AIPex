import { useEffect, useMemo, useState } from "react";
import { ChromeStorageAdapter } from "../storage/storage-adapter.js";
/**
 * React hook for Chrome storage (similar to @plasmohq/storage/hook)
 * 
 * @throws {Error} If React is not properly loaded (useState is null/undefined)
 */
export function useStorage(key, defaultValue) {
  // Defensive check: ensure React hooks are available
  if (!useState || !useEffect || !useMemo) {
    throw new Error(
      "[useStorage] React hooks are not available. This usually means:\n" +
      "1. React is being loaded multiple times (check for duplicate React instances)\n" +
      "2. This hook is being imported in a non-React context (e.g., background script)\n" +
      "3. Vite/bundler config is externalizing React incorrectly\n" +
      "Fix: Ensure 'react' and 'react-dom' are deduped in vite.config.ts"
    );
  }
  
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
