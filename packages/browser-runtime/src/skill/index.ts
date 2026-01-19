/**
 * Skill System Runtime Exports
 *
 * This module exports the skill management APIs for browser-runtime.
 * UI components should not import directly from here - use adapters instead.
 */

// Executor
export { skillExecutor } from "./lib/services/skill-executor.js";
export type {
  SkillEventType,
  SkillManagerConfig,
} from "./lib/services/skill-manager.js";
// Manager
export { SkillManager, skillManager } from "./lib/services/skill-manager.js";
// Registry
export { skillRegistry } from "./lib/services/skill-registry.js";
// Storage
export {
  SkillConflictError,
  skillStorage,
} from "./lib/storage/skill-storage.js";
export type { ParsedSkill, SkillMetadata } from "./skill/types.js";
