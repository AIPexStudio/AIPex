/**
 * SKILL_API Bridge
 * Defines the API interface available to skills and implements the bridge
 * between QuickJS VM and the host environment
 */

import { zenfs } from "./zenfs-manager";

export interface FileStats {
  isFile: boolean;
  isDirectory: boolean;
  size: number;
  mtime: Date;
}

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
 * Create a SKILL_API bridge instance
 */
export function createSkillAPIBridge(options: {
  skillId: string;
  onToolRegister?: (tool: ToolDefinition) => Promise<void>;
}): SkillAPIBridge {
  const { skillId, onToolRegister } = options;

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
        console.log(`[SKILL_API] fs.readFile: ${path}`);

        const result = await zenfs.readFile(path, encoding as BufferEncoding);

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
        console.log(`[SKILL_API] fs.writeFile: ${path}`);
        await zenfs.writeFile(path, data);
      },

      async readdir(path: string): Promise<string[]> {
        console.log(`[SKILL_API] fs.readdir: ${path}`);
        return await zenfs.readdir(path);
      },

      async exists(path: string): Promise<boolean> {
        console.log(`[SKILL_API] fs.exists: ${path}`);
        return await zenfs.exists(path);
      },

      async mkdir(
        path: string,
        options?: { recursive?: boolean },
      ): Promise<void> {
        console.log(`[SKILL_API] fs.mkdir: ${path}`);
        await zenfs.mkdir(path, options);
      },

      async rm(path: string, options?: { recursive?: boolean }): Promise<void> {
        console.log(`[SKILL_API] fs.rm: ${path}`);
        await zenfs.rm(path, options);
      },

      async stat(path: string): Promise<FileStats> {
        console.log(`[SKILL_API] fs.stat: ${path}`);
        return await zenfs.stat(path);
      },

      existsSync(path: string): boolean {
        console.log(`[SKILL_API] fs.existsSync: ${path}`);
        return zenfs.existsSync(path);
      },

      readFileSync(path: string, encoding?: string): string | Uint8Array {
        console.log(`[SKILL_API] fs.readFileSync: ${path}`);
        const result = zenfs.readFileSync(path, encoding as BufferEncoding);

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
        console.log(`[SKILL_API] fs.writeFileSync: ${path}`);
        zenfs.writeFileSync(path, data);
      },

      readdirSync(path: string): string[] {
        console.log(`[SKILL_API] fs.readdirSync: ${path}`);
        return zenfs.readdirSync(path);
      },

      mkdirSync(path: string, options?: { recursive?: boolean }): void {
        console.log(`[SKILL_API] fs.mkdirSync: ${path}`);
        zenfs.mkdirSync(path, options);
      },

      rmSync(path: string, options?: { recursive?: boolean }): void {
        console.log(`[SKILL_API] fs.rmSync: ${path}`);
        zenfs.rmSync(path, options);
      },

      statSync(path: string): FileStats {
        console.log(`[SKILL_API] fs.statSync: ${path}`);
        return zenfs.statSync(path);
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
