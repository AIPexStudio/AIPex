/**
 * Skill System Runtime Exports
 *
 * This module exports the skill management APIs for browser-runtime.
 * UI components should not import directly from here - use adapters instead.
 */
export { skillManager, SkillManager } from "./lib/services/skill-manager.js";
export type {
  SkillManagerConfig,
  SkillEventType,
} from "./lib/services/skill-manager.js";
export { skillRegistry } from "./lib/services/skill-registry.js";
export {
  skillStorage,
  SkillConflictError,
} from "./lib/storage/skill-storage.js";
export type { SkillMetadata, ParsedSkill } from "./skill/types.js";
export { skillExecutor } from "./lib/services/skill-executor.js";
