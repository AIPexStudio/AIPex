// Web authentication

// Website URL helpers
export {
  buildWebsiteUrl,
  isWebsiteDomain,
  WEBSITE_HOST,
  WEBSITE_ORIGIN,
} from "../config/website";
// Recording upload
export {
  uploadRecordingSession,
  type UploadRecordingSessionPayload,
  type UploadRecordingSessionResult,
  type UploadRecordingStepPayload,
} from "./recording-upload";
// Replay controller
export {
  ManualReplayController,
  type ClickEvent,
  type ExecutionResult,
  type NavigationEvent,
  type ReplayEventCallback,
  type ReplayStatus,
  type ReplayStep,
} from "./replay-controller";
// Screenshot upload
export {
  uploadScreenshot,
  type UploadScreenshotResult,
} from "./screenshot-upload";
// Share conversation
export {
  shareConversation,
  type ShareResult,
} from "./share-conversation";
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
// User manuals API
export {
  deleteUserManual,
  fetchMyUserManuals,
  fetchUserManualDetail,
  type FetchUserManualDetailResponse,
  type UserManualDetail,
  type UserManualListItem,
  type UserManualStep,
} from "./user-manuals-api";
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
