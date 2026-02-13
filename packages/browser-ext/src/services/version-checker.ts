/**
 * Version Checker Service
 * Checks the current extension version against the latest version from the server
 */

import { buildWebsiteUrl, WEBSITE_URL } from "../config/website";

export interface VersionInfo {
  version: string;
  notes: string | null;
  releasedAt: string;
  changelogUrl: string;
}

export interface VersionCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string | null;
  changelogUrl: string;
  isNewlyUpdated: boolean;
  notes: string | null;
}

const VERSION_STORAGE_KEY = "aipex-last-known-version";
const UPDATE_DISMISSED_KEY = "aipex-update-dismissed-version";

/**
 * Get the current extension version from manifest
 */
export function getCurrentVersion(): string {
  return chrome.runtime.getManifest().version;
}

/**
 * Fetch the latest version info from the server
 */
export async function fetchLatestVersion(): Promise<VersionInfo | null> {
  try {
    const response = await fetch(buildWebsiteUrl("/api/release/latest"), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.warn(
        "[VersionChecker] Failed to fetch latest version:",
        response.status,
      );
      return null;
    }

    const data = await response.json();
    return data as VersionInfo;
  } catch (error) {
    console.error("[VersionChecker] Error fetching latest version:", error);
    return null;
  }
}

/**
 * Compare two version strings
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split(".").map(Number);
  const parts2 = v2.split(".").map(Number);

  const maxLength = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLength; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;

    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }

  return 0;
}

/**
 * Get the last known version (the version user was previously on)
 */
export async function getLastKnownVersion(): Promise<string | null> {
  try {
    const result = await chrome.storage.local.get(VERSION_STORAGE_KEY);
    const version = result[VERSION_STORAGE_KEY];
    return typeof version === "string" ? version : null;
  } catch {
    return null;
  }
}

/**
 * Save the current version as the last known version
 */
export async function saveCurrentVersionAsKnown(): Promise<void> {
  try {
    const currentVersion = getCurrentVersion();
    await chrome.storage.local.set({ [VERSION_STORAGE_KEY]: currentVersion });
  } catch (error) {
    console.error("[VersionChecker] Failed to save version:", error);
  }
}

/**
 * Check if user has dismissed the update notification for a specific version
 */
export async function isUpdateDismissed(version: string): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get(UPDATE_DISMISSED_KEY);
    return result[UPDATE_DISMISSED_KEY] === version;
  } catch {
    return false;
  }
}

/**
 * Dismiss the update notification for a specific version
 */
export async function dismissUpdate(version: string): Promise<void> {
  try {
    await chrome.storage.local.set({ [UPDATE_DISMISSED_KEY]: version });
  } catch (error) {
    console.error("[VersionChecker] Failed to dismiss update:", error);
  }
}

/**
 * Clear the dismissed update (used when a new version is available)
 */
export async function clearDismissedUpdate(): Promise<void> {
  try {
    await chrome.storage.local.remove(UPDATE_DISMISSED_KEY);
  } catch (error) {
    console.error("[VersionChecker] Failed to clear dismissed update:", error);
  }
}

/**
 * Check for version updates and determine if user just updated
 */
export async function checkVersion(): Promise<VersionCheckResult> {
  const currentVersion = getCurrentVersion();
  const lastKnownVersion = await getLastKnownVersion();
  const latestVersionInfo = await fetchLatestVersion();

  const result: VersionCheckResult = {
    hasUpdate: false,
    currentVersion,
    latestVersion: latestVersionInfo?.version || null,
    changelogUrl:
      latestVersionInfo?.changelogUrl ||
      buildWebsiteUrl(`/release/${currentVersion}`),
    isNewlyUpdated: false,
    notes: latestVersionInfo?.notes || null,
  };

  // Check if user just updated (current version is newer than last known)
  if (
    lastKnownVersion &&
    compareVersions(currentVersion, lastKnownVersion) > 0
  ) {
    result.isNewlyUpdated = true;
    // Clear any dismissed update since we're on a new version
    await clearDismissedUpdate();
  }

  // Check if there's a newer version available
  if (latestVersionInfo?.version) {
    const comparison = compareVersions(
      latestVersionInfo.version,
      currentVersion,
    );
    if (comparison > 0) {
      result.hasUpdate = true;
    }
  }

  // Save current version as known for future comparisons
  await saveCurrentVersionAsKnown();

  console.log("[VersionChecker] Version check result:", result);
  return result;
}

/**
 * Request update check from Chrome
 * Returns the status of the update check
 */
export async function requestUpdate(): Promise<{
  status: "update_available" | "no_update" | "throttled" | "error";
  version?: string;
}> {
  try {
    const result = await chrome.runtime.requestUpdateCheck();

    if (result.status === "update_available") {
      return { status: "update_available", version: result.version };
    } else if (result.status === "no_update") {
      return { status: "no_update" };
    } else if (result.status === "throttled") {
      return { status: "throttled" };
    }
    return { status: "error" };
  } catch (error) {
    console.error("[VersionChecker] Update check failed:", error);
    return { status: "error" };
  }
}

/**
 * Open the changelog page
 */
export function openChangelog(
  url: string = buildWebsiteUrl("/changelog"),
): void {
  chrome.tabs.create({ url });
}

/**
 * Open the extension update page (Chrome Web Store)
 */
export function openUpdatePage(): void {
  const extensionId = chrome.runtime.id;
  const updateUrl = `https://chrome.google.com/webstore/detail/${extensionId}`;
  chrome.tabs.create({ url: updateUrl });
}
