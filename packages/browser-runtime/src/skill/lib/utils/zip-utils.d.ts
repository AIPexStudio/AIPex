/**
 * ZIP File Processing Utilities
 * Handles ZIP extraction and parsing for skill uploads
 */
export interface ParsedSkillMetadata {
    name: string;
    description: string;
    version: string;
}
export declare class SkillConflictError extends Error {
    constructor(skillName: string);
}
/**
 * Parse SKILL.md content to extract metadata from YAML frontmatter
 */
export declare function parseSkillMetadata(markdown: string): ParsedSkillMetadata;
/**
 * Extract and parse SKILL.md from ZIP blob without extracting all files
 */
export declare function parseSkillMetadataFromZip(zipBlob: Blob): Promise<ParsedSkillMetadata>;
/**
 * Extract ZIP file directly to ZenFS at the specified path
 * @param zipBlob - The ZIP file blob
 * @param targetPath - Target path in ZenFS (e.g., "/skills/my-skill")
 * @param checkConflict - If true, throw error if target path already exists
 */
export declare function extractZipToFS(zipBlob: Blob, targetPath: string, checkConflict?: boolean): Promise<void>;
/**
 * Get list of script files in a skill directory
 */
export declare function getSkillScripts(skillPath: string): Promise<string[]>;
/**
 * Get list of reference files in a skill directory
 */
export declare function getSkillReferences(skillPath: string): Promise<string[]>;
/**
 * Get list of asset files in a skill directory
 */
export declare function getSkillAssets(skillPath: string): Promise<string[]>;
