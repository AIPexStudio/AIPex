import type {
  AIProviderKey,
  AppSettings,
  KeyValueStorage,
} from "@aipexstudio/aipex-core";

export interface SettingsPageProps {
  storageAdapter: KeyValueStorage<unknown>;
  storageKey?: string;
  className?: string;
  onSave?: (settings: AppSettings) => void;
  onTestConnection?: (settings: AppSettings) => Promise<boolean>;
}

export interface ProviderConfig {
  host: string;
  token: string;
  model: string;
}

export type ProviderConfigs = Record<AIProviderKey, ProviderConfig>;

export type SettingsTab = "general" | "ai" | "voice";

export interface SaveStatus {
  type: "success" | "error" | "info" | "";
  message: string;
}
