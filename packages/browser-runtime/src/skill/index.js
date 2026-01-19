/**
 * Skill System Runtime Exports
 *
 * This module exports the skill management APIs for browser-runtime.
 * UI components should not import directly from here - use adapters instead.
 */
// Manager
export { skillManager, SkillManager } from "./lib/services/skill-manager.js";
// Registry
export { skillRegistry } from "./lib/services/skill-registry.js";
// Storage
export { skillStorage, SkillConflictError } from "./lib/storage/skill-storage.js";
// Executor
export { skillExecutor } from "./lib/services/skill-executor.js";
