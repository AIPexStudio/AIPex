import React from "react";
import ReactDOM from "react-dom/client";
import ChatBot from "~/components/chatbot";
import { chromeStorageAdapter, useAgent, useChatConfig } from "~/hooks";
import { I18nProvider } from "~/i18n/context";

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

  // Pass agent and configError to ChatBot - it will show configuration guide if needed
  return <ChatBot agent={agent} configError={error} />;
}

export function renderChatApp() {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    return;
  }

  const App = () => (
    <I18nProvider>
      <ChatApp />
    </I18nProvider>
  );

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
