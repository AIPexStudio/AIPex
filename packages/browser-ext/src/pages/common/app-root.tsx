/**
 * Browser Extension App Root
 * Simple wrapper using browser-specific hooks
 */

import { useAgent, useChatConfig } from "@aipexstudio/aipex-react";
import ChatBot from "@aipexstudio/aipex-react/components/chatbot";
import type { InterventionMode } from "@aipexstudio/aipex-react/components/intervention";
import { I18nProvider } from "@aipexstudio/aipex-react/i18n/context";
import type { Language } from "@aipexstudio/aipex-react/i18n/types";
import { ThemeProvider } from "@aipexstudio/aipex-react/theme/context";
import type { Theme } from "@aipexstudio/aipex-react/theme/types";
import { ChromeStorageAdapter } from "@aipexstudio/browser-runtime";
import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { chromeStorageAdapter } from "../../hooks";
import { AutomationModeInputToolbar } from "../../lib/automation-mode-toolbar";
import {
  BROWSER_AGENT_CONFIG,
  useBrowserContextProviders,
  useBrowserModelFactory,
  useBrowserStorage,
  useBrowserTools,
} from "../../lib/browser-agent-config";
import { BrowserChatHeader } from "../../lib/browser-chat-header";
import { InterventionModeProvider } from "../../lib/intervention-mode-context";
import { InterventionUI } from "../../lib/intervention-ui";

const i18nStorageAdapter = new ChromeStorageAdapter<Language>();
const themeStorageAdapter = new ChromeStorageAdapter<Theme>();

function ChatApp() {
  const { settings, isLoading } = useChatConfig({
    storageAdapter: chromeStorageAdapter,
    autoLoad: true,
  });

  const storage = useBrowserStorage();
  const modelFactory = useBrowserModelFactory();
  const contextProviders = useBrowserContextProviders();
  const tools = useBrowserTools();

  const { agent, error } = useAgent({
    settings,
    isLoading,
    modelFactory,
    storage,
    contextProviders,
    tools,
    ...BROWSER_AGENT_CONFIG,
  });

  const [interventionMode, setInterventionMode] =
    useState<InterventionMode>("passive");

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <InterventionModeProvider
      mode={interventionMode}
      setMode={setInterventionMode}
    >
      <ChatBot
        agent={agent}
        configError={error}
        initialSettings={settings}
        storageAdapter={chromeStorageAdapter}
        components={{
          Header: BrowserChatHeader,
        }}
        slots={{
          afterMessages: () => (
            <InterventionUI
              mode={interventionMode}
              onModeChange={setInterventionMode}
            />
          ),
          inputToolbar: (props) => <AutomationModeInputToolbar {...props} />,
        }}
      />
    </InterventionModeProvider>
  );
}

export function renderChatApp() {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    return;
  }

  const App = () => (
    <I18nProvider storageAdapter={i18nStorageAdapter}>
      <ThemeProvider storageAdapter={themeStorageAdapter}>
        <ChatApp />
      </ThemeProvider>
    </I18nProvider>
  );

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
