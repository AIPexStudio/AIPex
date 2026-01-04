import { FakeMouse } from "@aipexstudio/aipex-react/components/fake-mouse";
import type { FakeMouseController } from "@aipexstudio/aipex-react/components/fake-mouse/types";
import { Omni } from "@aipexstudio/aipex-react/components/omni";
import React from "react";
import ReactDOM from "react-dom/client";
// Import CSS as a string to inject into Shadow DOM
import tailwindCss from "../tailwind.css?inline";

const ContentApp = () => {
  const [isOmniOpen, setIsOmniOpen] = React.useState(false);
  const fakeMouseRef = React.useRef<FakeMouseController | null>(null);

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
      } else if (message.request === "scroll-to-coordinates") {
        // Smooth scroll to coordinates
        const { x, y } = message;
        if (typeof x === "number" && typeof y === "number") {
          window.scrollTo({
            left: x - window.innerWidth / 2,
            top: y - window.innerHeight / 2,
            behavior: "smooth",
          });
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: "Invalid coordinates" });
        }
        return true;
      } else if (message.request === "fake-mouse-move") {
        // Move fake mouse to coordinates
        const { x, y, duration } = message;
        if (
          fakeMouseRef.current &&
          typeof x === "number" &&
          typeof y === "number"
        ) {
          fakeMouseRef.current.show();
          fakeMouseRef.current
            .moveTo(x, y, duration)
            .then(() => {
              sendResponse({ success: true });
            })
            .catch((error) => {
              sendResponse({ success: false, error: error.message });
            });
          return true; // Keep channel open for async response
        } else {
          sendResponse({
            success: false,
            error: "Fake mouse not ready or invalid coordinates",
          });
          return true;
        }
      } else if (message.request === "fake-mouse-play-click-animation") {
        // Play click animation
        if (fakeMouseRef.current) {
          fakeMouseRef.current
            .playClickAnimation()
            .then(() => {
              // Return to center after animation
              const centerX = window.innerWidth / 2;
              const centerY = window.innerHeight / 2;
              return fakeMouseRef.current!.moveTo(centerX, centerY);
            })
            .then(() => {
              fakeMouseRef.current!.hide();
              sendResponse({ success: true });
            })
            .catch((error) => {
              sendResponse({ success: false, error: error.message });
            });
          return true; // Keep channel open for async response
        } else {
          sendResponse({ success: false, error: "Fake mouse not ready" });
          return true;
        }
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
    <>
      {isOmniOpen && <Omni open={isOmniOpen} setOpen={setIsOmniOpen} />}
      <FakeMouse
        onReady={(controller) => {
          fakeMouseRef.current = controller;
        }}
      />
    </>
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
