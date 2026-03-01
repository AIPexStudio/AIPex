/**
 * Screenshot Upload Service
 * Uploads screenshots to the hosted storage service.
 * Only used for non-BYOK user scenarios.
 */

import { WEBSITE_URL } from "../config/website";
import { getAuthCookieHeader } from "./web-auth";

export interface UploadScreenshotResult {
  url: string;
  key: string;
}

/**
 * Upload a screenshot (base64 data URL) to server-side storage.
 * @param base64 - Either a data URL (`data:image/...;base64,...`) or raw base64 string
 * @returns The uploaded screenshot's public URL and storage key
 */
export async function uploadScreenshot(
  base64: string,
): Promise<UploadScreenshotResult> {
  if (!base64) {
    throw new Error("Empty screenshot data");
  }

  // Ensure data URL format
  const payloadBase64 = base64.startsWith("data:image")
    ? base64
    : `data:image/png;base64,${base64}`;

  const cookieHeader = await getAuthCookieHeader();

  const response = await fetch(`${WEBSITE_URL}/api/storage/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
    body: JSON.stringify({
      base64: payloadBase64,
    }),
    credentials: "include",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Screenshot upload failed (${response.status}): ${text || "Unknown error"}`,
    );
  }

  const json = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  if (typeof json.url !== "string" || typeof json.key !== "string") {
    throw new Error("Invalid upload response: missing url or key");
  }

  return {
    url: json.url,
    key: json.key,
  };
}
