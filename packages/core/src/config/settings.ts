import type { AIProviderKey } from "./ai-providers.js";

export type ProviderType = "google" | "openai" | "claude";

export interface CustomModelConfig {
  id: string;
  name?: string;
  providerType: ProviderType;
  aiHost?: string;
  aiToken: string;
  aiModel: string;
  enabled: boolean;
}

export interface AppSettings {
  aiProvider?: AIProviderKey;
  aiHost?: string;
  aiToken?: string;
  aiModel?: string;
  /**
   * Preferred default model for new sessions (does not affect runtime selection)
   */
  defaultModel?: string;
  language?: string;
  theme?: string;
  byokEnabled?: boolean;
  dataSharingEnabled?: boolean;
  /**
   * Global toggle for BYOK/provider usage
   */
  providerEnabled?: boolean;
  /**
   * Provider type for current BYOK selection
   */
  providerType?: ProviderType;
  /**
   * Multiple BYOK custom model configurations
   */
  customModels?: CustomModelConfig[];
  /**
   * ElevenLabs API key for voice-to-text (BYOK users)
   */
  elevenLabsApiKey?: string;
  /**
   * ElevenLabs model ID (optional)
   */
  elevenLabsModelId?: string;
  /**
   * Input mode for chatbot (voice or text)
   */
  inputMode?: "voice" | "text";
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  aiProvider: "openai",
  language: "en",
  theme: "system",
  providerType: "openai",
  providerEnabled: false,
  defaultModel: undefined,
  customModels: [],
};
