import React from "react";
import ReactDOM from "react-dom/client";
import ChatBot from "~/components/chatbot";
import { I18nProvider } from "~/i18n/context";

export function renderChatApp() {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    return;
  }

  const App = () => (
    <I18nProvider>
      <ChatBot />
    </I18nProvider>
  );

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
