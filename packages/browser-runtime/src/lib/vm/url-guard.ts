/**
 * URL guard for the SKILL_API.fetch bridge.
 *
 * Skills are untrusted user-supplied code packages executed in a QuickJS VM.
 * The host-side fetch bridge runs in the extension's service worker context
 * and would otherwise allow a malicious skill to perform Server-Side Request
 * Forgery (SSRF) against private network resources reachable from the host
 * (e.g. cloud-metadata services at 169.254.169.254, services bound to
 * localhost, or RFC1918 ranges on the user's LAN).
 *
 * This module provides an allow-by-default-public-only policy:
 *   - Only http(s) URLs are permitted.
 *   - Hostnames that resolve to (or literally are) loopback, link-local,
 *     unique-local, broadcast, multicast, or RFC1918 private ranges are
 *     rejected.
 *   - "localhost" and analogous reserved names are rejected.
 *
 * Note: Because hostname resolution happens inside fetch(), DNS-based
 * rebinding is a residual risk. Where strict isolation is required, callers
 * should additionally restrict to an explicit allowlist.
 */

/** Hostnames that always resolve to loopback / unsafe targets. */
const BLOCKED_HOSTNAMES = new Set<string>([
  "localhost",
  "ip6-localhost",
  "ip6-loopback",
  "broadcasthost",
]);

/** Reserved hostname suffixes (mDNS / link-local naming). */
const BLOCKED_HOSTNAME_SUFFIXES = [".localhost", ".local", ".internal"];

function isIPv4(host: string): boolean {
  const parts = host.split(".");
  if (parts.length !== 4) return false;
  return parts.every(
    (p) => /^\d{1,3}$/.test(p) && Number(p) >= 0 && Number(p) <= 255,
  );
}

function isPrivateIPv4(host: string): boolean {
  if (!isIPv4(host)) return false;
  const parts = host.split(".").map(Number);
  const a = parts[0] ?? -1;
  const b = parts[1] ?? -1;
  // 0.0.0.0/8        - "this" network
  if (a === 0) return true;
  // 10.0.0.0/8       - private
  if (a === 10) return true;
  // 127.0.0.0/8      - loopback
  if (a === 127) return true;
  // 169.254.0.0/16   - link-local (incl. 169.254.169.254 cloud metadata)
  if (a === 169 && b === 254) return true;
  // 172.16.0.0/12    - private
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.0.0.0/24, 192.0.2.0/24, 192.88.99.0/24 - reserved/docs
  if (a === 192 && b === 0) return true;
  // 192.168.0.0/16   - private
  if (a === 192 && b === 168) return true;
  // 198.18.0.0/15    - benchmarking
  if (a === 198 && (b === 18 || b === 19)) return true;
  // 198.51.100.0/24, 203.0.113.0/24 - documentation
  if (a === 198 && b === 51) return true;
  if (a === 203 && b === 0) return true;
  // 224.0.0.0/4      - multicast
  if (a >= 224 && a <= 239) return true;
  // 240.0.0.0/4      - reserved (incl. 255.255.255.255 broadcast)
  if (a >= 240) return true;
  return false;
}

function normalizeIPv6(host: string): string {
  // Strip brackets if present (URL hostnames preserve brackets in some envs)
  return host.replace(/^\[/, "").replace(/\]$/, "").toLowerCase();
}

function isPrivateIPv6(rawHost: string): boolean {
  const host = normalizeIPv6(rawHost);
  if (!host.includes(":")) return false;
  // Loopback ::1
  if (host === "::1" || host === "0:0:0:0:0:0:0:1") return true;
  // Unspecified ::
  if (host === "::" || /^0+(:0+){0,7}$/.test(host)) return true;
  // IPv4-mapped dotted form (::ffff:a.b.c.d)
  const v4MappedMatch = host.match(
    /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/,
  );
  if (v4MappedMatch?.[1] && isPrivateIPv4(v4MappedMatch[1])) return true;
  // IPv4-mapped hex form (::ffff:HHHH:HHHH) — convert to dotted and re-check
  const v4MappedHex = host.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (v4MappedHex) {
    const high = parseInt(v4MappedHex[1] ?? "0", 16);
    const low = parseInt(v4MappedHex[2] ?? "0", 16);
    const dotted = [
      (high >> 8) & 0xff,
      high & 0xff,
      (low >> 8) & 0xff,
      low & 0xff,
    ].join(".");
    if (isPrivateIPv4(dotted)) return true;
  }
  // Link-local fe80::/10
  if (/^fe[89ab][0-9a-f]?:/.test(host)) return true;
  // Unique local fc00::/7
  if (/^f[cd][0-9a-f]{2}:/.test(host)) return true;
  // Multicast ff00::/8
  if (/^ff[0-9a-f]{2}:/.test(host)) return true;
  return false;
}

export class SsrfBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SsrfBlockedError";
  }
}

/**
 * Validate that a URL is safe for the skill fetch bridge.
 * Throws SsrfBlockedError if the URL targets a private/internal resource
 * or uses a non-http(s) scheme.
 */
export function assertSkillFetchUrlAllowed(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new SsrfBlockedError(`Invalid URL: ${rawUrl}`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new SsrfBlockedError(
      `Blocked URL scheme '${parsed.protocol}' (only http/https are allowed)`,
    );
  }

  // Strip brackets that URL parsing leaves around IPv6 literals
  const hostname = parsed.hostname
    .toLowerCase()
    .replace(/^\[/, "")
    .replace(/\]$/, "");

  if (!hostname) {
    throw new SsrfBlockedError("Blocked URL with empty hostname");
  }

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new SsrfBlockedError(`Blocked private hostname: ${hostname}`);
  }

  for (const suffix of BLOCKED_HOSTNAME_SUFFIXES) {
    if (hostname === suffix.slice(1) || hostname.endsWith(suffix)) {
      throw new SsrfBlockedError(
        `Blocked private hostname suffix: ${hostname}`,
      );
    }
  }

  if (isIPv4(hostname) && isPrivateIPv4(hostname)) {
    throw new SsrfBlockedError(`Blocked private IPv4 address: ${hostname}`);
  }

  if (hostname.includes(":") && isPrivateIPv6(hostname)) {
    throw new SsrfBlockedError(`Blocked private IPv6 address: ${hostname}`);
  }

  return parsed;
}
