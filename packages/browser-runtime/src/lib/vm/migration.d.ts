/**
 * Migration utilities
 * Migrate from old formats to new unified ZenFS storage
 */
interface MigrationStatus {
  completed: boolean;
  migratedSkills: string[];
  timestamp: number;
  version: string;
}
/**
 * Check if migration has been completed
 */
export declare function isMigrationCompleted(): Promise<boolean>;
/**
 * Get migration status
 */
export declare function getMigrationStatus(): Promise<MigrationStatus | null>;
/**
 * Migrate all skills from SimpleFileSystem to ZenFS
 */
export declare function migrateAllSkills(): Promise<{
  success: boolean;
  migratedCount: number;
  failedCount: number;
  migratedSkills: string[];
}>;
/**
 * Reset migration status (for testing)
 */
export declare function resetMigration(): Promise<void>;
/**
 * Check if V2 migration (ID format change) has been completed
 */
export declare function isMigrationV2Completed(): Promise<boolean>;
/**
 * Migrate all skills from old ID format to new ID format
 */
export declare function migrateAllSkillIds(): Promise<{
  success: boolean;
  renamedCount: number;
  failedCount: number;
  renamedSkills: {
    oldId: string;
    newId: string;
  }[];
}>;
/**
 * Auto-migrate on initialization if needed
 * Runs both V1 (SimpleFileSystem to ZenFS) and V2 (ID format change) migrations
 */
export declare function autoMigrate(): Promise<void>;
