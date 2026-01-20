import { tool } from "@aipexstudio/aipex-core";
import { z } from "zod";

interface DownloadInfo {
  id: number;
  filename: string;
  url: string;
  fileSize: number;
  startTime: string;
  endTime?: string;
  state: string;
  progress: number;
}

/**
 * Get all downloads
 */
export async function getAllDownloads(): Promise<{
  success: boolean;
  downloads?: DownloadInfo[];
  error?: string;
}> {
  try {
    if (!chrome.downloads) {
      return {
        success: false,
        error:
          "Downloads permission not available. Please check extension permissions.",
      };
    }

    const downloads = await chrome.downloads.search({});

    const downloadData = downloads.map((download) => ({
      id: download.id,
      filename: download.filename,
      url: download.url,
      fileSize: download.fileSize || 0,
      startTime: download.startTime,
      endTime: download.endTime,
      state: download.state,
      progress: (download.bytesReceived / (download.totalBytes || 1)) * 100,
    }));

    return { success: true, downloads: downloadData };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Open download file
 */
export async function openDownload(downloadId: number): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await chrome.downloads.open(downloadId);
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Show download in folder
 */
export async function showDownloadInFolder(downloadId: number): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await chrome.downloads.show(downloadId);
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Cancel download
 */
export async function cancelDownload(downloadId: number): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await chrome.downloads.cancel(downloadId);
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Download text content as markdown file
 */
export async function downloadTextAsMarkdown(
  text: string,
  filename?: string,
): Promise<{
  success: boolean;
  downloadId?: number;
  error?: string;
  finalPath?: string;
}> {
  try {
    if (!chrome.downloads) {
      return {
        success: false,
        error:
          "Downloads permission not available. Please check extension permissions.",
      };
    }

    if (!text || typeof text !== "string") {
      return {
        success: false,
        error: "Text content is required and must be a string",
      };
    }

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);
    const baseFilename = filename || `text-${timestamp}`;

    const mdFilename = baseFilename.endsWith(".md")
      ? baseFilename
      : `${baseFilename}.md`;

    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(text);
    const base64String = btoa(
      String.fromCharCode.apply(null, Array.from(uint8Array)),
    );
    const dataUri = `data:text/markdown;charset=utf-8;base64,${base64String}`;

    const downloadId = await chrome.downloads.download({
      url: dataUri,
      filename: mdFilename,
      saveAs: true,
    });

    return {
      success: true,
      downloadId: downloadId,
      finalPath: mdFilename,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Export the most commonly used tools
export const getAllDownloadsTool = tool({
  name: "get_all_downloads",
  description: "Get all downloads",
  parameters: z.object({}),
  execute: async () => {
    return await getAllDownloads();
  },
});

export const openDownloadTool = tool({
  name: "open_download",
  description: "Open a downloaded file",
  parameters: z.object({
    downloadId: z.number().describe("ID of the download to open"),
  }),
  execute: async ({ downloadId }: { downloadId: number }) => {
    return await openDownload(downloadId);
  },
});

export const showDownloadInFolderTool = tool({
  name: "show_download_in_folder",
  description: "Show download in folder",
  parameters: z.object({
    downloadId: z.number().describe("ID of the download to show in folder"),
  }),
  execute: async ({ downloadId }: { downloadId: number }) => {
    return await showDownloadInFolder(downloadId);
  },
});

export const cancelDownloadTool = tool({
  name: "cancel_download",
  description: "Cancel a download",
  parameters: z.object({
    downloadId: z.number().describe("ID of the download to cancel"),
  }),
  execute: async ({ downloadId }: { downloadId: number }) => {
    return await cancelDownload(downloadId);
  },
});

export const downloadTextAsMarkdownTool = tool({
  name: "download_text_as_markdown",
  description: "Download text content as a markdown file",
  parameters: z.object({
    text: z.string().describe("Text content to download"),
    filename: z
      .string()
      .nullable()
      .optional()
      .describe("Filename for the markdown file"),
  }),
  execute: async ({ text, filename }: { text: string; filename?: string }) => {
    return await downloadTextAsMarkdown(text, filename);
  },
});

/**
 * Download an image from base64 data to the user's local filesystem
 */
export const downloadImageTool = tool({
  name: "download_image",
  description:
    "Download an image from base64 data to the user's local filesystem",
  parameters: z.object({
    imageData: z
      .string()
      .regex(/^data:image\//)
      .describe("The base64 image data URL (data:image/...)"),
    filename: z
      .string()
      .nullable()
      .optional()
      .describe("Descriptive filename for the download (without extension)"),
    folderPath: z
      .string()
      .nullable()
      .optional()
      .describe("Optional folder path for organizing downloads"),
  }),
  execute: async ({
    imageData,
    filename,
    folderPath,
  }: {
    imageData: string;
    filename?: string;
    folderPath?: string;
  }) => {
    try {
      if (!chrome.downloads) {
        return {
          success: false,
          error:
            "Downloads permission not available. Please check extension permissions.",
        };
      }

      if (!imageData || typeof imageData !== "string") {
        return {
          success: false,
          error: "Image data is required and must be a string",
        };
      }

      if (!imageData.startsWith("data:image/")) {
        return {
          success: false,
          error: "Invalid image data format. Expected data:image/ URI",
        };
      }

      const mimeMatch = imageData.match(/data:image\/([^;]+)/);
      const imageFormat = mimeMatch ? mimeMatch[1] : "png";

      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, -5);
      const baseFilename = filename || `image-${timestamp}`;
      const extension = imageFormat === "jpeg" ? "jpg" : imageFormat;
      const imageFilename = baseFilename.includes(".")
        ? baseFilename
        : `${baseFilename}.${extension}`;
      const finalPath = folderPath
        ? `${folderPath}/${imageFilename}`
        : imageFilename;

      // Align with aipex: saveAs: true to show save dialog
      const downloadId = await chrome.downloads.download({
        url: imageData,
        filename: finalPath,
        saveAs: true,
      });

      return {
        success: true,
        downloadId,
        finalPath,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

/**
 * Download multiple images from chat messages to the user's local filesystem
 */
export const downloadChatImagesTool = tool({
  name: "download_chat_images",
  description:
    "Download multiple images from chat messages to the user's local filesystem",
  parameters: z.object({
    messages: z
      .array(
        z.object({
          id: z.string().describe("Message ID"),
          parts: z
            .array(
              z.object({
                type: z
                  .string()
                  .describe("Part type (should be 'image' for image parts)"),
                imageData: z
                  .string()
                  .nullable()
                  .optional()
                  .describe("Base64 image data URL"),
                imageTitle: z
                  .string()
                  .nullable()
                  .optional()
                  .describe("Descriptive title for the image"),
              }),
            )
            .nullable()
            .optional()
            .describe("Message parts that may contain images"),
        }),
      )
      .describe("Array of chat messages containing images"),
    folderPrefix: z
      .string()
      .nullable()
      .optional()
      .describe("Descriptive folder name for organizing downloads"),
    filenamingStrategy: z
      .enum(["descriptive", "sequential", "timestamp"])
      .default("descriptive")
      .describe("Strategy for naming files"),
    displayResults: z
      .boolean()
      .default(true)
      .describe("Whether to display the download results"),
  }),
  execute: async ({
    messages,
    folderPrefix,
    filenamingStrategy = "descriptive",
    displayResults = true,
  }: {
    messages: Array<{
      id: string;
      parts?: Array<{
        type: string;
        imageData?: string;
        imageTitle?: string;
      }>;
    }>;
    folderPrefix?: string;
    filenamingStrategy?: "descriptive" | "sequential" | "timestamp";
    displayResults?: boolean;
  }) => {
    try {
      if (!chrome.downloads) {
        return {
          success: false,
          errors: [
            "Downloads permission not available. Please check extension permissions.",
          ],
        };
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
              imageIndex++;

              const timestamp = new Date()
                .toISOString()
                .replace(/[:.]/g, "-")
                .slice(0, -5);
              const titleSlug = part.imageTitle
                ? part.imageTitle
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-+|-+$/g, "")
                : `image-${imageIndex}`;

              let baseFilename: string;
              switch (filenamingStrategy) {
                case "sequential":
                  baseFilename = `image-${String(imageIndex).padStart(3, "0")}`;
                  break;
                case "timestamp":
                  baseFilename = `image-${timestamp}`;
                  break;
                default:
                  baseFilename = titleSlug;
                  break;
              }

              const mimeMatch = part.imageData.match(/data:image\/([^;]+)/);
              const imageFormat = mimeMatch ? mimeMatch[1] : "png";
              const fullFilename = `${baseFilename}.${imageFormat}`;
              const finalPath = folderPrefix
                ? `${folderPrefix}/${fullFilename}`
                : fullFilename;

              const downloadId = await chrome.downloads.download({
                url: part.imageData,
                filename: finalPath,
                saveAs: false,
              });

              downloadIds.push(downloadId);
              filesList.push(finalPath);
              downloadedCount++;
            } catch (error: unknown) {
              errors.push(
                `Failed to download image ${imageIndex}: ${error instanceof Error ? error.message : String(error)}`,
              );
            }
          }
        }
      }

      // Format response with optional display message (align with aipex)
      const responseData: {
        downloadedCount: number;
        downloadIds: number[];
        errors?: string[];
        message?: string;
        folderPath?: string;
        filesList?: string[];
      } = {
        downloadedCount,
        downloadIds,
        errors: errors.length > 0 ? errors : undefined,
        folderPath: folderPrefix,
        filesList: filesList.length > 0 ? filesList : undefined,
      };

      if (displayResults) {
        responseData.message =
          `Successfully downloaded ${downloadedCount || 0} images from chat messages\n\n` +
          `📁 Download Summary:\n` +
          `- Folder: ${folderPrefix || "Default"}\n` +
          `- Files: ${downloadedCount || 0}\n` +
          `- Strategy: ${filenamingStrategy}\n` +
          (filesList.length > 0 ? `- Files: ${filesList.join(", ")}` : "");
      }

      return {
        success: downloadedCount > 0 || errors.length === 0,
        ...responseData,
      };
    } catch (error: unknown) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  },
});

/**
 * Download images from current chat
 */
export const downloadCurrentChatImagesTool = tool({
  name: "download_current_chat_images",
  description: "Download all images from the current chat conversation",
  parameters: z.object({
    folderPrefix: z
      .string()
      .nullable()
      .optional()
      .describe("Optional folder prefix for organizing downloads"),
  }),
  execute: async ({
    folderPrefix: _folderPrefix,
  }: {
    folderPrefix?: string;
  }) => {
    // This is a placeholder - actual implementation would need to access chat context
    return {
      success: false,
      message:
        "This tool requires integration with the chat system to access current conversation images",
    };
  },
});
