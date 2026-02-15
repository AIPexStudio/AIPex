/**
 * ChatImagesListener
 *
 * Invisible component that listens for "provide-current-chat-images" messages
 * from the background service worker. When received, it extracts screenshot
 * data from the current chat messages (via ChatContext) and responds with the
 * image payloads so that the background can trigger downloads (e.g. for the
 * download_current_chat_report_zip skill tool).
 *
 * Must be rendered inside a ChatbotProvider so useChatContext() is available.
 */

import { useChatContext } from "@aipexstudio/aipex-react/components/chatbot/context";
import { useEffect } from "react";

interface ImagePayload {
  id: string;
  parts: Array<{ type: string; imageData: string; imageTitle?: string }>;
}

export function ChatImagesListener() {
  const { messages } = useChatContext();

  useEffect(() => {
    const handleRequest = (
      message: unknown,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: unknown) => void,
    ): boolean => {
      if (
        !message ||
        typeof message !== "object" ||
        (message as { request?: string }).request !==
          "provide-current-chat-images"
      ) {
        return false;
      }

      try {
        const images: ImagePayload[] = [];

        for (const msg of messages) {
          for (const part of msg.parts) {
            // Tool parts may carry screenshot data inline (screenshot field)
            // or in their output (imageData field)
            if (part.type === "tool") {
              const toolPart = part as {
                output?: unknown;
                screenshot?: string;
                toolName?: string;
              };

              // Prefer the inline screenshot field (set by ChatAdapter)
              const screenshotData = toolPart.screenshot;
              if (
                screenshotData &&
                typeof screenshotData === "string" &&
                screenshotData.startsWith("data:image/")
              ) {
                images.push({
                  id: msg.id,
                  parts: [
                    {
                      type: "image",
                      imageData: screenshotData,
                      imageTitle: toolPart.toolName || "Screenshot",
                    },
                  ],
                });
              } else {
                // Fall back to extracting from output
                const output = toolPart.output;
                if (
                  output &&
                  typeof output === "object" &&
                  "imageData" in output
                ) {
                  const imageData = (output as { imageData?: string })
                    .imageData;
                  if (
                    imageData &&
                    typeof imageData === "string" &&
                    imageData.startsWith("data:image/")
                  ) {
                    images.push({
                      id: msg.id,
                      parts: [
                        {
                          type: "image",
                          imageData,
                          imageTitle: toolPart.toolName || "Screenshot",
                        },
                      ],
                    });
                  }
                }
              }
            }

            // Also look for file parts with image data
            if (part.type === "file") {
              const filePart = part as {
                mediaType?: string;
                url?: string;
                filename?: string;
              };
              if (
                filePart.url &&
                filePart.url.startsWith("data:image/") &&
                filePart.mediaType?.startsWith("image/")
              ) {
                images.push({
                  id: msg.id,
                  parts: [
                    {
                      type: "image",
                      imageData: filePart.url,
                      imageTitle: filePart.filename || "Image",
                    },
                  ],
                });
              }
            }
          }
        }

        sendResponse({ images });
      } catch (error) {
        console.error("[ChatImagesListener] Error extracting images:", error);
        sendResponse({ images: [], error: String(error) });
      }

      return true; // Keep channel open for async response
    };

    chrome.runtime.onMessage.addListener(handleRequest);
    return () => {
      chrome.runtime.onMessage.removeListener(handleRequest);
    };
  }, [messages]);

  // Render nothing – this is a listener-only component
  return null;
}
