/**
 * Browser Extension App Root
 * Simple wrapper using browser-specific hooks
 */

import ChatBot from "@aipexstudio/aipex-react/components/chatbot";
import { I18nProvider } from "@aipexstudio/aipex-react/i18n/context";
import type { Language } from "@aipexstudio/aipex-react/i18n/types";
import { ThemeProvider } from "@aipexstudio/aipex-react/theme/context";
import type { Theme } from "@aipexstudio/aipex-react/theme/types";
import { ChromeStorageAdapter } from "@aipexstudio/browser-runtime";
import React from "react";
import ReactDOM from "react-dom/client";
import { chromeStorageAdapter, useAgent, useChatConfig } from "../../hooks";

const i18nStorageAdapter = new ChromeStorageAdapter<Language>();
const themeStorageAdapter = new ChromeStorageAdapter<Theme>();

function ChatApp() {
  const { settings, isLoading } = useChatConfig({
    storageAdapter: chromeStorageAdapter,
    autoLoad: true,
  });

  const { agent, error } = useAgent({ settings, isLoading });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <ChatBot
      agent={agent}
      configError={error}
      initialSettings={settings}
      storageAdapter={chromeStorageAdapter}
    />
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
