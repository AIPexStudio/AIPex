/**
 * Skill System Types
 * Shared types used across runtime and UI layers
 */
/**
 * Metadata for an installed skill
 */
export interface SkillMetadata {
    /** Unique identifier (typically the skill name) */
    id: string;
    /** Display name of the skill */
    name: string;
    /** Description of what the skill does */
    description: string;
    /** Semantic version string */
    version: string;
    /** Timestamp when the skill was uploaded/installed */
    uploadedAt: number;
    /** Whether the skill is currently enabled */
    enabled: boolean;
}
/**
 * Parsed skill with content and metadata
 */
export interface ParsedSkill {
    metadata: SkillMetadata;
    skillMdContent: string;
    scripts: string[];
    references: string[];
    assets: string[];
}
/**
 * Summary information about a skill (lighter than full metadata)
 */
export interface SkillSummary {
    name: string;
    description: string;
    version: string;
    enabled: boolean;
}
