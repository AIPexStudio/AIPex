/**
 * ZenFS Manager
 * Manages the virtual file system backed by IndexedDB
 */
import type { FileStats } from "./skill-api";
declare class ZenFSManager {
    private initialized;
    private initPromise;
    /**
     * Initialize ZenFS with IndexedDB backend
     * This should be called once at application startup
     */
    initialize(): Promise<void>;
    private _initialize;
    /**
     * Ensure ZenFS is initialized before operations
     */
    private ensureInitialized;
    /**
     * Get the skill directory path
     */
    getSkillPath(skillId: string): string;
    /**
     * Read a file from the file system
     */
    readFile(path: string, encoding?: BufferEncoding): Promise<string | Buffer>;
    /**
     * Write a file to the file system
     */
    writeFile(path: string, data: string | Uint8Array): Promise<void>;
    /**
     * Check if a file or directory exists
     */
    exists(path: string): Promise<boolean>;
    /**
     * Read directory contents
     */
    readdir(path: string): Promise<string[]>;
    /**
     * Create a directory
     */
    mkdir(path: string, options?: {
        recursive?: boolean;
    }): Promise<void>;
    /**
     * Remove a file or directory
     */
    rm(path: string, options?: {
        recursive?: boolean;
    }): Promise<void>;
    /**
     * Get file stats
     */
    stat(path: string): Promise<{
        isFile: boolean;
        isDirectory: boolean;
        size: number;
        mtime: Date;
    }>;
    /**
     * Get file stats synchronously
     */
    statSync(path: string): FileStats;
    /**
     * Check if a file or directory exists synchronously
     */
    existsSync(path: string): boolean;
    /**
     * Read a file synchronously
     */
    readFileSync(path: string, encoding?: BufferEncoding): string | Uint8Array;
    /**
     * Write a file synchronously
     */
    writeFileSync(path: string, data: string | Uint8Array): void;
    /**
     * Read directory contents synchronously
     */
    readdirSync(path: string): string[];
    /**
     * Create a directory synchronously
     */
    mkdirSync(path: string, options?: {
        recursive?: boolean;
    }): void;
    /**
     * Remove a file or directory synchronously
     */
    rmSync(path: string, options?: {
        recursive?: boolean;
    }): void;
    /**
     * Clear all files for a specific skill
     */
    clearSkill(skillId: string): Promise<void>;
    /**
     * List all skill IDs
     */
    listSkills(): Promise<string[]>;
    /**
     * Get all files in a skill directory recursively
     */
    getSkillFiles(skillId: string): Promise<Map<string, string | Buffer>>;
    /**
     * Recursively read directory contents
     */
    private _readDirRecursive;
    /**
     * File tree node structure for visualization
     */
    getFileTree(basePath?: string): Promise<FileTreeNode[]>;
    /**
     * Build file tree structure recursively
     */
    private _buildFileTree;
    /**
     * Get detailed file information
     */
    getFileInfo(path: string): Promise<FileInfo>;
    /**
     * Check if a file is likely a text file based on extension
     */
    private _isTextFile;
    /**
     * Rename a file or directory
     */
    rename(oldPath: string, newPath: string): Promise<void>;
    /**
     * Copy a directory recursively
     */
    private _copyDirectory;
    /**
     * Copy a file or directory
     */
    copy(sourcePath: string, destPath: string): Promise<void>;
    /**
     * Get disk usage statistics
     */
    getDiskUsage(basePath?: string): Promise<DiskUsage>;
    /**
     * Calculate disk usage recursively
     */
    private _calculateDiskUsage;
    /**
     * Calculate usage for a specific skill
     */
    private _calculateSkillUsage;
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
export declare const zenfs: ZenFSManager;
export {};
