import { useCallback, useEffect, useState } from "react";
import type { ChatSettings } from "../types";

/**
 * Storage key prefix for chat settings
 */
const STORAGE_KEY_PREFIX = "chatbot_";

/**
 * Default chat settings
 */
const DEFAULT_SETTINGS: ChatSettings = {
  aiHost: "https://api.openai.com/v1/chat/completions",
  aiToken: "",
  aiModel: "gpt-4",
  language: "en",
  theme: "system",
};

/**
 * Storage adapter interface for persisting settings
 */
export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

/**
 * Default storage adapter using localStorage
 */
const defaultStorageAdapter: StorageAdapter = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = localStorage.getItem(key);
      return value ? (JSON.parse(value) as T) : null;
    } catch {
      return null;
    }
  },
  async set<T>(key: string, value: T): Promise<void> {
    localStorage.setItem(key, JSON.stringify(value));
  },
  async remove(key: string): Promise<void> {
    localStorage.removeItem(key);
  },
};

/**
 * Chrome extension storage adapter
 */
export const chromeStorageAdapter: StorageAdapter = {
  async get<T>(key: string): Promise<T | null> {
    return new Promise((resolve) => {
      if (typeof chrome !== "undefined" && chrome.storage?.local) {
        chrome.storage.local.get(key, (result) => {
          resolve(result[key] ?? null);
        });
      } else {
        resolve(defaultStorageAdapter.get<T>(key));
      }
    });
  },
  async set<T>(key: string, value: T): Promise<void> {
    return new Promise((resolve) => {
      if (typeof chrome !== "undefined" && chrome.storage?.local) {
        chrome.storage.local.set({ [key]: value }, resolve);
      } else {
        defaultStorageAdapter.set(key, value).then(resolve);
      }
    });
  },
  async remove(key: string): Promise<void> {
    return new Promise((resolve) => {
      if (typeof chrome !== "undefined" && chrome.storage?.local) {
        chrome.storage.local.remove(key, resolve);
      } else {
        defaultStorageAdapter.remove(key).then(resolve);
      }
    });
  },
};

export interface UseChatConfigOptions {
  /** Initial settings (will be overridden by stored values) */
  initialSettings?: Partial<ChatSettings>;
  /** Storage adapter for persisting settings */
  storageAdapter?: StorageAdapter;
  /** Whether to auto-load settings from storage on mount */
  autoLoad?: boolean;
}

export interface UseChatConfigReturn {
  /** Current settings */
  settings: ChatSettings;
  /** Whether settings are being loaded */
  isLoading: boolean;
  /** Update a single setting */
  updateSetting: <K extends keyof ChatSettings>(
    key: K,
    value: ChatSettings[K],
  ) => Promise<void>;
  /** Update multiple settings at once */
  updateSettings: (updates: Partial<ChatSettings>) => Promise<void>;
  /** Reset settings to defaults */
  resetSettings: () => Promise<void>;
  /** Reload settings from storage */
  reloadSettings: () => Promise<void>;
}

/**
 * useChatConfig - Hook for managing chat configuration/settings
 *
 * This hook handles loading, saving, and updating chat settings,
 * with support for different storage backends (localStorage, chrome.storage, etc.)
 *
 * @example
 * ```tsx
 * function SettingsPanel() {
 *   const { settings, updateSetting, isLoading } = useChatConfig({
 *     storageAdapter: chromeStorageAdapter,
 *   });
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <input
 *       value={settings.aiModel}
 *       onChange={(e) => updateSetting('aiModel', e.target.value)}
 *     />
 *   );
 * }
 * ```
 */
export function useChatConfig(
  options: UseChatConfigOptions = {},
): UseChatConfigReturn {
  const {
    initialSettings = {},
    storageAdapter = defaultStorageAdapter,
    autoLoad = true,
  } = options;

  const [settings, setSettings] = useState<ChatSettings>({
    ...DEFAULT_SETTINGS,
    ...initialSettings,
  });
  const [isLoading, setIsLoading] = useState(autoLoad);

  // Load settings from storage
  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const stored = await storageAdapter.get<ChatSettings>(
        `${STORAGE_KEY_PREFIX}settings`,
      );
      if (stored) {
        setSettings((prev) => ({ ...prev, ...stored }));
      }
    } catch (error) {
      console.error("Failed to load chat settings:", error);
    } finally {
      setIsLoading(false);
    }
  }, [storageAdapter]);

  // Save settings to storage
  const saveSettings = useCallback(
    async (newSettings: ChatSettings) => {
      try {
        await storageAdapter.set(`${STORAGE_KEY_PREFIX}settings`, newSettings);
      } catch (error) {
        console.error("Failed to save chat settings:", error);
      }
    },
    [storageAdapter],
  );

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadSettings();
    }
  }, [autoLoad, loadSettings]);

  // Update a single setting
  const updateSetting = useCallback(
    async <K extends keyof ChatSettings>(
      key: K,
      value: ChatSettings[K],
    ): Promise<void> => {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      await saveSettings(newSettings);
    },
    [settings, saveSettings],
  );

  // Update multiple settings
  const updateSettings = useCallback(
    async (updates: Partial<ChatSettings>): Promise<void> => {
      const newSettings = { ...settings, ...updates };
      setSettings(newSettings);
      await saveSettings(newSettings);
    },
    [settings, saveSettings],
  );

  // Reset to defaults
  const resetSettings = useCallback(async (): Promise<void> => {
    const newSettings = { ...DEFAULT_SETTINGS, ...initialSettings };
    setSettings(newSettings);
    await saveSettings(newSettings);
  }, [initialSettings, saveSettings]);

  // Reload from storage
  const reloadSettings = useCallback(async (): Promise<void> => {
    await loadSettings();
  }, [loadSettings]);

  return {
    settings,
    isLoading,
    updateSetting,
    updateSettings,
    resetSettings,
    reloadSettings,
  };
}
