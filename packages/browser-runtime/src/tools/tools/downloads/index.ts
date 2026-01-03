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

// TODO: Uncomment and convert these tools when needed
// - getDownloadTool
// - pauseDownloadTool
// - resumeDownloadTool
// - removeDownloadTool
// - getDownloadStatsTool
// - downloadImageTool
