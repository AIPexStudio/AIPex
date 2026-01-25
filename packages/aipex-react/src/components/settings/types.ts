import type {
  AIProviderKey,
  AppSettings,
  KeyValueStorage,
} from "@aipexstudio/aipex-core";
import type { ReactNode } from "react";

export interface SettingsPageProps {
  storageAdapter: KeyValueStorage<unknown>;
  storageKey?: string;
  className?: string;
  onSave?: (settings: AppSettings) => void;
  onTestConnection?: (settings: AppSettings) => Promise<boolean>;
  skillsContent?: ReactNode;
}

export interface ProviderConfig {
  host: string;
  token: string;
  model: string;
}

export type ProviderConfigs = Record<AIProviderKey, ProviderConfig>;

export type SettingsTab = "general" | "ai" | "skills";

export interface SaveStatus {
  type: "success" | "error" | "info" | "";
  message: string;
}
