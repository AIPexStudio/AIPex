// Web authentication

// Sound effects
export {
  playSoundEffect,
  type SoundEffectType,
  soundEffects,
} from "./sound-effects";
// Tool management
export {
  type AITool,
  clearDynamicTools,
  getAllTools,
  getTool,
  getToolCount,
  getToolDescription,
  getToolStats,
  getToolsForOpenAI,
  hasTool,
  registerDynamicTool,
  searchTools,
  ToolCategory,
  type ToolCategoryType,
  type ToolEventType,
  ToolManager,
  type ToolMetadata,
  toolManager,
  unregisterDynamicTool,
} from "./tool-manager";
// Version checking
export {
  checkVersion,
  clearDismissedUpdate,
  compareVersions,
  dismissUpdate,
  fetchLatestVersion,
  getCurrentVersion,
  getLastKnownVersion,
  isUpdateDismissed,
  openChangelog,
  openUpdatePage,
  requestUpdate,
  saveCurrentVersionAsKnown,
  type VersionCheckResult,
  type VersionInfo,
} from "./version-checker";
export {
  AUTH_COOKIE_NAMES,
  getAuthCookieHeader,
  hasAuthCookies,
  WEBSITE_URL,
} from "./web-auth";
// Website URL helpers
export {
  buildWebsiteUrl,
  isWebsiteDomain,
  WEBSITE_HOST,
  WEBSITE_ORIGIN,
} from "../config/website";
