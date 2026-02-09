/**
 * AI configuration utilities for voice mode
 */

import { ChromeStorage } from "./chrome-storage";

/**
 * Check if the user is a BYOK (Bring Your Own Key) user.
 * Only checks the byokEnabled flag in Chrome storage.
 */
export async function isByokUserSimple(): Promise<boolean> {
  try {
    const storage = new ChromeStorage("local");
    const byokValue = await storage.get<string | boolean>("byokEnabled");
    const isByokEnabled = byokValue === "true" || Boolean(byokValue);
    return isByokEnabled;
  } catch (error) {
    // Avoid logging detailed error info for security
    console.error("[AIConfig] Failed to check BYOK flag");
    return false;
  }
}
