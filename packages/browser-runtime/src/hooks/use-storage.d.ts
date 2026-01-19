/**
 * React hook for Chrome storage (similar to @plasmohq/storage/hook)
 */
export declare function useStorage<T = unknown>(
  key: string,
  defaultValue?: T,
): [T | undefined, (value: T) => Promise<void>, boolean];
