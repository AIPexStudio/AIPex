/**
 * Monitor Operation Intervention
 *
 * Listens for user operations, waits for user to click page elements
 */
import { elementCaptureService } from "../element-capture.js";

const metadata = {
  name: "Monitor User Operation",
  type: "monitor-operation",
  description:
    "Monitor user click operations on page, get clicked element info and context",
  enabled: true,
  inputSchema: {
    type: "object",
    properties: {
      reason: {
        type: "string",
        description: "Explain why user needs to click an element",
      },
      highlightColor: {
        type: "string",
        description: "Highlight color (optional)",
      },
    },
    required: [],
  },
  outputSchema: {
    type: "object",
    properties: {
      element: {
        type: "object",
        properties: {
          selector: { type: "string" },
          tagName: { type: "string" },
          id: { type: "string" },
          classes: { type: "array", items: { type: "string" } },
          text: { type: "string" },
          attributes: { type: "object" },
        },
      },
      context: {
        type: "object",
        properties: {
          url: { type: "string" },
          title: { type: "string" },
          timestamp: { type: "number" },
          tabId: { type: "number" },
        },
      },
    },
  },
  examples: [
    {
      description: "AI needs user to specify a button",
      input: {
        reason: "Please click the button you want to operate",
      },
      output: {
        element: {
          selector: "#submit-button",
          tagName: "button",
          id: "submit-button",
          classes: ["btn", "btn-primary"],
          text: "Submit",
          attributes: { type: "submit" },
        },
        context: {
          url: "https://example.com",
          title: "Example Page",
          timestamp: 1234567890,
          tabId: 123,
        },
      },
    },
  ],
};
/**
 * Execute monitoring operation
 */
async function execute(params, signal) {
  console.log("[MonitorOperation] Starting execution with params:", params);
  // Get current active tab
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs[0] || !tabs[0].id) {
    throw new Error("No active tab found");
  }
  const tabId = tabs[0].id;
  const tabUrl = tabs[0].url || "";
  const tabTitle = tabs[0].title || "";
  console.log("[MonitorOperation] Monitoring tab:", tabId, tabUrl);
  return new Promise((resolve, reject) => {
    let resolved = false;
    // Set up cancel listener
    signal.addEventListener("abort", () => {
      if (!resolved) {
        console.log("[MonitorOperation] Aborted");
        elementCaptureService.stopCapture().catch(console.error);
        resolved = true;
        reject(new Error("Monitoring cancelled"));
      }
    });
    // Start capture
    elementCaptureService
      .startCapture(
        {
          tabId,
          highlightColor:
            typeof params === "object" &&
            params !== null &&
            "highlightColor" in params
              ? params.highlightColor
              : undefined,
          captureScreenshot: true,
        },
        async (event) => {
          if (resolved) return;
          console.log("[MonitorOperation] Element captured:", event);
          // Stop capture
          await elementCaptureService.stopCapture();
          resolved = true;
          // Build result (no screenshot for AI)
          const result = {
            element: {
              selector: event.selector,
              tagName: event.tagName,
              id: event.id,
              classes: event.classes,
              text: event.text,
              attributes: event.attributes,
            },
            context: {
              url: event.url,
              title: tabTitle,
              timestamp: event.timestamp,
              tabId,
            },
          };
          resolve(result);
        },
      )
      .catch((error) => {
        if (!resolved) {
          resolved = true;
          // Provide more friendly error messages
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error("[MonitorOperation] Error:", errorMessage);
          // Provide different hints based on error type
          if (errorMessage.includes("browser internal pages")) {
            reject(
              new Error(
                "Cannot monitor operations on browser internal pages (chrome://, edge://, etc). Please navigate to a regular webpage first.",
              ),
            );
          } else if (errorMessage.includes("refresh the page")) {
            reject(
              new Error(
                "Cannot connect to the page. The page needs to be refreshed. Please ask the user to refresh the page and try again.",
              ),
            );
          } else {
            reject(error);
          }
        }
      });
  });
}
export const monitorOperationIntervention = {
  metadata,
  execute,
};
