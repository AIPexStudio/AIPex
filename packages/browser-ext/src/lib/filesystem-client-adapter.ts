/**
 * FileSystemClient Adapter Implementation
 *
 * Adapts browser-runtime zenfs to the FileSystemClient interface
 * used by aipex-react UI components.
 */

import type {
  DiskUsage,
  FileStats,
  FileSystemClient,
  FileTreeNode,
} from "@aipexstudio/aipex-react";
import { zenfs } from "@aipexstudio/browser-runtime";

export class FileSystemClientAdapter implements FileSystemClient {
  async initialize(): Promise<void> {
    await zenfs.initialize();
  }

  async getFileTree(basePath: string): Promise<FileTreeNode[]> {
    return await zenfs.getFileTree(basePath);
  }

  async getDiskUsage(basePath: string): Promise<DiskUsage> {
    return await zenfs.getDiskUsage(basePath);
  }

  async readFile(
    path: string,
    encoding?: "utf8",
  ): Promise<string | ArrayBuffer> {
    const result = await zenfs.readFile(path, encoding);
    // Convert Buffer to ArrayBuffer if needed
    if (result instanceof Buffer) {
      const uint8Array = new Uint8Array(result);
      return uint8Array.buffer as ArrayBuffer;
    }
    return result as string | ArrayBuffer;
  }

  async rm(path: string, options?: { recursive?: boolean }): Promise<void> {
    await zenfs.rm(path, options);
  }

  async exists(path: string): Promise<boolean> {
    return await zenfs.exists(path);
  }

  async stat(path: string): Promise<FileStats> {
    const stats = await zenfs.stat(path);
    return {
      isDirectory: stats.isDirectory,
      isFile: stats.isFile,
      size: stats.size,
      mtime: stats.mtime,
    };
  }

  async readdir(path: string): Promise<string[]> {
    return await zenfs.readdir(path);
  }
}

// Export singleton instance
export const fileSystemClientAdapter = new FileSystemClientAdapter();
