import { FakeMouse } from "@aipexstudio/aipex-react/components/fake-mouse";
import type { FakeMouseController } from "@aipexstudio/aipex-react/components/fake-mouse/types";
import { Omni } from "@aipexstudio/aipex-react/components/omni";
import { collectDomSnapshot } from "@aipexstudio/dom-snapshot";
import React from "react";
import ReactDOM from "react-dom/client";
// Import CSS as a string to inject into Shadow DOM
import tailwindCss from "../tailwind.css?inline";

interface CaptureState {
  isCapturing: boolean;
  highlightedElement: Element | null;
}

const ContentApp = () => {
  const [isOmniOpen, setIsOmniOpen] = React.useState(false);
  const fakeMouseRef = React.useRef<FakeMouseController | null>(null);
  const captureStateRef = React.useRef<CaptureState>({
    isCapturing: false,
    highlightedElement: null,
  });

  const generateCssSelector = React.useCallback((element: Element): string => {
    const path: string[] = [];
    let current: Element | null = element;
    let depth = 0;
    const maxDepth = 5;

    while (current && current !== document.body && depth < maxDepth) {
      let selector = current.tagName.toLowerCase();

      // Add ID if present
      if (current.id) {
        selector += `#${current.id}`;
        path.unshift(selector);
        break;
      }

      // Add classes (filter out temp classes)
      if (current.classList.length > 0) {
        const classes = Array.from(current.classList)
          .filter((c) => !c.startsWith("plasmo-") && !c.startsWith("aipex-"))
          .slice(0, 2)
          .join(".");
        if (classes) {
          selector += `.${classes}`;
        }
      }

      // Add nth-child for specificity
      if (current.parentElement) {
        const siblings = Array.from(current.parentElement.children);
        const index = siblings.indexOf(current) + 1;
        if (siblings.length > 1) {
          selector += `:nth-child(${index})`;
        }
      }

      path.unshift(selector);
      current = current.parentElement;
      depth++;
    }

    return path.join(" > ");
  }, []);

  const stopCapture = React.useCallback(() => {
    console.log("🛑 Stopping element capture mode");
    captureStateRef.current.isCapturing = false;

    // Remove highlight
    if (captureStateRef.current.highlightedElement) {
      captureStateRef.current.highlightedElement.classList.remove(
        "aipex-capture-highlight",
      );
      captureStateRef.current.highlightedElement = null;
    }

    // Cleanup event listeners
    if ((window as any).__aipexCaptureCleanup) {
      (window as any).__aipexCaptureCleanup();
      delete (window as any).__aipexCaptureCleanup;
    }
  }, []);

  // Capture functionality
  const startCapture = React.useCallback(() => {
    if (captureStateRef.current.isCapturing) {
      console.warn("⚠️ Capture already in progress");
      return;
    }

    console.log("🎯 Starting element capture mode");
    captureStateRef.current.isCapturing = true;

    const handleMouseOver = (e: MouseEvent) => {
      if (!captureStateRef.current.isCapturing) return;

      const target = e.target as Element;
      if (!target) return;

      // Remove previous highlight
      if (captureStateRef.current.highlightedElement) {
        captureStateRef.current.highlightedElement.classList.remove(
          "aipex-capture-highlight",
        );
      }

      // Add highlight to current element
      target.classList.add("aipex-capture-highlight");
      captureStateRef.current.highlightedElement = target;
    };

    const handleClick = (e: MouseEvent) => {
      if (!captureStateRef.current.isCapturing) return;

      e.preventDefault();
      e.stopPropagation();

      const target = e.target as Element;
      if (!target) return;

      console.log("🎯 Element captured:", target);

      // Generate selector
      const selector = generateCssSelector(target);

      // Collect element data
      const rect = target.getBoundingClientRect();
      const data = {
        timestamp: Date.now(),
        url: window.location.href,
        tagName: target.tagName.toLowerCase(),
        selector,
        id: target.id || undefined,
        classes: Array.from(target.classList).filter(
          (c) => !c.startsWith("aipex-") && !c.startsWith("plasmo-"),
        ),
        textContent: target.textContent?.trim().substring(0, 200) || undefined,
        attributes: Array.from(target.attributes).reduce(
          (acc, attr) => {
            if (!attr.name.startsWith("data-plasmo")) {
              acc[attr.name] = attr.value;
            }
            return acc;
          },
          {} as Record<string, string>,
        ),
        rect: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        },
      };

      // Send to background
      chrome.runtime
        .sendMessage({
          request: "capture-click-event",
          data,
        })
        .catch((err) => {
          console.error("❌ Failed to send capture event:", err);
        });

      // Stop capture
      stopCapture();
    };

    // Add event listeners
    document.addEventListener("mouseover", handleMouseOver, true);
    document.addEventListener("click", handleClick, true);

    // Store cleanup functions
    (window as any).__aipexCaptureCleanup = () => {
      document.removeEventListener("mouseover", handleMouseOver, true);
      document.removeEventListener("click", handleClick, true);
    };

    // Add CSS for highlight
    if (!document.getElementById("aipex-capture-styles")) {
      const style = document.createElement("style");
      style.id = "aipex-capture-styles";
      style.textContent = `
        .aipex-capture-highlight {
          outline: 2px solid #3b82f6 !important;
          outline-offset: 2px !important;
          cursor: crosshair !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, [generateCssSelector, stopCapture]);

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
      } else if (message.request === "start-capture") {
        try {
          console.log("📥 Content script received start-capture message");
          startCapture();
          sendResponse({ success: true });
        } catch (error) {
          console.error("❌ Failed to start capture:", error);
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
        return true;
      } else if (message.request === "stop-capture") {
        try {
          console.log("📥 Content script received stop-capture message");
          stopCapture();
          sendResponse({ success: true });
        } catch (error) {
          console.error("❌ Failed to stop capture:", error);
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
        return true;
      } else if (
        message.type === "aipex:collect-dom-snapshot" ||
        message.request === "collect-dom-snapshot"
      ) {
        // DOM snapshot collection for background mode
        (async () => {
          try {
            console.log("📸 Content script collecting DOM snapshot");
            const snapshot = collectDomSnapshot(document, message.options);
            sendResponse({ success: true, data: snapshot });
          } catch (error) {
            console.error("❌ Failed to collect DOM snapshot:", error);
            sendResponse({
              success: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to collect DOM snapshot",
            });
          }
        })();
        return true; // Keep channel open for async response
      }

      return false;
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [startCapture, stopCapture]);

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
