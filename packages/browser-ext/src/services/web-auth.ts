/**
 * Public website configuration and authentication cookie utilities
 */

export const WEBSITE_URL = "https://www.claudechrome.com";

/**
 * Aggregate claudechrome website authentication cookies and generate Cookie header content.
 * Note: Returns only presence indication, not actual cookie values in logs (security).
 */
export async function getAuthCookieHeader(): Promise<string | undefined> {
  try {
    const cookies = await chrome.cookies.getAll({ url: WEBSITE_URL });

    const relevantCookies = cookies.filter(
      (cookie) =>
        cookie.name.includes("better-auth") || cookie.name.includes("session"),
    );

    if (!relevantCookies.length) {
      console.log("[web-auth] No auth cookies found");
      return undefined;
    }

    // Log only cookie presence, not values
    console.log("[web-auth] Found auth cookies:", relevantCookies.length);

    return relevantCookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");
  } catch (error) {
    console.warn("[web-auth] Failed to get cookies");
    return undefined;
  }
}

/**
 * Check if user has authentication cookies (without reading values)
 */
export async function hasAuthCookies(): Promise<boolean> {
  try {
    const cookies = await chrome.cookies.getAll({ url: WEBSITE_URL });
    return cookies.some(
      (cookie) =>
        cookie.name.includes("better-auth") || cookie.name.includes("session"),
    );
  } catch (error) {
    console.warn("[web-auth] Failed to check cookies");
    return false;
  }
}

/**
 * List of known auth cookie names
 */
export const AUTH_COOKIE_NAMES = [
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
  "__Secure-better-auth.session_token",
  "better-auth.session_token",
  "__Secure-better-auth.session_data",
  "better-auth.session_data",
];
