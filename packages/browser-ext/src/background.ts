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

    // Open onboarding page for new installs in production
    if (import.meta.env.PROD) {
      chrome.tabs.create({ url: "https://www.claudechrome.com" });
    }
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

  // Open sidepanel on demand (e.g. from content script)
  if (message.request === "open-sidepanel") {
    (async () => {
      try {
        const tabId = _sender.tab?.id;
        if (tabId) {
          await chrome.sidePanel.open({ tabId });
        } else {
          const window = await chrome.windows.getCurrent();
          if (window.id) {
            await chrome.sidePanel.open({ windowId: window.id });
          }
        }
        sendResponse({ success: true });
      } catch (error) {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    })();
    return true;
  }

  // Collect screenshots from sidepanel and trigger downloads
  if (message.request === "get-current-chat-images-for-download") {
    (async () => {
      try {
        const { folderPrefix, imageNames, filenamingStrategy, displayResults } =
          message as {
            folderPrefix?: string;
            imageNames?: string[];
            filenamingStrategy?: string;
            displayResults?: boolean;
          };

        // Try to get images from sidepanel
        try {
          const sidepanelResponse = await chrome.runtime.sendMessage({
            request: "provide-current-chat-images",
            folderPrefix,
            imageNames,
            filenamingStrategy,
            displayResults,
          });

          if (
            sidepanelResponse?.images &&
            sidepanelResponse.images.length > 0
          ) {
            const result = await downloadChatImagesInBackground(
              sidepanelResponse.images,
              folderPrefix,
              imageNames,
            );
            sendResponse({
              success: result.success,
              downloadedCount: result.downloadedCount,
              downloadIds: result.downloadIds,
              folderPath: folderPrefix,
              filesList: result.filesList,
              error: result.errors?.join(", "),
            });
          } else {
            sendResponse({
              success: false,
              error: "No images found in current chat",
            });
          }
        } catch {
          // Fallback: try active tab content script
          try {
            const [activeTab] = await chrome.tabs.query({
              active: true,
              currentWindow: true,
            });
            if (activeTab?.id) {
              const tabResponse = await chrome.tabs.sendMessage(activeTab.id, {
                request: "provide-current-chat-images",
                folderPrefix,
                imageNames,
                filenamingStrategy,
                displayResults,
              });
              if (tabResponse?.images && tabResponse.images.length > 0) {
                const result = await downloadChatImagesInBackground(
                  tabResponse.images,
                  folderPrefix,
                  imageNames,
                );
                sendResponse({
                  success: result.success,
                  downloadedCount: result.downloadedCount,
                  downloadIds: result.downloadIds,
                  folderPath: folderPrefix,
                  filesList: result.filesList,
                  error: result.errors?.join(", "),
                });
              } else {
                sendResponse({
                  success: false,
                  error: "No images found in current chat",
                });
              }
            } else {
              sendResponse({
                success: false,
                error: "Unable to access current chat",
              });
            }
          } catch (_tabError) {
            sendResponse({
              success: false,
              error: "Unable to access current chat images",
            });
          }
        }
      } catch (error) {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    })();
    return true;
  }

  return false;
});

// =============================================================================
// Download helpers for chat image export
// =============================================================================

/**
 * Validate a path segment to prevent directory traversal and unsafe characters.
 */
function validatePathSegment(
  segment: string | undefined,
  fieldName: string,
): string | null {
  if (segment === undefined || segment === "") return null;

  const traversalPatterns = [
    "..",
    "%2e%2e",
    "%2E%2E",
    "..%2f",
    "..%5c",
    "%2f..",
    "%5c..",
  ];
  for (const pattern of traversalPatterns) {
    if (segment.toLowerCase().includes(pattern.toLowerCase())) {
      return `${fieldName} contains forbidden traversal pattern: ${pattern}`;
    }
  }
  if (segment.includes("\\"))
    return `${fieldName} must not contain backslashes`;
  if (segment.startsWith("/") || segment.endsWith("/"))
    return `${fieldName} must not have leading or trailing slashes`;
  if (segment.includes("//"))
    return `${fieldName} contains empty path segments`;

  return null;
}

