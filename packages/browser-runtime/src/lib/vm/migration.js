/**
 * Migration utilities
 * Migrate from old formats to new unified ZenFS storage
 */
import { simpleFS, skillStorage } from "../../skill/lib/storage/skill-storage";
import { zenfs } from "./zenfs-manager";

const MIGRATION_KEY = "aipex_zenfs_migration_status";
const MIGRATION_V2_KEY = "aipex_zenfs_migration_v2_status";
/**
 * Check if migration has been completed
 */
export async function isMigrationCompleted() {
  try {
    const result = await chrome.storage.local.get(MIGRATION_KEY);
    const status = result[MIGRATION_KEY];
    return status?.completed || false;
  } catch {
    return false;
  }
}
/**
 * Get migration status
 */
export async function getMigrationStatus() {
  try {
    const result = await chrome.storage.local.get(MIGRATION_KEY);
    return result[MIGRATION_KEY] || null;
  } catch {
    return null;
  }
}
/**
 * Save migration status
 */
async function saveMigrationStatus(status) {
  await chrome.storage.local.set({ [MIGRATION_KEY]: status });
}
/**
 * Migrate a single skill from SimpleFileSystem to ZenFS
 */
async function migrateSkill(skillId) {
  try {
    console.log(`[Migration] Migrating skill: ${skillId}`);
    // Get all files from SimpleFileSystem for this skill
    const files = simpleFS.getSkillFiles(skillId);
    if (files.size === 0) {
      console.log(`[Migration] No files found for skill: ${skillId}`);
      return true;
    }
    // Create skill directory in ZenFS
    const skillPath = zenfs.getSkillPath(skillId);
    await zenfs.mkdir(skillPath, { recursive: true });
    // Migrate each file
    for (const [relativePath, content] of files.entries()) {
      const fullPath = `${skillPath}/${relativePath}`;
      // Convert content to appropriate format
      let data;
      if (typeof content === "string") {
        data = content;
      } else if (content instanceof ArrayBuffer) {
        data = new Uint8Array(content);
      } else {
        console.warn(`[Migration] Unknown content type for: ${relativePath}`);
        continue;
      }
      await zenfs.writeFile(fullPath, data);
      console.log(`[Migration] Migrated file: ${relativePath}`);
    }
    console.log(
      `[Migration] Successfully migrated skill: ${skillId} (${files.size} files)`,
    );
    return true;
  } catch (error) {
    console.error(`[Migration] Failed to migrate skill: ${skillId}`, error);
    return false;
  }
}
/**
 * Migrate all skills from SimpleFileSystem to ZenFS
 */
export async function migrateAllSkills() {
  console.log(
    "[Migration] Starting migration from SimpleFileSystem to ZenFS...",
  );
  // Check if already migrated
  const alreadyMigrated = await isMigrationCompleted();
  if (alreadyMigrated) {
    console.log("[Migration] Migration already completed, skipping");
    const status = await getMigrationStatus();
    return {
      success: true,
      migratedCount: status?.migratedSkills.length || 0,
      failedCount: 0,
      migratedSkills: status?.migratedSkills || [],
    };
  }
  // Initialize ZenFS
  await zenfs.initialize();
  // Get all skill IDs from SimpleFileSystem
  // We need to extract skill IDs from the file paths
  const skillIds = new Set();
  const allPaths = simpleFS.getAllPathsInDir("skill_");
  for (const path of allPaths) {
    const match = path.match(/^skill_([^/]+)/);
    if (match?.[1]) {
      skillIds.add(match[1]);
    }
  }
  console.log(`[Migration] Found ${skillIds.size} skills to migrate`);
  const migratedSkills = [];
  let failedCount = 0;
  // Migrate each skill
  for (const skillId of skillIds) {
    const success = await migrateSkill(skillId);
    if (success) {
      migratedSkills.push(skillId);
    } else {
      failedCount++;
    }
  }
  // Save migration status
  const status = {
    completed: failedCount === 0,
    migratedSkills,
    timestamp: Date.now(),
    version: "1.0",
  };
  await saveMigrationStatus(status);
  console.log(
    `[Migration] Migration completed: ${migratedSkills.length} succeeded, ${failedCount} failed`,
  );
  return {
    success: failedCount === 0,
    migratedCount: migratedSkills.length,
    failedCount,
    migratedSkills,
  };
}
/**
 * Reset migration status (for testing)
 */
export async function resetMigration() {
  await chrome.storage.local.remove(MIGRATION_KEY);
  console.log("[Migration] Migration status reset");
}
/**
 * Check if V2 migration (ID format change) has been completed
 */
export async function isMigrationV2Completed() {
  try {
    const result = await chrome.storage.local.get(MIGRATION_V2_KEY);
    const status = result[MIGRATION_V2_KEY];
    return status?.completed || false;
  } catch {
    return false;
  }
}
/**
 * Save V2 migration status
 */
