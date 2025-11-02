import React from "react";
import ReactDOM from "react-dom/client";
import ChatBot from "~/lib/components/chatbot";
import { I18nProvider } from "~/lib/i18n/context";

// CSS is loaded directly in HTML for better HMR support
// import "~/tailwind.css"

const SidepanelApp = () => (
  <I18nProvider>
    <ChatBot />
  </I18nProvider>
);

const root = document.getElementById("root");
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <SidepanelApp />
    </React.StrictMode>,
  );
}
