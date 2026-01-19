/**
 * File Manager Adapter Types
 *
 * These interfaces define the contract between UI components and file system implementations.
 */

/**
 * File tree node structure
 */
export interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  modifiedAt?: number;
  children?: FileTreeNode[];
}

/**
 * File information
 */
export interface FileInfo {
  path: string;
  name: string;
  type: "file" | "directory";
  size: number;
  modifiedAt: number;
  content?: string;
}

/**
 * Disk usage statistics
 */
export interface DiskUsage {
  totalSize: number;
  fileCount: number;
  directoryCount: number;
  bySkill: Record<string, SkillUsage>;
}

/**
 * Per-skill disk usage
 */
export interface SkillUsage {
  size: number;
  fileCount: number;
  directoryCount: number;
}

/**
 * File stats (similar to Node.js fs.Stats)
 */
export interface FileStats {
  isDirectory: boolean;
  isFile: boolean;
  size: number;
  mtime: Date | number;
}

/**
 * Client interface for file system operations
 *
 * UI components receive this interface and call its methods.
 * Browser-ext provides the implementation using zenfs.
 */
export interface FileSystemClient {
  /**
   * Initialize the file system
   */
  initialize(): Promise<void>;

  /**
   * Get file tree for a base path
   */
  getFileTree(basePath: string): Promise<FileTreeNode[]>;

  /**
   * Get disk usage statistics
   */
  getDiskUsage(basePath: string): Promise<DiskUsage>;

  /**
   * Read file content
   */
  readFile(path: string, encoding?: "utf8"): Promise<string | ArrayBuffer>;

  /**
   * Remove file or directory
   */
  rm(path: string, options?: { recursive?: boolean }): Promise<void>;

  /**
   * Check if file or directory exists
   */
  exists(path: string): Promise<boolean>;

  /**
   * Get file stats
   */
  stat(path: string): Promise<FileStats>;

  /**
   * Read directory contents
   */
  readdir(path: string): Promise<string[]>;
}
