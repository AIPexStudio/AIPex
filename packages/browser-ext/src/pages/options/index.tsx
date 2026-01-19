import type { AppSettings } from "@aipexstudio/aipex-core";
import { SettingsPage } from "@aipexstudio/aipex-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@aipexstudio/aipex-react/components/ui/tabs";
import { I18nProvider } from "@aipexstudio/aipex-react/i18n/context";
import type { Language } from "@aipexstudio/aipex-react/i18n/types";
import { ThemeProvider } from "@aipexstudio/aipex-react/theme/context";
import type { Theme } from "@aipexstudio/aipex-react/theme/types";
import { ChromeStorageAdapter } from "@aipexstudio/browser-runtime";
import type { LanguageModel } from "ai";
import { generateText } from "ai";
import { Bot, Package, Settings as SettingsIcon } from "lucide-react";
import React, { useCallback, useState } from "react";
import ReactDOM from "react-dom/client";
import { chromeStorageAdapter } from "../../hooks";
import { createAIProvider } from "../../lib/ai-provider";
import { SkillsOptionsTab } from "./skills-tab";

import "../tailwind.css";

const i18nStorageAdapter = new ChromeStorageAdapter<Language>();
const themeStorageAdapter = new ChromeStorageAdapter<Theme>();

function OptionsPageContent() {
  const [activeTab, setActiveTab] = useState<string>("general");

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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full max-w-6xl mx-auto mt-8 grid grid-cols-3">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            AI Configuration
          </TabsTrigger>
          <TabsTrigger value="skills" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Skills
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-0">
          <SettingsPage
            storageAdapter={chromeStorageAdapter}
            onTestConnection={handleTestConnection}
            defaultTab="general"
          />
        </TabsContent>

        <TabsContent value="ai" className="mt-0">
          <SettingsPage
            storageAdapter={chromeStorageAdapter}
            onTestConnection={handleTestConnection}
            defaultTab="ai"
          />
        </TabsContent>

        <TabsContent value="skills" className="mt-8">
          <div className="max-w-6xl mx-auto px-4 pb-8">
            <SkillsOptionsTab />
          </div>
        </TabsContent>
      </Tabs>
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
