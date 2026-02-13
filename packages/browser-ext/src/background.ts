/**
 * Background Service Worker
 * Handles extension lifecycle events and keyboard commands
 */

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

// Listen for keyboard command to open AIPex
chrome.commands.onCommand.addListener((command) => {
  if (command === "open-aipex") {
    // Get the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        // Send message to content script to open omni
        chrome.tabs
          .sendMessage(tabs[0].id, { request: "open-aipex" })
          .catch((error) => {
            console.error("Failed to send message to content script:", error);
          });
      }
    });
  }
});

// Handle extension installation or update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("AIPex extension installed");
  } else if (details.reason === "update") {
    console.log(
      "AIPex extension updated to version",
      chrome.runtime.getManifest().version,
    );
  }
});

// =============================================================================
// Sidepanel port lifecycle
// =============================================================================
// Track whether a recording is active so we can clean up on disconnect
let isRecording = false;

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "sidepanel") {
    port.onDisconnect.addListener(() => {
      // When sidepanel closes, stop capture on all tabs if recording was active
      if (isRecording) {
        isRecording = false;
        chrome.tabs.query({}).then((tabs) => {
          for (const tab of tabs) {
            if (tab.id) {
              chrome.tabs
                .sendMessage(tab.id, { request: "stop-capture" })
                .catch(() => {
                  /* tab may not have content script */
                });
            }
          }
        });
      }
    });
  }
});

// =============================================================================
// Internal message router
// =============================================================================
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // Echo capture events to all extension contexts
  if (message.request === "capture-click-event") {
    try {
      // Immediately acknowledge sender (content script)
      sendResponse({ success: true });
      // Re-broadcast so sidepanel listeners reliably receive it
      chrome.runtime
        .sendMessage({ request: "capture-click-event", data: message.data })
        .catch(() => {
          // Ignore broadcast errors (OK if no receivers)
        });
      // Persist latest event for sidepanel to pick up via storage change
      chrome.storage.local
        .set({
          aipex_last_capture_event: { data: message.data, ts: Date.now() },
        })
        .catch((err) => {
          console.warn("⚠️ Failed to persist capture event:", err);
        });
    } catch (err) {
      console.error("❌ Failed to echo capture event:", err);
      sendResponse({
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    return true;
  }

  // Relay a message to the active tab's content script
  if (message.request === "relay-to-active-tab") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (tabId && message.message) {
        chrome.tabs
          .sendMessage(tabId, message.message)
          .then(() => sendResponse({ success: true }))
          .catch((err) => {
            sendResponse({
              success: false,
              error: err instanceof Error ? err.message : String(err),
            });
          });
      } else {
        sendResponse({ success: false, error: "No active tab" });
      }
    });
    return true;
  }

  // Recording lifecycle markers
  if (message.request === "start-recording") {
    isRecording = true;
    sendResponse({ success: true });
    return true;
  }
  if (message.request === "stop-recording") {
    isRecording = false;
    sendResponse({ success: true });
    return true;
  }

  return false;
});

// =============================================================================
// External Message Listener - Website Integration
// =============================================================================
// Origin verification is handled by manifest.json's externally_connectable
chrome.runtime.onMessageExternal.addListener(
  (message, sender, sendResponse) => {
    // Handle "openWithPrompt" action from website
    if (message.action === "openWithPrompt") {
      const prompt = message.prompt;

      if (!prompt || typeof prompt !== "string") {
        sendResponse({ success: false, error: "Invalid prompt" });
        return true;
      }

      // Save prompt to chrome.storage.local with timestamp
      chrome.storage.local.set(
        {
          "aipex-pending-prompt": prompt,
          "aipex-pending-prompt-timestamp": Date.now(),
        },
        () => {
          if (chrome.runtime.lastError) {
            sendResponse({
              success: false,
              error: chrome.runtime.lastError.message,
            });
            return;
          }

          // Open sidepanel
          const windowId = sender.tab?.windowId;

          if (!windowId) {
            chrome.windows
              .getCurrent()
              .then((window) => {
                if (window.id) {
                  return chrome.sidePanel.open({ windowId: window.id });
                }
                throw new Error("No window ID available");
              })
              .then(() => {
                sendResponse({ success: true });
              })
              .catch((error) => {
                sendResponse({ success: false, error: error.message });
              });
          } else {
            chrome.sidePanel
              .open({ windowId })
              .then(() => {
                sendResponse({ success: true });
              })
              .catch((error) => {
                sendResponse({ success: false, error: error.message });
              });
          }
        },
      );

      return true; // Keep message channel open for async response
    }

    sendResponse({ success: false, error: "Unknown action" });
    return true;
  },
);

console.log("AIPex background service worker started");
