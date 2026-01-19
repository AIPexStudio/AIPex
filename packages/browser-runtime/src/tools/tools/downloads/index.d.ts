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
export declare function getAllDownloads(): Promise<{
  success: boolean;
  downloads?: DownloadInfo[];
  error?: string;
}>;
/**
 * Open download file
 */
export declare function openDownload(downloadId: number): Promise<{
  success: boolean;
  error?: string;
}>;
/**
 * Show download in folder
 */
export declare function showDownloadInFolder(downloadId: number): Promise<{
  success: boolean;
  error?: string;
}>;
/**
 * Cancel download
 */
export declare function cancelDownload(downloadId: number): Promise<{
  success: boolean;
  error?: string;
}>;
/**
 * Download text content as markdown file
 */
export declare function downloadTextAsMarkdown(
  text: string,
  filename?: string,
): Promise<{
  success: boolean;
  downloadId?: number;
  error?: string;
  finalPath?: string;
}>;
export declare const getAllDownloadsTool: import("@openai/agents").FunctionTool<
  unknown,
  z.ZodObject<{}, z.core.$strip>,
  string
>;
export declare const openDownloadTool: import("@openai/agents").FunctionTool<
  unknown,
  z.ZodObject<
    {
      downloadId: z.ZodNumber;
    },
    z.core.$strip
  >,
  string
>;
export declare const showDownloadInFolderTool: import("@openai/agents").FunctionTool<
  unknown,
  z.ZodObject<
    {
      downloadId: z.ZodNumber;
    },
    z.core.$strip
  >,
  string
>;
export declare const cancelDownloadTool: import("@openai/agents").FunctionTool<
  unknown,
  z.ZodObject<
    {
      downloadId: z.ZodNumber;
    },
    z.core.$strip
  >,
  string
>;
export declare const downloadTextAsMarkdownTool: import("@openai/agents").FunctionTool<
  unknown,
  z.ZodObject<
    {
      text: z.ZodString;
      filename: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    },
    z.core.$strip
  >,
  string
>;
/**
 * Download an image from base64 data
 */
export declare const downloadImageTool: import("@openai/agents").FunctionTool<
  unknown,
  z.ZodObject<
    {
      imageData: z.ZodString;
      filename: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      folderPath: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    },
    z.core.$strip
  >,
  string
>;
/**
 * Download chat images in batch
 */
export declare const downloadChatImagesTool: import("@openai/agents").FunctionTool<
  unknown,
  z.ZodObject<
    {
      messages: z.ZodArray<
        z.ZodObject<
          {
            id: z.ZodString;
            parts: z.ZodOptional<
              z.ZodNullable<
                z.ZodArray<
                  z.ZodObject<
                    {
                      type: z.ZodString;
                      imageData: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                      imageTitle: z.ZodOptional<z.ZodNullable<z.ZodString>>;
                    },
                    z.core.$strip
                  >
                >
              >
            >;
          },
          z.core.$strip
        >
      >;
      folderPrefix: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      filenamingStrategy: z.ZodOptional<
        z.ZodNullable<
          z.ZodEnum<{
            timestamp: "timestamp";
            descriptive: "descriptive";
            sequential: "sequential";
          }>
        >
      >;
    },
    z.core.$strip
  >,
  string
>;
/**
 * Download images from current chat
 */
export declare const downloadCurrentChatImagesTool: import("@openai/agents").FunctionTool<
  unknown,
  z.ZodObject<
    {
      folderPrefix: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    },
    z.core.$strip
  >,
  string
>;
