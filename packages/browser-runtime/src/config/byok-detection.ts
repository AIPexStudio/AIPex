/**
 * BYOK (Bring Your Own Key) Detection
 * Determines if the user is using their own API keys vs. server-provided service
 */

import { STORAGE_KEYS } from "@aipexstudio/aipex-core";
import { chromeStorageAdapter } from "../storage/storage-adapter.js";

/**
 * Simple check if user is a BYOK user
 * Checks the byokEnabled flag in settings
 */
export async function isByokUserSimple(): Promise<boolean> {
  try {
    const settings = await chromeStorageAdapter.load(STORAGE_KEYS.SETTINGS);
    if (!settings || typeof settings !== "object") return false;
    const byokEnabled = (settings as Record<string, unknown>).byokEnabled;
    return byokEnabled === "true" || Boolean(byokEnabled);
  } catch (error) {
    console.error("[BYOK] Failed to check BYOK flag:", error);
    return false;
  }
}
