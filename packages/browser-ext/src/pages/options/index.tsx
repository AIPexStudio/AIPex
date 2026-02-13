import type { AppSettings } from "@aipexstudio/aipex-core";
import { SettingsPage } from "@aipexstudio/aipex-react";
import type { STTConfigAdapter } from "@aipexstudio/aipex-react";
import { I18nProvider } from "@aipexstudio/aipex-react/i18n/context";
import type { Language } from "@aipexstudio/aipex-react/i18n/types";
import { ThemeProvider } from "@aipexstudio/aipex-react/theme/context";
import type { Theme } from "@aipexstudio/aipex-react/theme/types";
import { ChromeStorageAdapter } from "@aipexstudio/browser-runtime";
import type { LanguageModel } from "ai";
import { generateText } from "ai";
import React, { useCallback } from "react";
import ReactDOM from "react-dom/client";
import { chromeStorageAdapter } from "../../hooks";
import { createAIProvider } from "../../lib/ai-provider";
import { SkillsOptionsTab } from "./skills-tab";

import "../tailwind.css";

const i18nStorageAdapter = new ChromeStorageAdapter<Language>();
const themeStorageAdapter = new ChromeStorageAdapter<Theme>();

const chromeSttAdapter: STTConfigAdapter = {
  load: async () => {
    const result = await chrome.storage.local.get([
      "elevenlabsApiKey",
      "elevenlabsModelId",
    ]);
    return {
      apiKey: (result.elevenlabsApiKey as string) || "",
      modelId: (result.elevenlabsModelId as string) || "",
    };
  },
  save: async ({ apiKey, modelId }) => {
    await chrome.storage.local.set({
      elevenlabsApiKey: apiKey,
      elevenlabsModelId: modelId,
    });
  },
};

function OptionsPageContent() {
  const handleTestConnection = useCallback(async (settings: AppSettings) => {
    try {
      const provider = createAIProvider(settings);
      const modelId = settings.aiModel;
      if (!modelId) {
        return false;
      }

      await generateText({
        model: provider(modelId) as LanguageModel,
        prompt: "Hi",
      });

      return true;
    } catch (error) {
      console.error("Connection test failed:", error);
      return false;
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SettingsPage
        storageAdapter={chromeStorageAdapter}
        onTestConnection={handleTestConnection}
        skillsContent={<SkillsOptionsTab />}
        sttConfig={chromeSttAdapter}
      />
    </div>
  );
}

const rootElement = document.getElementById("root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <I18nProvider storageAdapter={i18nStorageAdapter}>
        <ThemeProvider storageAdapter={themeStorageAdapter}>
          <OptionsPageContent />
        </ThemeProvider>
      </I18nProvider>
    </React.StrictMode>,
  );
}