async function saveMigrationV2Status(status) {
  await chrome.storage.local.set({ [MIGRATION_V2_KEY]: status });
}
/**
 * Migrate from old skill ID format (skill_xxx_xxx) to new format (skill name)
 */
async function migrateSkillIdFormat(oldMetadata) {
  try {
    const oldId = oldMetadata.id;
    const newId = oldMetadata.name;
    // Skip if ID is already using the name format (not random)
    if (!oldId.match(/^skill_\d+_[a-z0-9]+$/)) {
      console.log(`[Migration V2] Skill ${oldId} already uses new format`);
      return true;
    }
    console.log(`[Migration V2] Migrating skill: ${oldId} -> ${newId}`);
    const oldPath = zenfs.getSkillPath(oldId);
    const newPath = zenfs.getSkillPath(newId);
    // Check if old path exists in ZenFS
    const oldPathExists = await zenfs.exists(oldPath);
    if (!oldPathExists) {
      console.warn(`[Migration V2] Old path not found: ${oldPath}`);
      // Still update metadata even if files don't exist
    } else {
      // Check if new path already exists
      const newPathExists = await zenfs.exists(newPath);
      if (newPathExists) {
        console.warn(
          `[Migration V2] New path already exists: ${newPath}, removing old path`,
        );
        await zenfs.rm(oldPath, { recursive: true });
      } else {
        // Rename directory in ZenFS
        await zenfs.rename(oldPath, newPath);
        console.log(
          `[Migration V2] Renamed directory: ${oldPath} -> ${newPath}`,
        );
      }
    }
    // Update metadata in IndexedDB
    // First delete old metadata
    await skillStorage.deleteSkill(oldId);
    // Create new metadata with updated ID
    const newMetadata = {
      ...oldMetadata,
      id: newId,
    };
    // Save new metadata
    await skillStorage.saveSkillMetadata(newMetadata);
    console.log(`[Migration V2] Updated metadata: ${oldId} -> ${newId}`);
    return true;
  } catch (error) {
    console.error(
      `[Migration V2] Failed to migrate skill ${oldMetadata.id}:`,
      error,
    );
    return false;
  }
}
/**
 * Migrate all skills from old ID format to new ID format
 */
export async function migrateAllSkillIds() {
  console.log("[Migration V2] Starting skill ID format migration...");
  // Check if already migrated
  const alreadyMigrated = await isMigrationV2Completed();
  if (alreadyMigrated) {
    console.log("[Migration V2] Migration already completed, skipping");
    return {
      success: true,
      renamedCount: 0,
      failedCount: 0,
      renamedSkills: [],
    };
  }
  // Initialize storage and ZenFS
  await skillStorage.initialize();
  await zenfs.initialize();
  // Get all skills from IndexedDB
  const allSkills = await skillStorage.listSkills();
  console.log(`[Migration V2] Found ${allSkills.length} skills in storage`);
  // Filter skills that need migration (those with random IDs)
  const skillsToMigrate = allSkills.filter((skill) =>
    skill.id.match(/^skill_\d+_[a-z0-9]+$/),
  );
  console.log(
    `[Migration V2] ${skillsToMigrate.length} skills need ID migration`,
  );
  const renamedSkills = [];
  let failedCount = 0;
  // Migrate each skill
  for (const skill of skillsToMigrate) {
    const oldId = skill.id;
    const newId = skill.name;
    const success = await migrateSkillIdFormat(skill);
    if (success) {
      renamedSkills.push({ oldId, newId });
    } else {
      failedCount++;
    }
  }
  // Save migration status
  const status = {
    completed: failedCount === 0,
    renamedSkills,
    timestamp: Date.now(),
    version: "2.0",
  };
  await saveMigrationV2Status(status);
  console.log(
    `[Migration V2] Migration completed: ${renamedSkills.length} succeeded, ${failedCount} failed`,
  );
  return {
    success: failedCount === 0,
    renamedCount: renamedSkills.length,
    failedCount,
    renamedSkills,
  };
}
/**
 * Auto-migrate on initialization if needed
 * Runs both V1 (SimpleFileSystem to ZenFS) and V2 (ID format change) migrations
 */
export async function autoMigrate() {
  try {
    // V1 Migration: SimpleFileSystem to ZenFS
    const v1Completed = await isMigrationCompleted();
    if (!v1Completed) {
      console.log("[Migration] Auto-migration V1 triggered");
      await migrateAllSkills();
    }
    // V2 Migration: Old ID format to new ID format
    const v2Completed = await isMigrationV2Completed();
    if (!v2Completed) {
      console.log("[Migration] Auto-migration V2 triggered");
      await migrateAllSkillIds();
    }
  } catch (error) {
    console.error("[Migration] Auto-migration failed:", error);
  }
}
