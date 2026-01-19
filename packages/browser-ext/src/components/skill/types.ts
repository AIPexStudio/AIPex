/**
 * Skill UI Adapter Types
 *
 * These interfaces define the contract between UI components and runtime implementations.
 * Types are now sourced from @aipexstudio/browser-runtime.
 */

import type { SkillMetadata } from "@aipexstudio/browser-runtime";

/**
 * Result of a skill upload operation
 */
export type SkillUploadResult =
  | { ok: true; skill: SkillMetadata }
  | { ok: false; type: "conflict"; skillName: string }
  | { ok: false; type: "error"; message: string };

/**
 * Client interface for skill operations
 *
 * UI components receive this interface and call its methods.
 * Browser-ext provides the implementation using skillManager.
 */
export interface SkillClient {
  /**
   * Initialize the skill system
   */
  initialize(): Promise<void>;

  /**
   * Check if skill system is initialized
   */
  isInitialized(): boolean;

  /**
   * List all installed skills
   */
  listSkills(): SkillMetadata[];

  /**
   * Upload a skill from a ZIP file
   */
  uploadSkill(file: File, replace?: boolean): Promise<SkillUploadResult>;

  /**
   * Enable a skill
   */
  enableSkill(skillId: string): Promise<void>;

  /**
   * Disable a skill
   */
  disableSkill(skillId: string): Promise<void>;

  /**
   * Delete a skill
   */
  deleteSkill(skillId: string): Promise<void>;

  /**
   * Get detailed skill information
   */
  getSkill(skillNameOrId: string): Promise<SkillDetail | null>;
}

/**
 * Detailed skill information (expanded from metadata)
 */
export interface SkillDetail {
  metadata: SkillMetadata;
  skillMdContent: string;
  scripts: string[];
  references: string[];
  assets: string[];
}

// Re-export SkillMetadata for convenience
export type { SkillMetadata };
