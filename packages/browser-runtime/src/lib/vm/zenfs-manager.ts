/**
 * ZenFS Manager
 * Manages the virtual file system backed by IndexedDB
 */

import { configure, fs } from "@zenfs/core";
import { IndexedDB } from "@zenfs/dom";
import type { FileStats } from "./skill-api";

class ZenFSManager {
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize ZenFS with IndexedDB backend
   * This should be called once at application startup
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initialize();
    return this.initPromise;
  }

  private async _initialize(): Promise<void> {
    try {
      console.log("[ZenFS] Initializing file system...");

      await configure({
        mounts: {
          "/skills": {
            backend: IndexedDB,
            storeName: "aipex-skills-fs",
          },
        },
      });

      // Ensure skills directory exists
      try {
        await fs.promises.mkdir("/skills", { recursive: true });
      } catch (err: any) {
        // Directory might already exist, ignore
        if (err.code !== "EEXIST") {
          throw err;
        }
      }

      this.initialized = true;
      console.log("[ZenFS] File system initialized successfully");
    } catch (error) {
      console.error("[ZenFS] Failed to initialize:", error);
      this.initPromise = null;
      throw error;
    }
  }

  /**
   * Ensure ZenFS is initialized before operations
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Get the skill directory path
   */
  getSkillPath(skillId: string): string {
    return `/skills/${skillId}`;
  }

  /**
   * Read a file from the file system
   */
  async readFile(
    path: string,
    encoding?: BufferEncoding,
  ): Promise<string | Buffer> {
    await this.ensureInitialized();

    try {
      if (encoding) {
        return await fs.promises.readFile(path, encoding);
      }
      return await fs.promises.readFile(path);
    } catch (error: any) {
      console.error(`[ZenFS] Failed to read file: ${path}`, error);
      throw new Error(`Failed to read file: ${path} - ${error.message}`);
    }
  }

  /**
   * Write a file to the file system
   */
  async writeFile(path: string, data: string | Uint8Array): Promise<void> {
    await this.ensureInitialized();

    try {
      // Ensure parent directory exists
      const parentDir = path.substring(0, path.lastIndexOf("/"));
      if (parentDir && parentDir !== "/skills") {
        await fs.promises.mkdir(parentDir, { recursive: true });
      }

      await fs.promises.writeFile(path, data);
      console.log(`[ZenFS] File written: ${path}`);
    } catch (error: any) {
      console.error(`[ZenFS] Failed to write file: ${path}`, error);
      throw new Error(`Failed to write file: ${path} - ${error.message}`);
    }
  }

  /**
   * Check if a file or directory exists
   */
  async exists(path: string): Promise<boolean> {
    await this.ensureInitialized();

    try {
      await fs.promises.stat(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read directory contents
   */
  async readdir(path: string): Promise<string[]> {
    await this.ensureInitialized();

    try {
      return await fs.promises.readdir(path);
    } catch (error: any) {
      console.error(`[ZenFS] Failed to read directory: ${path}`, error);
      throw new Error(`Failed to read directory: ${path} - ${error.message}`);
    }
  }

  /**
   * Create a directory
   */
  async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    await this.ensureInitialized();

    try {
      await fs.promises.mkdir(path, options);
      console.log(`[ZenFS] Directory created: ${path}`);
    } catch (error: any) {
      if (error.code !== "EEXIST") {
        console.error(`[ZenFS] Failed to create directory: ${path}`, error);
        throw new Error(
          `Failed to create directory: ${path} - ${error.message}`,
        );
      }
    }
  }

  /**
   * Remove a file or directory
   */
  async rm(path: string, options?: { recursive?: boolean }): Promise<void> {
    await this.ensureInitialized();

    try {
      const stat = await fs.promises.stat(path);

      if (stat.isDirectory()) {
        // Use rmdir - recursive deletion
        if (options?.recursive) {
          // Recursively delete directory contents first
          const entries = await fs.promises.readdir(path);
          for (const entry of entries) {
            const fullPath = `${path}/${entry}`;
            await this.rm(fullPath, { recursive: true });
          }
        }
        await fs.promises.rmdir(path);
      } else {
        await fs.promises.unlink(path);
      }

      console.log(`[ZenFS] Removed: ${path}`);
    } catch (error: any) {
      console.error(`[ZenFS] Failed to remove: ${path}`, error);
      throw new Error(`Failed to remove: ${path} - ${error.message}`);
    }
  }

  /**
   * Get file stats
   */
  async stat(path: string): Promise<{
    isFile: boolean;
    isDirectory: boolean;
    size: number;
    mtime: Date;
  }> {
    await this.ensureInitialized();

    try {
      const stats = await fs.promises.stat(path);
      return {
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        size: stats.size,
        mtime: stats.mtime,
      };
    } catch (error: any) {
      console.error(`[ZenFS] Failed to stat: ${path}`, error);
      throw new Error(`Failed to stat: ${path} - ${error.message}`);
    }
  }

  /**
   * Get file stats synchronously
   */
  statSync(path: string): FileStats {
    const stats = fs.statSync(path);
    return {
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      size: stats.size,
      mtime: stats.mtime,
    };
  }

  /**
   * Check if a file or directory exists synchronously
   */
  existsSync(path: string): boolean {
    return fs.existsSync(path);
  }

  /**
   * Read a file synchronously
   */
  readFileSync(path: string, encoding?: BufferEncoding): string | Uint8Array {
    return fs.readFileSync(path, encoding);
  }

  /**
   * Write a file synchronously
   */
  writeFileSync(path: string, data: string | Uint8Array): void {
    fs.writeFileSync(path, data);
  }

  /**
   * Read directory contents synchronously
   */
  readdirSync(path: string): string[] {
    return fs.readdirSync(path);
  }

  /**
   * Create a directory synchronously
   */
  mkdirSync(path: string, options?: { recursive?: boolean }): void {
    fs.mkdirSync(path, options);
  }

  /**
   * Remove a file or directory synchronously
   */
  rmSync(path: string, options?: { recursive?: boolean }): void {
    fs.rmSync(path, options);
  }

  /**
   * Clear all files for a specific skill
   */
  async clearSkill(skillId: string): Promise<void> {
    await this.ensureInitialized();

    const skillPath = this.getSkillPath(skillId);

    try {
      const exists = await this.exists(skillPath);
      if (exists) {
        await this.rm(skillPath, { recursive: true });
        console.log(`[ZenFS] Cleared skill directory: ${skillPath}`);
      }
    } catch (error: any) {
      console.error(`[ZenFS] Failed to clear skill: ${skillId}`, error);
      throw new Error(`Failed to clear skill: ${skillId} - ${error.message}`);
    }
  }

  /**
   * List all skill IDs
   */
  async listSkills(): Promise<string[]> {
    await this.ensureInitialized();

    try {
      const entries = await fs.promises.readdir("/skills");
      return entries.filter((entry) => entry !== "." && entry !== "..");
    } catch (error: any) {
      console.error("[ZenFS] Failed to list skills:", error);
      return [];
    }
  }

  /**
   * Get all files in a skill directory recursively
   */
  async getSkillFiles(skillId: string): Promise<Map<string, string | Buffer>> {
    await this.ensureInitialized();

    const skillPath = this.getSkillPath(skillId);
    const files = new Map<string, string | Buffer>();

    const exists = await this.exists(skillPath);
    if (!exists) {
      return files;
    }

    await this._readDirRecursive(skillPath, skillPath, files);
    return files;
  }

  /**
   * Recursively read directory contents
   */
  private async _readDirRecursive(
    basePath: string,
    currentPath: string,
    files: Map<string, string | Buffer>,
  ): Promise<void> {
    const entries = await fs.promises.readdir(currentPath);

    for (const entry of entries) {
      const fullPath = `${currentPath}/${entry}`;
      const stat = await fs.promises.stat(fullPath);

      if (stat.isDirectory()) {
        await this._readDirRecursive(basePath, fullPath, files);
      } else {
        // Store relative path (without /skills/{skillId}/ prefix)
        const relativePath = fullPath.substring(basePath.length + 1);
        const content = await fs.promises.readFile(fullPath);
        files.set(relativePath, content);
      }
    }
  }

  /**
   * File tree node structure for visualization
   */
  async getFileTree(basePath: string = "/skills"): Promise<FileTreeNode[]> {
    await this.ensureInitialized();

    const exists = await this.exists(basePath);
    if (!exists) {
      return [];
    }

    return await this._buildFileTree(basePath);
  }

  /**
   * Build file tree structure recursively
   */
  private async _buildFileTree(currentPath: string): Promise<FileTreeNode[]> {
    const entries = await fs.promises.readdir(currentPath);
    const nodes: FileTreeNode[] = [];

    for (const entry of entries) {
      if (entry === "." || entry === "..") continue;

      const fullPath = `${currentPath}/${entry}`;
      const stat = await fs.promises.stat(fullPath);

      const node: FileTreeNode = {
        name: entry,
        path: fullPath,
        type: stat.isDirectory() ? "directory" : "file",
        size: stat.size,
        mtime: stat.mtime,
        children: stat.isDirectory()
          ? await this._buildFileTree(fullPath)
          : undefined,
      };

      nodes.push(node);
    }

    // Sort: directories first, then by name
    nodes.sort((a, b) => {
      if (a.type === "directory" && b.type !== "directory") return -1;
      if (a.type !== "directory" && b.type === "directory") return 1;
      return a.name.localeCompare(b.name);
    });

    return nodes;
  }

  /**
   * Get detailed file information
   */
  async getFileInfo(path: string): Promise<FileInfo> {
    await this.ensureInitialized();

    const stat = await this.stat(path);
    const isText = await this._isTextFile(path);

    const info: FileInfo = {
      path,
      name: path.split("/").pop() || path,
      type: stat.isDirectory ? "directory" : "file",
      size: stat.size,
      mtime: stat.mtime,
      isText,
      content: undefined,
    };

    // Read content if it's a text file and small enough (< 1MB)
    if (isText && !stat.isDirectory && stat.size < 1024 * 1024) {
      try {
        const content = await fs.promises.readFile(path, "utf-8");
        info.content = content;
      } catch (error) {
        console.error(`Failed to read file content: ${path}`, error);
      }
    }

    return info;
  }

  /**
   * Check if a file is likely a text file based on extension
   */
  private async _isTextFile(path: string): Promise<boolean> {
    const textExtensions = [
      ".txt",
      ".md",
      ".js",
      ".ts",
      ".tsx",
      ".jsx",
      ".json",
      ".html",
      ".css",
      ".scss",
      ".yaml",
      ".yml",
      ".xml",
      ".svg",
      ".csv",
      ".log",
      ".sh",
      ".py",
      ".java",
      ".c",
      ".cpp",
      ".h",
      ".hpp",
      ".go",
      ".rs",
      ".php",
      ".rb",
      ".lua",
    ];

    const ext = path.substring(path.lastIndexOf(".")).toLowerCase();
    return textExtensions.includes(ext);
  }

  /**
   * Rename a file or directory
   */
  async rename(oldPath: string, newPath: string): Promise<void> {
    await this.ensureInitialized();

    try {
      // Check if source exists
      const exists = await this.exists(oldPath);
      if (!exists) {
        throw new Error(`Source path does not exist: ${oldPath}`);
      }

      // Check if destination already exists
      const destExists = await this.exists(newPath);
      if (destExists) {
        throw new Error(`Destination path already exists: ${newPath}`);
      }

      // Read source content
      const stat = await fs.promises.stat(oldPath);

      if (stat.isDirectory()) {
        // For directories, we need to recursively copy and delete
        await this._copyDirectory(oldPath, newPath);
        await this.rm(oldPath, { recursive: true });
      } else {
        // For files, simple read and write
        const content = await fs.promises.readFile(oldPath);
        await fs.promises.writeFile(newPath, content);
        await fs.promises.unlink(oldPath);
      }

      console.log(`[ZenFS] Renamed: ${oldPath} -> ${newPath}`);
    } catch (error: any) {
      console.error(
        `[ZenFS] Failed to rename: ${oldPath} -> ${newPath}`,
        error,
      );
      throw new Error(`Failed to rename: ${error.message}`);
    }
  }

  /**
   * Copy a directory recursively
   */
  private async _copyDirectory(
    sourcePath: string,
    destPath: string,
  ): Promise<void> {
    // Create destination directory
    await fs.promises.mkdir(destPath, { recursive: true });

    // Read source directory
    const entries = await fs.promises.readdir(sourcePath);

    for (const entry of entries) {
      const sourceEntryPath = `${sourcePath}/${entry}`;
      const destEntryPath = `${destPath}/${entry}`;
      const stat = await fs.promises.stat(sourceEntryPath);

      if (stat.isDirectory()) {
        await this._copyDirectory(sourceEntryPath, destEntryPath);
      } else {
        const content = await fs.promises.readFile(sourceEntryPath);
        await fs.promises.writeFile(destEntryPath, content);
      }
    }
  }

  /**
   * Copy a file or directory
   */
  async copy(sourcePath: string, destPath: string): Promise<void> {
    await this.ensureInitialized();

    try {
      const exists = await this.exists(sourcePath);
      if (!exists) {
        throw new Error(`Source path does not exist: ${sourcePath}`);
      }

      const stat = await fs.promises.stat(sourcePath);

      if (stat.isDirectory()) {
        await this._copyDirectory(sourcePath, destPath);
      } else {
        const content = await fs.promises.readFile(sourcePath);
        await fs.promises.writeFile(destPath, content);
      }

      console.log(`[ZenFS] Copied: ${sourcePath} -> ${destPath}`);
    } catch (error: any) {
      console.error(
        `[ZenFS] Failed to copy: ${sourcePath} -> ${destPath}`,
        error,
      );
      throw new Error(`Failed to copy: ${error.message}`);
    }
  }

  /**
   * Get disk usage statistics
   */
  async getDiskUsage(basePath: string = "/skills"): Promise<DiskUsage> {
    await this.ensureInitialized();

    const usage: DiskUsage = {
      totalSize: 0,
      fileCount: 0,
      directoryCount: 0,
      bySkill: {},
    };

    const exists = await this.exists(basePath);
    if (!exists) {
      return usage;
    }

    await this._calculateDiskUsage(basePath, usage, basePath);

    return usage;
  }

  /**
   * Calculate disk usage recursively
   */
  private async _calculateDiskUsage(
    currentPath: string,
    usage: DiskUsage,
    basePath: string,
  ): Promise<void> {
    const entries = await fs.promises.readdir(currentPath);

    for (const entry of entries) {
      if (entry === "." || entry === "..") continue;

      const fullPath = `${currentPath}/${entry}`;
      const stat = await fs.promises.stat(fullPath);

      if (stat.isDirectory()) {
        usage.directoryCount++;

        // Track per-skill usage for direct children of /skills
        if (currentPath === basePath) {
          if (!usage.bySkill[entry]) {
            usage.bySkill[entry] = {
              size: 0,
              fileCount: 0,
              directoryCount: 0,
            };
          }
          const skillUsage = usage.bySkill[entry];
          await this._calculateSkillUsage(fullPath, skillUsage);
        } else {
          await this._calculateDiskUsage(fullPath, usage, basePath);
        }
      } else {
        usage.fileCount++;
        usage.totalSize += stat.size;
      }
    }
  }

  /**
   * Calculate usage for a specific skill
   */
  private async _calculateSkillUsage(
    skillPath: string,
    skillUsage: SkillUsage,
  ): Promise<void> {
    const entries = await fs.promises.readdir(skillPath);

    for (const entry of entries) {
      if (entry === "." || entry === "..") continue;

      const fullPath = `${skillPath}/${entry}`;
      const stat = await fs.promises.stat(fullPath);

      if (stat.isDirectory()) {
        skillUsage.directoryCount++;
        await this._calculateSkillUsage(fullPath, skillUsage);
      } else {
        skillUsage.fileCount++;
        skillUsage.size += stat.size;
      }
    }
  }
}

/**
 * Type definitions for file management
 */
export interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  mtime: Date;
  children?: FileTreeNode[];
}

export interface FileInfo {
  path: string;
  name: string;
  type: "file" | "directory";
  size: number;
  mtime: Date;
  isText: boolean;
  content?: string;
}

export interface DiskUsage {
  totalSize: number;
  fileCount: number;
  directoryCount: number;
  bySkill: Record<string, SkillUsage>;
}

export interface SkillUsage {
  size: number;
  fileCount: number;
  directoryCount: number;
}

// Singleton instance
export const zenfs = new ZenFSManager();
