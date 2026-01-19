import type { ParsedSkill, SkillMetadata } from "../../skill/types.js";
import { SkillConflictError } from "../utils/zip-utils";
export { SkillConflictError };
export type { SkillMetadata, ParsedSkill };
declare class SimpleFileSystem {
  private files;
  private dirs;
  existsSync(path: string): boolean;
  mkdirSync(
    path: string,
    options?: {
      recursive?: boolean;
    },
  ): void;
  writeFileSync(path: string, content: string | ArrayBuffer): void;
  readFileSync(path: string, _encoding?: string): string | ArrayBuffer;
  statSync(path: string): {
    isDirectory(): boolean;
  };
  readdirSync(path: string): string[];
  reset(): void;
  /**
   * Clear files and directories for a specific skill namespace
   * This allows loading/unloading skills without affecting others
   */
  clearSkillNamespace(skillId: string): void;
  /**
   * Get all files in a specific namespace
   */
  getSkillFiles(skillId: string): Map<string, string | ArrayBuffer>;
  /**
   * Get all paths (both files and dirs) in a directory, recursively
   */
  getAllPathsInDir(dirPath: string): string[];
}
export declare const simpleFS: SimpleFileSystem;
export declare class SkillStorage {
  private db;
  private initialized;
  private lastSyncTime;
  private syncInterval;
  private syncPromise;
  initialize(): Promise<void>;
  saveSkill(zipBlob: Blob, replace?: boolean): Promise<SkillMetadata>;
  loadSkill(skillId: string): Promise<ParsedSkill>;
  deleteSkill(skillId: string): Promise<void>;
  listSkills(): Promise<SkillMetadata[]>;
  getSkillMetadata(skillId: string): Promise<SkillMetadata | null>;
  saveSkillMetadata(skill: SkillMetadata): Promise<void>;
  updateSkill(skillId: string, updates: Partial<SkillMetadata>): Promise<void>;
  getSkillFile(
    skillId: string,
    filePath: string,
  ): Promise<string | ArrayBuffer | null>;
  /**
   * Scan ZenFS /skills directory for all skills
   * Returns skill metadata for all valid skills found
   */
  private scanZenFSForSkills;
  /**
   * Sync skills from ZenFS to IndexedDB
   * Only adds skills that exist in ZenFS but not in IndexedDB
   */
  private syncSkillsFromZenFS;
  private _doSync;
  /**
   * Create a new skill from ZenFS directory
   * This is used when scripts create new skills programmatically
   */
  createSkillFromZenFS(
    name: string,
    description: string,
    version: string,
    sourcePath: string,
  ): Promise<SkillMetadata>;
  private saveToIndexedDB;
  private getFromIndexedDB;
}
export declare const skillStorage: SkillStorage;