async function downloadChatImagesInBackground(
  messages: Array<{
    id: string;
    parts?: Array<{
      type: string;
      imageData?: string;
      imageTitle?: string;
    }>;
  }>,
  folderPrefix?: string,
  imageNames?: string[],
): Promise<{
  success: boolean;
  downloadedCount?: number;
  downloadIds?: number[];
  errors?: string[];
  filesList?: string[];
}> {
  try {
    if (!chrome.downloads) {
      return {
        success: false,
        errors: ["Downloads permission not available."],
      };
    }

    const folderPrefixError = validatePathSegment(folderPrefix, "folderPrefix");
    if (folderPrefixError)
      return { success: false, errors: [folderPrefixError] };

    if (imageNames) {
      for (let i = 0; i < imageNames.length; i++) {
        const nameError = validatePathSegment(
          imageNames[i],
          `imageNames[${i}]`,
        );
        if (nameError) return { success: false, errors: [nameError] };
      }
    }

    const downloadIds: number[] = [];
    const errors: string[] = [];
    const filesList: string[] = [];
    let downloadedCount = 0;
    let imageIndex = 0;

    for (const message of messages) {
      if (!message.parts) continue;
      for (const part of message.parts) {
        if (part.type === "image" && part.imageData) {
          try {
            // Validate image data format
            if (!part.imageData.startsWith("data:image/")) {
              errors.push("Invalid image data format");
              imageIndex++;
              continue;
            }

            let filename: string;
            const imageName = imageNames?.[imageIndex];
            if (imageName) {
              filename = imageName
                .replace(/[^a-zA-Z0-9\u4e00-\u9fa5\s-]/g, "")
                .trim();
            } else {
              const timestamp = new Date()
                .toISOString()
                .replace(/[:.]/g, "-")
                .slice(0, -5);
              const titleSlug = part.imageTitle
                ? part.imageTitle
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-+|-+$/g, "")
                : "image";
              filename = `${titleSlug}-${timestamp}`;
            }

            const fullFilename = folderPrefix
              ? `${folderPrefix}/${filename}`
              : filename;

            const mimeMatch = part.imageData.match(/data:image\/([^;]+)/);
            const extension =
              mimeMatch?.[1] === "jpeg" ? "jpg" : (mimeMatch?.[1] ?? "png");
            const imageFilename = fullFilename.includes(".")
              ? fullFilename
              : `${fullFilename}.${extension}`;

            const downloadId = await chrome.downloads.download({
              url: part.imageData,
              filename: imageFilename,
              saveAs: true,
            });

            downloadIds.push(downloadId);
            filesList.push(imageFilename);
            downloadedCount++;
            imageIndex++;
          } catch (error) {
            errors.push(
              `Error downloading image: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
      }
    }

    return {
      success: downloadedCount > 0 || errors.length === 0,
      downloadedCount,
      downloadIds,
      filesList,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

// Global function callable from QuickJS skill runtime
(
  globalThis as Record<string, unknown>
).downloadCurrentChatImagesFromBackground = async (
  folderPrefix: string,
  imageNames?: string[],
  filenamingStrategy: string = "descriptive",
  displayResults: boolean = true,
) => {
  try {
    const sidepanelResponse = await chrome.runtime.sendMessage({
      request: "provide-current-chat-images",
      folderPrefix,
      imageNames,
      filenamingStrategy,
      displayResults,
    });

    if (sidepanelResponse?.images && sidepanelResponse.images.length > 0) {
      const result = await downloadChatImagesInBackground(
        sidepanelResponse.images,
        folderPrefix,
        imageNames,
      );
      return {
        success: result.success,
        downloadedCount: result.downloadedCount,
        downloadIds: result.downloadIds,
        folderPath: folderPrefix,
        filesList: result.filesList ?? [],
        error: result.errors?.join(", "),
      };
    }

    return { success: false, error: "No images found in current chat" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

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

    // Handle user manual replay request from website
    if (message.request === "REPLAY_USER_MANUAL") {
      const { manualId, startFromStep, steps } = message as {
        manualId?: unknown;
        startFromStep?: unknown;
        steps?: unknown;
      };

      // Validate required fields
      if (
        typeof manualId !== "number" ||
        !Array.isArray(steps) ||
        steps.length === 0
      ) {
        sendResponse({
          success: false,
          error: "Invalid replay data: manualId (number) and non-empty steps (array) are required",
        });
        return true;
      }

      // Validate step entries have required shape and bounded size
      const MAX_STEPS = 500;
      if (steps.length > MAX_STEPS) {
        sendResponse({
          success: false,
          error: `Too many replay steps (max ${MAX_STEPS})`,
        });
        return true;
      }

      const ALLOWED_EVENT_TYPES = ["click", "navigation"];
      const stepsValid = steps.every((s: unknown) => {
        if (s === null || typeof s !== "object") return false;
        const rec = s as Record<string, unknown>;
        if (!rec.event || typeof rec.event !== "object") return false;
        const event = rec.event as Record<string, unknown>;
        return (
          typeof event.type === "string" &&
          ALLOWED_EVENT_TYPES.includes(event.type)
        );
      });

      if (!stepsValid) {
        sendResponse({
          success: false,
          error:
            "Invalid replay steps: each step must contain an event with type 'click' or 'navigation'",
        });
        return true;
      }

      const resolvedStartFromStep =
        typeof startFromStep === "number" && startFromStep >= 0
          ? startFromStep
          : 0;

      // Open sidepanel then forward replay data
      const windowId = sender.tab?.windowId;

      if (!windowId) {
        sendResponse({ success: false, error: "No window ID available" });
        return true;
      }

      chrome.sidePanel
        .open({ windowId })
        .then(() => {
          // Wait for sidepanel to initialize before forwarding
          setTimeout(() => {
            chrome.runtime
              .sendMessage({
                request: "NAVIGATE_AND_SETUP_REPLAY",
                data: {
                  manualId,
                  startFromStep: resolvedStartFromStep,
                  steps,
                },
              })
              .catch(() => {
                // Sidepanel may not yet have a listener – acceptable race
              });
          }, 500);

          sendResponse({ success: true });
        })
        .catch((error) => {
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        });

      return true;
    }

    sendResponse({ success: false, error: "Unknown action" });
    return true;
  },
);

console.log("AIPex background service worker started");
