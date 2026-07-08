import { fork, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocket } from "ws";

const ENTRYPOINT_PATH = "/entrypoint.sh";
const CALL_TIMEOUT_MS = 60_000;
const MAX_RETRY_TIMEOUT_MS = parseInt(
  process.env.BROWSER_CLI_CONNECT_TIMEOUT ?? "60000",
  10,
);
const INITIAL_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 5_000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryableError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes("not connected") ||
    lower.includes("extension is not connected") ||
    lower.includes("no extension") ||
    lower.includes("econnrefused") ||
    lower.includes("fetch failed")
  );
}

function spawnDaemon(port: number, host: string): void {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const daemonPath = join(__dirname, "..", "daemon.js");

  // Fall back to co-located daemon if the parent path doesn't exist
  const actualPath = existsSync(daemonPath)
    ? daemonPath
    : join(__dirname, "daemon.js");

  try {
    const child = fork(actualPath, ["--port", String(port), "--host", host], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
    child.on("error", () => {});
  } catch {
    // ignore spawn errors
  }
}

interface ToolCallResult {
  ok: boolean;
  data?: unknown;
  error?: string;
  hint?: string;
}

function attemptWsToolCall(
  wsUrl: string,
  name: string,
  args: Record<string, unknown>,
): Promise<{ retry: boolean; result?: ToolCallResult }> {
  return new Promise((resolve) => {
    let settled = false;
    const ws = new WebSocket(wsUrl);

    const connectTimer = setTimeout(() => {
      if (!settled) {
        settled = true;
        ws.terminate();
        resolve({ retry: true });
      }
    }, 5_000);

    ws.on("error", () => {
      if (!settled) {
        settled = true;
        clearTimeout(connectTimer);
        resolve({ retry: true });
      }
    });

    ws.on("close", () => {
      if (!settled) {
        settled = true;
        clearTimeout(connectTimer);
        resolve({ retry: true });
      }
    });

    ws.on("open", () => {
      clearTimeout(connectTimer);
      const msg = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name, arguments: args },
      };
      ws.send(JSON.stringify(msg));

      const callTimer = setTimeout(() => {
        if (!settled) {
          settled = true;
          ws.close();
          resolve({
            retry: false,
            result: {
              ok: false,
              error: `Tool '${name}' timed out after ${CALL_TIMEOUT_MS}ms`,
            },
          });
        }
      }, CALL_TIMEOUT_MS);

      ws.on("message", (data) => {
        if (settled) return;
        settled = true;
        clearTimeout(callTimer);

        try {
          const response = JSON.parse(data.toString());

          if (response.error) {
            const errMsg =
              response.error.message ?? JSON.stringify(response.error);
            if (isRetryableError(errMsg)) {
              ws.close();
              resolve({ retry: true });
              return;
            }
            ws.close();
            resolve({
              retry: false,
              result: { ok: false, error: errMsg },
            });
            return;
          }

          const result = response.result;
          let parsed: unknown = result;

          if (result?.content && Array.isArray(result.content)) {
            const parts: unknown[] = [];
            for (const item of result.content) {
              if (item.type === "text" && item.text) {
                try {
                  parts.push(JSON.parse(item.text));
                } catch {
                  parts.push(item.text);
                }
              } else if (item.type === "image") {
                parts.push({
                  type: "image",
                  mimeType: item.mimeType ?? "image/png",
                  sizeKB: Number(
                    (((item.data?.length ?? 0) * 0.75) / 1024).toFixed(1),
                  ),
                });
              }
            }
            parsed = parts.length === 1 ? parts[0] : parts;
          }

          ws.close();
          resolve({
            retry: false,
            result: { ok: true, data: parsed },
          });
        } catch {
          ws.close();
          resolve({
            retry: false,
            result: {
              ok: false,
              error: `Failed to parse daemon response`,
            },
          });
        }
      });
    });
  });
}

export interface DaemonClientOptions {
  port?: number;
  host?: string;
}

export async function callTool(
  toolName: string,
  args: Record<string, unknown>,
  opts: DaemonClientOptions = {},
): Promise<ToolCallResult> {
  const port = opts.port ?? 9223;
  const host = opts.host ?? "127.0.0.1";
  const wsUrl =
    process.env.BROWSER_CLI_WS_URL ?? `ws://${host}:${port}/cli`;

  const deadline = Date.now() + MAX_RETRY_TIMEOUT_MS;
  let backoff = INITIAL_BACKOFF_MS;
  let attempt = 0;
  let daemonSpawned = false;

  while (true) {
    attempt++;

    const outcome = await attemptWsToolCall(wsUrl, toolName, args);

    if (!outcome.retry) {
      return outcome.result!;
    }

    if (Date.now() >= deadline) {
      return {
        ok: false,
        error: `Timed out after ${MAX_RETRY_TIMEOUT_MS / 1000}s waiting for daemon at ${wsUrl}`,
        hint: "Make sure AIPex extension is connected. Run: browser-cli status",
      };
    }

    if (attempt === 1) {
      if (existsSync(ENTRYPOINT_PATH)) {
        process.stderr.write(
          `[browser-cli] Auto-starting services via ${ENTRYPOINT_PATH} ...\n`,
        );
        const child = spawn(ENTRYPOINT_PATH, [], {
          detached: true,
          stdio: "ignore",
          shell: true,
          env: { ...process.env, DISPLAY: ":99" },
        });
        child.on("error", () => {});
        child.unref();
      } else if (!daemonSpawned) {
        process.stderr.write("[browser-cli] Spawning daemon...\n");
        spawnDaemon(port, host);
        daemonSpawned = true;
      }
      process.stderr.write(
        "[browser-cli] Waiting for AIPex daemon + extension...\n",
      );
    }

    const remaining = Math.max(0, deadline - Date.now());
    const wait = Math.min(backoff, remaining, MAX_BACKOFF_MS);
    process.stderr.write(
      `[browser-cli] Retry #${attempt} in ${(wait / 1000).toFixed(1)}s\n`,
    );
    await sleep(wait);
    backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
  }
}

export async function checkDaemonHealth(
  opts: DaemonClientOptions = {},
): Promise<ToolCallResult> {
  const port = opts.port ?? 9223;
  const host = opts.host ?? "127.0.0.1";
  const url = `http://${host}:${port}/health`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3_000) });
    if (!res.ok) {
      return { ok: false, error: `Health check failed: HTTP ${res.status}` };
    }
    const data = await res.json();
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      error: `Daemon not running at ${host}:${port}`,
      hint: "Run any browser-cli command to auto-start the daemon",
    };
  }
}
