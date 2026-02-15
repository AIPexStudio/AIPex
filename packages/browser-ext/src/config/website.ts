/**
 * Website URL configuration
 * Provides centralized, env-configurable website base URL for the extension.
 */

const DEFAULT_WEBSITE_URL = "https://www.claudechrome.com";

/**
 * Resolve the website URL from environment or use default.
 * Validates the URL and normalizes to origin (removes trailing paths).
 */
function resolveWebsiteUrl(): string {
  // VITE_WEBSITE_URL is injected at build time via .env
  const envUrl =
    typeof import.meta !== "undefined" && import.meta.env?.VITE_WEBSITE_URL;

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
 * Alias for WEBSITE_URL, explicitly named as origin.
 */
export const WEBSITE_ORIGIN: string = WEBSITE_URL;

/**
 * The hostname of the website (without protocol or port).
 * Example: "www.claudechrome.com"
 */
export const WEBSITE_HOST: string = new URL(WEBSITE_URL).hostname;

/**
 * Build a full URL from a path relative to the website.
 * @param path - Path starting with "/" (e.g., "/pricing", "/api/auth/verify")
 * @returns Full URL string
 */
export function buildWebsiteUrl(path: string): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${WEBSITE_URL}${normalizedPath}`;
}

/**
 * Check if a domain matches the website domain (for cookie validation).
 * Handles subdomains: ".claudechrome.com" matches "www.claudechrome.com".
 * @param domain - Domain string from cookie or origin
 * @returns true if domain matches website
 */
export function isWebsiteDomain(domain: string): boolean {
  if (!domain) return false;
  const normalized = domain.toLowerCase().replace(/^\./, "");
  // Exact match or subdomain match
  return (
    normalized === WEBSITE_HOST.toLowerCase() ||
    WEBSITE_HOST.toLowerCase().endsWith(`.${normalized}`)
  );
}
