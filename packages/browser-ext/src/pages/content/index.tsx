import { Omni } from "@aipexstudio/aipex-react/components/omni";
import React from "react";
import ReactDOM from "react-dom/client";
// Import CSS as a string to inject into Shadow DOM
import tailwindCss from "../tailwind.css?inline";

const ContentApp = () => {
  const [isOmniOpen, setIsOmniOpen] = React.useState(false);

  // Message listener for external triggers (keyboard shortcuts from background)
  React.useEffect(() => {
    const handleMessage = (message: any, _sender: any, sendResponse: any) => {
      if (message.request === "open-aipex") {
        setIsOmniOpen(true);
        sendResponse({ success: true });
        return true; // Keep message channel open
      } else if (message.request === "close-omni") {
        setIsOmniOpen(false);
        sendResponse({ success: true });
        return true;
      }

      return false;
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  // Return UI
  return (
    <>{isOmniOpen && <Omni open={isOmniOpen} setOpen={setIsOmniOpen} />}</>
  );
};

// Wait for DOM to be ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initContentScript);
} else {
  initContentScript();
}

function initContentScript() {
  // Mount the content script
  const container = document.createElement("div");
  container.id = "aipex-content-root";
  document.body.appendChild(container);

  // Create shadow DOM to isolate styles
  const shadowRoot = container.attachShadow({ mode: "open" });
  const shadowContainer = document.createElement("div");
  shadowRoot.appendChild(shadowContainer);

  // Inject Tailwind CSS into shadow DOM
  const style = document.createElement("style");
  style.textContent = `
    :host {
      all: initial;
    }
    ${tailwindCss}
  `;
  shadowRoot.appendChild(style);

  // Render the app
  const root = ReactDOM.createRoot(shadowContainer);
  root.render(
    <React.StrictMode>
      <ContentApp />
    </React.StrictMode>,
  );
}
