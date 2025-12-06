import {
  DEFAULT_APP_SETTINGS,
  type KeyValueStorage,
  STORAGE_KEYS,
} from "@aipexstudio/aipex-core";
import { useCallback, useEffect, useState } from "react";
import { localStorageKeyValueAdapter } from "../lib/storage";
import type { ChatSettings } from "../types";

const DEFAULT_SETTINGS: ChatSettings = {
  ...DEFAULT_APP_SETTINGS,
  aiHost: "",
  aiToken: "",
  aiModel: "gpt-4",
};

export interface UseChatConfigOptions {
  /** Initial settings (will be overridden by stored values) */
  initialSettings?: Partial<ChatSettings>;
  /** Storage adapter for persisting settings (KeyValueStorage from @aipexstudio/aipex-core) */
  storageAdapter?: KeyValueStorage<unknown>;
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
    storageAdapter = localStorageKeyValueAdapter,
    autoLoad = true,
  } = options;

  const [settings, setSettings] = useState<ChatSettings>({
    ...DEFAULT_SETTINGS,
    ...initialSettings,
  });
  const [isLoading, setIsLoading] = useState(autoLoad);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const stored = await storageAdapter.load(STORAGE_KEYS.SETTINGS);
      if (stored) {
        setSettings((prev: ChatSettings) => ({ ...prev, ...stored }));
      }
    } catch (error) {
      console.error("Failed to load chat settings:", error);
    } finally {
      setIsLoading(false);
    }
  }, [storageAdapter]);

  const saveSettings = useCallback(
    async (newSettings: ChatSettings) => {
      try {
        await storageAdapter.save(STORAGE_KEYS.SETTINGS, newSettings);
      } catch (error) {
        console.error("Failed to save chat settings:", error);
      }
    },
    [storageAdapter],
  );

  useEffect(() => {
    if (autoLoad) {
      void loadSettings();
    }
  }, [autoLoad, loadSettings]);

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

  const updateSettings = useCallback(
    async (updates: Partial<ChatSettings>): Promise<void> => {
      const newSettings = { ...settings, ...updates };
      setSettings(newSettings);
      await saveSettings(newSettings);
    },
    [settings, saveSettings],
  );

  const resetSettings = useCallback(async (): Promise<void> => {
    const newSettings = { ...DEFAULT_SETTINGS, ...initialSettings };
    setSettings(newSettings);
    await saveSettings(newSettings);
  }, [initialSettings, saveSettings]);

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
