/**
 * SKILL_API Bridge
 * Defines the API interface available to skills and implements the bridge
 * between QuickJS VM and the host environment
 */
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
  registerTool(definition: ToolDefinition): Promise<void>;
  fs: {
    readFile(path: string, encoding?: string): Promise<string | Uint8Array>;
    writeFile(path: string, data: string | Uint8Array): Promise<void>;
    readdir(path: string): Promise<string[]>;
    exists(path: string): Promise<boolean>;
    mkdir(
      path: string,
      options?: {
        recursive?: boolean;
      },
    ): Promise<void>;
    rm(
      path: string,
      options?: {
        recursive?: boolean;
      },
    ): Promise<void>;
    stat(path: string): Promise<FileStats>;
    existsSync(path: string): boolean;
    readFileSync(path: string, encoding?: string): string | Uint8Array;
    writeFileSync(path: string, data: string | Uint8Array): void;
    readdirSync(path: string): string[];
    mkdirSync(
      path: string,
      options?: {
        recursive?: boolean;
      },
    ): void;
    rmSync(
      path: string,
      options?: {
        recursive?: boolean;
      },
    ): void;
    statSync(path: string): FileStats;
  };
  console: {
    log(...args: any[]): void;
    error(...args: any[]): void;
    warn(...args: any[]): void;
  };
  fetch(url: string, options?: RequestInit): Promise<any>;
  downloadFile(
    data: string,
    options?: {
      filename?: string;
      encoding?: "base64" | "utf8";
      saveAs?: boolean;
    },
  ): Promise<{
    success: boolean;
    downloadId?: number;
    error?: string;
  }>;
  chrome?: {
    tabs?: any;
    storage?: any;
    runtime?: any;
  };
}
/**
 * Create a SKILL_API bridge instance
 */
export declare function createSkillAPIBridge(options: {
  skillId: string;
  onToolRegister?: (tool: ToolDefinition) => Promise<void>;
}): SkillAPIBridge;
/**
 * SKILL_API type definition for TypeScript skills
 */
export type SkillAPI = SkillAPIBridge;
