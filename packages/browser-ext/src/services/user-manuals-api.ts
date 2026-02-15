/**
 * User Manuals API Service
 * CRUD operations for user manuals stored on the website backend.
 */

import { WEBSITE_URL } from "../config/website";
import { getAuthCookieHeader } from "./web-auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserManualListItem {
  id: number;
  title: string | null;
  slug: string | null;
  createdAt: string;
  public: boolean;
  stepCount: number;
}

export interface UserManualStep {
  id: number;
  index: number | null;
  url: string;
  event: unknown;
  aiTitle: string | null;
  aiSummary: string | null;
  screenshotUrl: string | null;
}

export interface UserManualDetail {
  id: number;
  title: string | null;
  createdAt: string;
  public: boolean;
  params: unknown;
}

export interface FetchUserManualDetailResponse {
  manual: UserManualDetail;
  steps: UserManualStep[];
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Fetch the current user's user manuals.
 * Returns an empty array when the user is not authenticated.
 */
export async function fetchMyUserManuals(): Promise<UserManualListItem[]> {
  const cookieHeader = await getAuthCookieHeader();

  if (!cookieHeader) {
    return [];
  }

  const response = await fetch(`${WEBSITE_URL}/api/user-manuals/my`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 401) {
      return [];
    }
    const text = await response.text().catch(() => "");
    throw new Error(
      `Fetch user manuals failed (${response.status}): ${text || "Unknown error"}`,
    );
  }

  const json = (await response.json()) as { manuals: UserManualListItem[] };
  return json.manuals;
}

/**
 * Fetch a specific user manual with all its steps.
 */
export async function fetchUserManualDetail(
  id: number,
): Promise<FetchUserManualDetailResponse> {
  const cookieHeader = await getAuthCookieHeader();

  const response = await fetch(`${WEBSITE_URL}/api/user-manuals/${id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
    credentials: "include",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Fetch manual detail failed (${response.status}): ${text || "Unknown error"}`,
    );
  }

  return (await response.json()) as FetchUserManualDetailResponse;
}

/**
 * Delete a user manual by ID.
 * Requires authentication.
 */
export async function deleteUserManual(id: number): Promise<void> {
  const cookieHeader = await getAuthCookieHeader();

  if (!cookieHeader) {
    throw new Error("User not logged in");
  }

  const response = await fetch(`${WEBSITE_URL}/api/user-manuals/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
    },
    credentials: "include",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Delete manual failed (${response.status}): ${text || "Unknown error"}`,
    );
  }
}
