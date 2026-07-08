import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const PACKAGE_NAME = "aipex-mcp-bridge";
const CACHE_DIR = join(homedir(), ".browser-cli");
const CACHE_FILE = join(CACHE_DIR, "version-check.json");
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

interface CacheData {
  lastCheck: number;
  latestVersion: string | null;
}

function readCache(): CacheData | null {
  try {
    const raw = readFileSync(CACHE_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeCache(data: CacheData): void {
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify(data));
  } catch {
    // non-critical
  }
}

async function fetchLatestVersion(): Promise<string | null> {
  try {
    const res = await fetch(
      `https://registry.npmjs.org/${PACKAGE_NAME}/latest`,
      { signal: AbortSignal.timeout(5_000) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { version?: string };
    return data.version ?? null;
  } catch {
    return null;
  }
}

function compareVersions(current: string, latest: string): boolean {
  const parse = (v: string) => v.split(".").map(Number);
  const c = parse(current);
  const l = parse(latest);
  for (let i = 0; i < 3; i++) {
    if ((l[i] ?? 0) > (c[i] ?? 0)) return true;
    if ((l[i] ?? 0) < (c[i] ?? 0)) return false;
  }
  return false;
}

/**
 * Start a non-blocking version check. Returns a function that, when called,
 * prints the update notice to stderr if a newer version was found.
 * The check never blocks command execution.
 */
export function startVersionCheck(currentVersion: string): () => void {
  const cache = readCache();
  const now = Date.now();

  // If we checked recently and have cached info, use it immediately
  if (cache && now - cache.lastCheck < CHECK_INTERVAL_MS) {
    if (cache.latestVersion && compareVersions(currentVersion, cache.latestVersion)) {
      return () => {
        process.stderr.write(
          `[browser-cli] Update available: ${currentVersion} -> ${cache.latestVersion}. Run: npm i -g ${PACKAGE_NAME}\n`,
        );
      };
    }
    return () => {};
  }

  // Otherwise, check async in background
  let result: string | null = null;
  let done = false;

  const checkPromise = fetchLatestVersion().then((v) => {
    result = v;
    done = true;
    writeCache({ lastCheck: now, latestVersion: v });
  });

  // Avoid unhandled rejection
  checkPromise.catch(() => {
    done = true;
  });

  return () => {
    if (done && result && compareVersions(currentVersion, result)) {
      process.stderr.write(
        `[browser-cli] Update available: ${currentVersion} -> ${result}. Run: npm i -g ${PACKAGE_NAME}\n`,
      );
    }
  };
}

export async function runSelfUpdate(): Promise<void> {
  const { execSync } = await import("node:child_process");
  process.stderr.write("[browser-cli] Updating to latest version...\n");
  try {
    execSync(`npm i -g ${PACKAGE_NAME}@latest`, { stdio: "inherit" });
    process.stderr.write("[browser-cli] Update complete.\n");
  } catch {
    process.stderr.write(
      `[browser-cli] Update failed. Try manually: npm i -g ${PACKAGE_NAME}@latest\n`,
    );
    process.exit(1);
  }
}
