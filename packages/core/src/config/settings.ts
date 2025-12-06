import type { AIProviderKey } from "./ai-providers.js";

export interface AppSettings {
  aiProvider?: AIProviderKey;
  aiHost?: string;
  aiToken?: string;
  aiModel?: string;
  language?: string;
  theme?: string;
  byokEnabled?: boolean;
  dataSharingEnabled?: boolean;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  aiProvider: "openai",
  language: "en",
  theme: "system",
};

