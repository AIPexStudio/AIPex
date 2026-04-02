/**
 * SKILL_API Bridge
 * Defines the API interface available to skills and implements the bridge
 * between QuickJS VM and the host environment
 */

import { posix as posixPath } from "node:path";
import type { FileStats } from "./types";
import { zenfs } from "./zenfs-manager";

export type { FileStats };

export interface ToolDefinition {
  name: string;
  description: string;
  parameters?: any;
  handler?: string;
}

/**
 * SKILL_API interface available to skills
 */
export interface SkillAPIBridge {
  // Tool Management
  registerTool(definition: ToolDefinition): Promise<void>;

  // File System (ZenFS)
  fs: {
    readFile(path: string, encoding?: string): Promise<string | Uint8Array>;
    writeFile(path: string, data: string | Uint8Array): Promise<void>;
    readdir(path: string): Promise<string[]>;
    exists(path: string): Promise<boolean>;
    mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
    rm(path: string, options?: { recursive?: boolean }): Promise<void>;
    stat(path: string): Promise<FileStats>;
    existsSync(path: string): boolean;
    readFileSync(path: string, encoding?: string): string | Uint8Array;
    writeFileSync(path: string, data: string | Uint8Array): void;
    readdirSync(path: string): string[];
    mkdirSync(path: string, options?: { recursive?: boolean }): void;
    rmSync(path: string, options?: { recursive?: boolean }): void;
    statSync(path: string): FileStats;
  };

  // Console (forwards to host console)
  console: {
    log(...args: any[]): void;
    error(...args: any[]): void;
    warn(...args: any[]): void;
  };

  // HTTP Requests
  fetch(url: string, options?: RequestInit): Promise<any>;

  // Browser Downloads
  downloadFile(
    data: string,
    options?: {
      filename?: string;
      encoding?: "base64" | "utf8";
      saveAs?: boolean;
    },
  ): Promise<{ success: boolean; downloadId?: number; error?: string }>;

  // Chrome APIs (to be implemented)
  chrome?: {
    tabs?: any;
    storage?: any;
    runtime?: any;
  };
}

/**
 * Resolve and validate a filesystem path so it stays within the skill's
 * own directory (/skills/<skillId>/).
 *
 * - Rejects paths containing null bytes.
 * - Treats the incoming path as relative to the skill root.
 * - Normalizes away any ".." / "." segments via posix path resolution.
 * - Throws if the resolved absolute path escapes the skill directory.
 *
 * @returns The absolute path within the virtual filesystem.
 */
export function resolveSafePath(skillId: string, userPath: string): string {
  // Reject null bytes which could be used to truncate path strings
  if (userPath.includes("\0")) {
    throw new Error(
      `[SKILL_API] Invalid path: null bytes are not allowed: ${userPath}`,
    );
  }

  const skillRoot = `/skills/${skillId}`;

  // Resolve the user-supplied path relative to the skill root.
  // posixPath.resolve("/skills/abc", "../../x") → "/x"
  // posixPath.resolve("/skills/abc", "sub/../file") → "/skills/abc/file"
  const resolved = posixPath.resolve(skillRoot, userPath);

  // The resolved path must be exactly skillRoot or start with skillRoot + "/"
  if (resolved !== skillRoot && !resolved.startsWith(`${skillRoot}/`)) {
    throw new Error(
      `[SKILL_API] Path traversal denied: "${userPath}" resolves outside skill directory`,
    );
  }

  return resolved;
}

/**
 * Create a SKILL_API bridge instance
 */
