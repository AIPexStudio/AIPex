/**
 * Website URL configuration for aipex-react
 * Provides centralized, env-configurable website base URL.
 */

const DEFAULT_WEBSITE_URL = "https://www.claudechrome.com";

/**
 * Resolve the website URL from environment or use default.
 * Validates the URL and normalizes to origin (removes trailing paths).
 */
function resolveWebsiteUrl(): string {
  // Try to read from import.meta.env (Vite) if available
  const envUrl = (import.meta as any)?.env?.VITE_WEBSITE_URL;

  if (!envUrl || typeof envUrl !== "string" || envUrl.trim() === "") {
    return DEFAULT_WEBSITE_URL;
  }

  try {
    const parsed = new URL(envUrl.trim());
    // Security: only allow https in production
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      console.warn(
        "[website config] Invalid protocol, falling back to default",
      );
      return DEFAULT_WEBSITE_URL;
    }
    // Return origin (scheme + host + port, no path)
    return parsed.origin;
  } catch {
    console.warn(
      "[website config] Invalid VITE_WEBSITE_URL, falling back to default",
    );
    return DEFAULT_WEBSITE_URL;
  }
}

/**
 * The base website URL (origin only, no trailing slash).
 * Example: "https://www.claudechrome.com"
 */
export const WEBSITE_URL: string = resolveWebsiteUrl();

/**
 * Build a full URL from a path relative to the website.
 * @param path - Path starting with "/" (e.g., "/pricing", "/api/speech-to-text")
 * @returns Full URL string
 */
export function buildWebsiteUrl(path: string): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${WEBSITE_URL}${normalizedPath}`;
}
