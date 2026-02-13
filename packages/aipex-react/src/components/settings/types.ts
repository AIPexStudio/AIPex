import type {
  AIProviderKey,
  AppSettings,
  KeyValueStorage,
} from "@aipexstudio/aipex-core";
import type { ReactNode } from "react";

/**
 * Callbacks for loading / saving ElevenLabs Speech-to-Text configuration.
 * Keys are stored separately from the main settings blob so that VoiceInput
 * can read them without loading the full settings.
 */
export interface STTConfigAdapter {
  load: () => Promise<{ apiKey: string; modelId: string }>;
  save: (values: { apiKey: string; modelId: string }) => Promise<void>;
}

export interface SettingsPageProps {
  storageAdapter: KeyValueStorage<unknown>;
  storageKey?: string;
  className?: string;
  onSave?: (settings: AppSettings) => void;
  onTestConnection?: (settings: AppSettings) => Promise<boolean>;
  skillsContent?: ReactNode;
  /** Optional ElevenLabs STT config adapter; when provided the STT card is shown. */
  sttConfig?: STTConfigAdapter;
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