export function createSkillAPIBridge(options: {
  skillId: string;
  onToolRegister?: (tool: ToolDefinition) => Promise<void>;
}): SkillAPIBridge {
  const { skillId, onToolRegister } = options;

  /**
   * Helper: resolve + validate a path supplied by skill code.
   * Every fs operation MUST call this before touching zenfs.
   */
  function safePath(userPath: string): string {
    return resolveSafePath(skillId, userPath);
  }

  return {
    // Tool Registration
    async registerTool(definition: ToolDefinition): Promise<void> {
      console.log(`[SKILL_API] Registering tool: ${definition.name}`);

      if (onToolRegister) {
        await onToolRegister(definition);
      } else {
        console.warn("[SKILL_API] No tool registration handler provided");
      }
    },

    // File System API
    fs: {
      async readFile(
        path: string,
        encoding?: string,
      ): Promise<string | Uint8Array> {
        const resolved = safePath(path);
        console.log(`[SKILL_API] fs.readFile: ${resolved}`);

        const result = await zenfs.readFile(
          resolved,
          encoding as BufferEncoding,
        );

        // Convert Buffer to Uint8Array before passing to VM
        // This is critical: Buffer objects don't serialize properly across VM boundary
        if (
          !encoding &&
          result &&
          typeof result === "object" &&
          !(result instanceof Uint8Array)
        ) {
          // It's a Buffer, convert to Uint8Array
          return new Uint8Array(result as Buffer);
        }

        return result as string | Uint8Array;
      },

      async writeFile(path: string, data: string | Uint8Array): Promise<void> {
        const resolved = safePath(path);
        console.log(`[SKILL_API] fs.writeFile: ${resolved}`);
        await zenfs.writeFile(resolved, data);
      },

      async readdir(path: string): Promise<string[]> {
        const resolved = safePath(path);
        console.log(`[SKILL_API] fs.readdir: ${resolved}`);
        return await zenfs.readdir(resolved);
      },

      async exists(path: string): Promise<boolean> {
        const resolved = safePath(path);
        console.log(`[SKILL_API] fs.exists: ${resolved}`);
        return await zenfs.exists(resolved);
      },

      async mkdir(
        path: string,
        options?: { recursive?: boolean },
      ): Promise<void> {
        const resolved = safePath(path);
        console.log(`[SKILL_API] fs.mkdir: ${resolved}`);
        await zenfs.mkdir(resolved, options);
      },

      async rm(path: string, options?: { recursive?: boolean }): Promise<void> {
        const resolved = safePath(path);
        console.log(`[SKILL_API] fs.rm: ${resolved}`);
        await zenfs.rm(resolved, options);
      },

      async stat(path: string): Promise<FileStats> {
        const resolved = safePath(path);
        console.log(`[SKILL_API] fs.stat: ${resolved}`);
        return await zenfs.stat(resolved);
      },

      existsSync(path: string): boolean {
        const resolved = safePath(path);
        console.log(`[SKILL_API] fs.existsSync: ${resolved}`);
        return zenfs.existsSync(resolved);
      },

      readFileSync(path: string, encoding?: string): string | Uint8Array {
        const resolved = safePath(path);
        console.log(`[SKILL_API] fs.readFileSync: ${resolved}`);
        const result = zenfs.readFileSync(resolved, encoding as BufferEncoding);

        // Convert Buffer to Uint8Array before passing to VM
        // This is critical: Buffer objects don't serialize properly across VM boundary
        if (
          !encoding &&
          result &&
          typeof result === "object" &&
          !(result instanceof Uint8Array)
        ) {
          // It's a Buffer, convert to Uint8Array
          return new Uint8Array(result as Buffer);
        }

        return result;
      },

      writeFileSync(path: string, data: string | Uint8Array): void {
        const resolved = safePath(path);
        console.log(`[SKILL_API] fs.writeFileSync: ${resolved}`);
        zenfs.writeFileSync(resolved, data);
      },

      readdirSync(path: string): string[] {
        const resolved = safePath(path);
        console.log(`[SKILL_API] fs.readdirSync: ${resolved}`);
        return zenfs.readdirSync(resolved);
      },

      mkdirSync(path: string, options?: { recursive?: boolean }): void {
        const resolved = safePath(path);
        console.log(`[SKILL_API] fs.mkdirSync: ${resolved}`);
        zenfs.mkdirSync(resolved, options);
      },

      rmSync(path: string, options?: { recursive?: boolean }): void {
        const resolved = safePath(path);
        console.log(`[SKILL_API] fs.rmSync: ${resolved}`);
        zenfs.rmSync(resolved, options);
      },

      statSync(path: string): FileStats {
        const resolved = safePath(path);
        console.log(`[SKILL_API] fs.statSync: ${resolved}`);
        return zenfs.statSync(resolved);
      },
    },

    // Console API - forwards to host console with skill prefix
    console: {
      log(...args: any[]): void {
        console.log(`[Skill:${skillId}]`, ...args);
      },

      error(...args: any[]): void {
        console.error(`[Skill:${skillId}]`, ...args);
      },

      warn(...args: any[]): void {
        console.warn(`[Skill:${skillId}]`, ...args);
      },
    },

    // Fetch API - uses host fetch
    async fetch(url: string, options?: RequestInit): Promise<any> {
      console.log(`[SKILL_API] fetch: ${url}`);

      try {
        const response = await fetch(url, options);

        // Convert response to a plain object that can be serialized
        const result = {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          url: response.url,
          // Try to parse as JSON, fallback to text
          body: await response.text(),
        };

        // Try to parse body as JSON
        try {
          result.body = JSON.parse(result.body);
        } catch {
          // Keep as text
        }

        return result;
      } catch (error: any) {
        console.error("[SKILL_API] Fetch error:", error);
        throw new Error(`Fetch failed: ${error.message}`);
      }
    },

    // Download File API - triggers browser download from Base64 or text data
    async downloadFile(
      data: string,
      options?: {
        filename?: string;
        encoding?: "base64" | "utf8";
        saveAs?: boolean;
      },
    ): Promise<{ success: boolean; downloadId?: number; error?: string }> {
      const filename = options?.filename || "download";
      console.log(`[SKILL_API] downloadFile: ${filename}`);

      try {
        // Check if downloads permission is available
        if (!chrome?.downloads) {
          throw new Error(
            "Downloads permission not available. Please check extension permissions.",
          );
        }

        // Validate that filename is provided
        if (!options?.filename) {
          throw new Error("filename option is required");
        }

        const encoding = options?.encoding || "utf8";
        let uint8Array: Uint8Array;

        if (encoding === "base64") {
          // Decode Base64 string to Uint8Array
          const binaryString = atob(data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          uint8Array = bytes;
        } else {
          // Treat as UTF-8 text
          const encoder = new TextEncoder();
          uint8Array = encoder.encode(data);
        }

        // Determine MIME type from filename extension
        const extension = filename.split(".").pop()?.toLowerCase();
        let mimeType = "application/octet-stream";
        if (extension === "zip") {
          mimeType = "application/zip";
        } else if (extension === "json") {
          mimeType = "application/json";
        } else if (extension === "txt" || extension === "md") {
          mimeType = "text/plain";
        }

        // Convert to base64 data URI
        const base64String = btoa(
          String.fromCharCode(...Array.from(uint8Array)),
        );
        const dataUri = `data:${mimeType};base64,${base64String}`;

        // Trigger download using chrome.downloads API
        const downloadId = await chrome.downloads.download({
          url: dataUri,
          filename: filename,
          saveAs: options?.saveAs ?? true, // Default to showing save dialog
        });

        console.log(
          `[SKILL_API] Download triggered successfully: ${filename} (ID: ${downloadId})`,
        );
        return {
          success: true,
          downloadId,
        };
      } catch (error: any) {
        console.error("[SKILL_API] Download error:", error);
        return {
          success: false,
          error: error?.message || String(error),
        };
      }
    },
  };
}

/**
 * SKILL_API type definition for TypeScript skills
 */
export type SkillAPI = SkillAPIBridge;
