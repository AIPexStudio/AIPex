/**
 * Sanitize a single filename or folder segment for use with chrome.downloads.download().
 *
 * Rules:
 * - Strip any path separators (/ and \)
 * - Reject ".." to prevent directory traversal
 * - Remove control characters and characters illegal on common filesystems
 * - Collapse leading/trailing dots and spaces (Windows restriction)
 * - Return a safe fallback when the result would be empty
 */
export function sanitizeSegment(
  segment: string,
  fallback = "download",
): string {
  let s = segment;

  // Remove path separators
  s = s.replace(/[/\\]/g, "");

  // Remove directory traversal patterns that survive separator stripping
  // (e.g. "..foo" after separator removal)
  s = s.replace(/\.\./g, "");

  // Remove control characters (U+0000–U+001F, U+007F) via character code filtering
  s = Array.from(s)
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code > 0x1f && code !== 0x7f;
    })
    .join("");

  // Remove characters illegal on Windows/macOS/Linux filesystems
  s = s.replace(/[<>:"|?*]/g, "");

  // Collapse leading/trailing dots and spaces
  s = s.replace(/^[.\s]+/, "").replace(/[.\s]+$/, "");

  return s.length > 0 ? s : fallback;
}

/**
 * Sanitize a download path that may contain folder segments.
 *
 * Each segment between separators is individually sanitized.  Empty segments
 * and lone ".." segments are dropped entirely, preventing traversal.
 */
export function sanitizeDownloadPath(
  rawPath: string,
  fallback = "download",
): string {
  const segments = rawPath
    .split(/[/\\]/)
    .map((seg) => sanitizeSegment(seg, ""))
    .filter((seg) => seg.length > 0);

  return segments.length > 0 ? segments.join("/") : fallback;
}
