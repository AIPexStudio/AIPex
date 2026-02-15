/**
 * Recording Upload Service
 * Uploads a complete recording session (steps + metadata) to the hosted API.
 * Only used for non-BYOK user scenarios.
 */

import { WEBSITE_URL } from "../config/website";
import { getAuthCookieHeader } from "./web-auth";

/** Payload shape for a single recorded step */
export interface UploadRecordingStepPayload {
  index: number;
  timestamp: number;
  url: string;
  event: { type: string; [key: string]: unknown };
  aiTitle?: string;
  aiSummary?: string;
  pageSnapshotId?: string;
  screenshotUrl?: string | null;
  screenshotKey?: string | null;
}

/** Full session payload sent to the server */
export interface UploadRecordingSessionPayload {
  useCaseId: string;
  params: Record<string, unknown>;
  startedAt?: number;
  completedAt?: number;
  steps: UploadRecordingStepPayload[];
}

/** Server response after a successful upload */
export interface UploadRecordingSessionResult {
  id?: number;
  stepsInserted?: number;
  slug?: string;
  /** @deprecated Use `slug` instead */
  sessionId?: string;
}

/**
 * Upload a recording session to the server.
 * Uses per-step `screenshotUrl` / `screenshotKey` references — raw base64
 * screenshot data is NOT included in this request.
 */
export async function uploadRecordingSession(
  payload: UploadRecordingSessionPayload,
): Promise<UploadRecordingSessionResult> {
  const cookieHeader = await getAuthCookieHeader();

  const response = await fetch(`${WEBSITE_URL}/api/recordings/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
    body: JSON.stringify(payload),
    credentials: "include",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Recording upload failed (${response.status}): ${text || "Unknown error"}`,
    );
  }

  const json = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  return {
    id: typeof json.id === "number" ? json.id : undefined,
    stepsInserted:
      typeof json.stepsInserted === "number" ? json.stepsInserted : undefined,
    slug: typeof json.slug === "string" ? json.slug : undefined,
    sessionId:
      typeof json.sessionId === "string" ? json.sessionId : undefined,
  };
}
