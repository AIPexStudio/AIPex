/**
 * Automation Mode Helper
 *
 * Reads user-selected automation mode from chrome.storage:
 * - Focus mode: Visual effects, window focus, screenshots allowed
 * - Background mode: Silent operation, no window focus, no visual tools
 */

import {
  type AutomationMode,
  STORAGE_KEYS,
  validateAutomationMode,
} from "@aipexstudio/aipex-core";
import { ChromeStorageAdapter } from "../storage/storage-adapter";

const storage = new ChromeStorageAdapter<string>();

/**
 * Get automation mode from storage
 * Returns 'focus' or 'background' based on user selection
 */
export async function getAutomationMode(): Promise<AutomationMode> {
  try {
    const value = await storage.load(STORAGE_KEYS.AUTOMATION_MODE);
    const mode = validateAutomationMode(value);
    console.log("🔧 [AutomationMode] Current mode:", mode);
    return mode;
  } catch (error) {
    console.warn("⚠️ [AutomationMode] Failed to read mode from storage:", error);
    // Default to focus mode
    return "focus";
  }
}

/**
 * Check if focus mode is currently enabled
 */
export async function isFocusMode(): Promise<boolean> {
  const mode = await getAutomationMode();
  return mode === "focus";
}

/**
 * Check if background mode is currently enabled
 */
export async function isBackgroundMode(): Promise<boolean> {
  const mode = await getAutomationMode();
  return mode === "background";
}
