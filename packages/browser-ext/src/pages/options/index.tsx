import React from "react";
import ReactDOM from "react-dom/client";
import ChatBot from "~/components/chatbot";
import { I18nProvider } from "~/i18n/context";

const OptionsApp = () => (
  <I18nProvider>
    <ChatBot />
  </I18nProvider>
);

const root = document.getElementById("root");
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <OptionsApp />
    </React.StrictMode>,
  );
}
