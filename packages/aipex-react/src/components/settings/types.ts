import type { AIProviderKey, KeyValueStorage } from "@aipexstudio/aipex-core";
import type { ChatSettings } from "../../types";

export interface SettingsPageProps {
  storageAdapter: KeyValueStorage<unknown>;
  storageKey?: string;
  className?: string;
  onSave?: (settings: ChatSettings) => void;
  onTestConnection?: (settings: ChatSettings) => Promise<boolean>;
}

export interface ProviderConfig {
  host: string;
  token: string;
  model: string;
}

export type ProviderConfigs = Record<AIProviderKey, ProviderConfig>;

export type SettingsTab = "general" | "ai";

export interface SaveStatus {
  type: "success" | "error" | "info" | "";
  message: string;
}
