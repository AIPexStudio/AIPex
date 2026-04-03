/**
 * AIPex MCP Daemon
 *
 * A background WebSocket relay that bridges multiple MCP bridge instances
 * to a single AIPex Chrome extension connection.
 *
 * Architecture:
 *
 *   bridge.ts #1 ──WS /bridge──┐
 *   bridge.ts #2 ──WS /bridge──┤── this daemon ──WS /extension──▶ AIPex extension
 *   aipex-cli   ──WS /cli─────┘
 *
 * Spawned automatically by bridge.ts when no daemon is running.
 * Self-terminates after IDLE_TIMEOUT_MS with no connections.
 */

import { unlinkSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { homedir } from "node:os";
import { join } from "node:path";
import { WebSocket, WebSocketServer } from "ws";

import { toolSchemas } from "./tool-schemas.js";

// ── CLI args ────────────────────────────────────────────────────────────────

const cliArgs = process.argv.slice(2);

function getArg(name: string, fallback: string): string {
  const idx = cliArgs.indexOf(name);
  return idx !== -1 && cliArgs[idx + 1] ? cliArgs[idx + 1] : fallback;
}

const PORT = parseInt(getArg("--port", "9223"), 10);
const HOST = getArg("--host", "127.0.0.1");
const PID_FILE = join(homedir(), ".aipex-daemon.pid");
const IDLE_TIMEOUT_MS = 30_000;
const TOOL_CALL_TIMEOUT_MS = 60_000;
const PING_INTERVAL_MS = 15_000;
const PING_TIMEOUT_MS = 5_000;

// ── Logging ─────────────────────────────────────────────────────────────────

function log(msg: string) {
  process.stderr.write(`[aipex-daemon] ${msg}\n`);
}

// ── Origin validation ───────────────────────────────────────────────────────

/**
 * Validate the Origin header on WebSocket upgrade requests to prevent
 * cross-site WebSocket hijacking (CSWSH).
 *
 * Allowed origins:
 *   - No Origin header (Node.js clients: bridge.ts, cli.ts, aipex-cli)
 *   - chrome-extension:// (the AIPex browser extension)
 *   - moz-extension:// (Firefox extension equivalent)
 *
 * Rejected origins:
 *   - http:// or https:// (web pages — attack vector for CSWSH)
 */
function isOriginAllowed(origin: string | undefined): boolean {
  // Node.js WebSocket clients don't send an Origin header — allow
  if (!origin) return true;

  // Browser extensions are trusted clients
  if (origin.startsWith("chrome-extension://")) return true;
  if (origin.startsWith("moz-extension://")) return true;

  // Reject all web page origins (http/https) — prevents CSWSH attacks
  return false;
}

// ── Extension connection ────────────────────────────────────────────────────

let extensionWs: WebSocket | undefined;
let nextExtId = 1;

interface PendingExtCall {
  bridgeSocket: WebSocket;
  bridgeReqId: number | string;
  timer: ReturnType<typeof setTimeout>;
}

const pendingExtCalls = new Map<number, PendingExtCall>();
let extPingInterval: ReturnType<typeof setInterval> | null = null;

function isExtensionConnected(): boolean {
  return !!extensionWs && extensionWs.readyState === WebSocket.OPEN;
}

function setExtensionSocket(ws: WebSocket) {
  if (extensionWs && extensionWs.readyState === WebSocket.OPEN) {
    extensionWs.close();
  }
  rejectAllPendingExt("New extension connection replaced previous one");
  extensionWs = ws;

  ws.on("message", (data) => handleExtensionMessage(data.toString()));

  ws.on("close", () => {
    if (extensionWs === ws) {
      log("Extension disconnected");
      stopExtPing();
      rejectAllPendingExt("Extension disconnected");
      extensionWs = undefined;
      resetIdleTimer();
    }
  });

  ws.on("error", (err) => {
    log(`Extension WebSocket error: ${err.message}`);
  });

  startExtPing();
  resetIdleTimer();
  log("Extension connected");
}

function handleExtensionMessage(raw: string) {
  let msg: Record<string, unknown>;
  try {
    msg = JSON.parse(raw);
  } catch {
    log(`Failed to parse extension message: ${raw.slice(0, 200)}`);
    return;
  }

  const id = msg.id as number | undefined;
  if (id == null) return;

  const pending = pendingExtCalls.get(id);
  if (!pending) return;

  clearTimeout(pending.timer);
  pendingExtCalls.delete(id);

  const response: Record<string, unknown> = {
    jsonrpc: "2.0",
    id: pending.bridgeReqId,
  };

  if (msg.error) {
    response.error = msg.error;
  } else {
    response.result = msg.result;
  }

  if (pending.bridgeSocket.readyState === WebSocket.OPEN) {
    pending.bridgeSocket.send(JSON.stringify(response));
  }
}

function forwardToolCall(
  bridgeSocket: WebSocket,
  bridgeReqId: number | string,
  toolName: string,
  args: Record<string, unknown>,
) {
  if (!isExtensionConnected()) {
    const errResp = {
      jsonrpc: "2.0",
      id: bridgeReqId,
      error: {
        code: -1,
        message:
          "AIPex extension is not connected. To connect:\n" +
          "1. Open Chrome → AIPex extension → Options page\n" +
          `2. Set WebSocket URL to ws://localhost:${PORT}/extension\n` +
          "3. Click Connect",
      },
    };
    if (bridgeSocket.readyState === WebSocket.OPEN) {
      bridgeSocket.send(JSON.stringify(errResp));
    }
    return;
  }

  const extId = nextExtId++;
  const msg = {
    jsonrpc: "2.0",
    id: extId,
    method: "tools/call",
    params: { name: toolName, arguments: args },
  };
  extensionWs!.send(JSON.stringify(msg));

  const timer = setTimeout(() => {
    if (pendingExtCalls.has(extId)) {
      pendingExtCalls.delete(extId);
      const timeoutResp = {
        jsonrpc: "2.0",
        id: bridgeReqId,
        error: {
          code: -1,
          message: `Tool '${toolName}' timed out after ${TOOL_CALL_TIMEOUT_MS}ms`,
        },
      };
      if (bridgeSocket.readyState === WebSocket.OPEN) {
        bridgeSocket.send(JSON.stringify(timeoutResp));
      }
    }
  }, TOOL_CALL_TIMEOUT_MS);

  pendingExtCalls.set(extId, { bridgeSocket, bridgeReqId, timer });
}

function rejectAllPendingExt(reason: string) {
  for (const [, entry] of pendingExtCalls) {
    clearTimeout(entry.timer);
    const errResp = {
      jsonrpc: "2.0",
      id: entry.bridgeReqId,
      error: { code: -1, message: reason },
    };
    if (entry.bridgeSocket.readyState === WebSocket.OPEN) {
      entry.bridgeSocket.send(JSON.stringify(errResp));
    }
  }
  pendingExtCalls.clear();
}

function startExtPing() {
  stopExtPing();
  extPingInterval = setInterval(() => {
    if (!isExtensionConnected()) {
      stopExtPing();
      return;
    }
    const id = nextExtId++;
    const msg = { jsonrpc: "2.0", id, method: "ping" };
    extensionWs!.send(JSON.stringify(msg));

    const timer = setTimeout(() => {
      if (pendingExtCalls.has(id)) {
        pendingExtCalls.delete(id);
        log("Extension ping timeout, closing connection");
        if (extensionWs) extensionWs.close();
      }
    }, PING_TIMEOUT_MS);

    pendingExtCalls.set(id, {
      bridgeSocket: extensionWs!,
      bridgeReqId: `ping-${id}`,
      timer,
    });
  }, PING_INTERVAL_MS);
}

function stopExtPing() {
  if (extPingInterval) {
    clearInterval(extPingInterval);
    extPingInterval = null;
  }
}

// ── Bridge client handling ──────────────────────────────────────────────────

const bridgeClients = new Set<WebSocket>();

function handleBridgeMessage(socket: WebSocket, raw: string) {
  let msg: Record<string, unknown>;
  try {
    msg = JSON.parse(raw);
  } catch {
    return;
  }

  const id = msg.id as number | string | undefined;
  const method = msg.method as string | undefined;

  if (method === "tools/call") {
    const params = (msg.params ?? {}) as Record<string, unknown>;
    const name = params.name as string;
    const args = (params.arguments ?? {}) as Record<string, unknown>;
    forwardToolCall(socket, id ?? 0, name, args);
    return;
  }

  if (method === "tools/list") {
    socket.send(
      JSON.stringify({ jsonrpc: "2.0", id, result: { tools: toolSchemas } }),
    );
    return;
  }

  if (method === "ping") {
    socket.send(JSON.stringify({ jsonrpc: "2.0", id, result: {} }));
    return;
  }

  if (method === "status") {
    socket.send(
      JSON.stringify({
        jsonrpc: "2.0",
        id,
        result: {
          extensionConnected: isExtensionConnected(),
          bridgeClients: bridgeClients.size,
        },
      }),
    );
    return;
  }
}

// ── CLI client handling (backward compat) ───────────────────────────────────

function handleCliMessage(socket: WebSocket, raw: string) {
  handleBridgeMessage(socket, raw);
}

// ── Idle auto-shutdown ──────────────────────────────────────────────────────

let idleTimer: ReturnType<typeof setTimeout> | null = null;

function resetIdleTimer() {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }

  if (bridgeClients.size === 0 && !isExtensionConnected()) {
    idleTimer = setTimeout(() => {
      log(`No connections for ${IDLE_TIMEOUT_MS / 1000}s, shutting down`);
      shutdown();
    }, IDLE_TIMEOUT_MS);
  }
}

// ── HTTP + WebSocket Server ─────────────────────────────────────────────────

const httpServer = createServer((req, res) => {
  if (req.url === "/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        extensionConnected: isExtensionConnected(),
        bridgeClients: bridgeClients.size,
        version: "3.1.0",
      }),
    );
    return;
  }
  res.writeHead(404).end("Not found");
});

const extensionWss = new WebSocketServer({ noServer: true });
const bridgeWss = new WebSocketServer({ noServer: true });
const cliWss = new WebSocketServer({ noServer: true });

httpServer.on("upgrade", (req, socket, head) => {
  const origin = req.headers.origin;

  // Reject WebSocket upgrades from web page origins to prevent CSWSH.
  // Legitimate clients (bridge.ts, cli.ts) are Node.js processes that
  // don't send an Origin header. The Chrome extension sends
  // chrome-extension:// which is explicitly allowed.
  if (!isOriginAllowed(origin)) {
    log(`Rejected WebSocket upgrade from origin: ${origin}`);
    socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
    socket.destroy();
    return;
  }

  const pathname = new URL(req.url ?? "/", "http://localhost").pathname;

  if (pathname === "/extension" || pathname === "/") {
    extensionWss.handleUpgrade(req, socket, head, (ws) => {
      extensionWss.emit("connection", ws, req);
    });
  } else if (pathname === "/bridge") {
    bridgeWss.handleUpgrade(req, socket, head, (ws) => {
      bridgeWss.emit("connection", ws, req);
    });
  } else if (pathname === "/cli") {
    cliWss.handleUpgrade(req, socket, head, (ws) => {
      cliWss.emit("connection", ws, req);
    });
  } else {
    socket.destroy();
  }
});

extensionWss.on("connection", (socket, req) => {
  const addr = req.socket.remoteAddress ?? "unknown";
  log(`Extension connected from ${addr}`);
  setExtensionSocket(socket);
});

bridgeWss.on("connection", (socket) => {
  bridgeClients.add(socket);
  resetIdleTimer();
  log(`Bridge client connected (total: ${bridgeClients.size})`);

  socket.on("message", (data) => handleBridgeMessage(socket, data.toString()));

  socket.on("close", () => {
    bridgeClients.delete(socket);
    resetIdleTimer();
    log(`Bridge client disconnected (total: ${bridgeClients.size})`);
  });

  socket.on("error", (err) => {
    log(`Bridge client error: ${err.message}`);
  });
});

cliWss.on("connection", (socket) => {
  bridgeClients.add(socket);
  resetIdleTimer();

  socket.on("message", (data) => handleCliMessage(socket, data.toString()));

  socket.on("close", () => {
    bridgeClients.delete(socket);
    resetIdleTimer();
  });
});

// ── PID file ────────────────────────────────────────────────────────────────

function writePidFile() {
  try {
    writeFileSync(PID_FILE, String(process.pid));
  } catch {
    // non-critical
  }
}

function removePidFile() {
  try {
    unlinkSync(PID_FILE);
  } catch {
    // ignore
  }
}

// ── Start ───────────────────────────────────────────────────────────────────

httpServer.listen(PORT, HOST, () => {
  writePidFile();
  log(`AIPex MCP Daemon started (v3.1.0) pid=${process.pid}`);
  log(`Extension WS:  ws://${HOST}:${PORT}/extension`);
  log(`Bridge WS:     ws://${HOST}:${PORT}/bridge`);
  log(`CLI WS:        ws://${HOST}:${PORT}/cli`);
  log(`Health:        http://${HOST}:${PORT}/health`);
  resetIdleTimer();
});

httpServer.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    log(`Port ${PORT} already in use — another daemon is likely running`);
    process.exit(0);
  }
  log(`Server error: ${err.message}`);
  process.exit(1);
});

// ── Shutdown ────────────────────────────────────────────────────────────────

function shutdown() {
  stopExtPing();
  rejectAllPendingExt("Daemon shutting down");
  if (extensionWs) {
    extensionWs.close();
    extensionWs = undefined;
  }
  extensionWss.close();
  bridgeWss.close();
  cliWss.close();
  httpServer.close();
  removePidFile();
  if (idleTimer) clearTimeout(idleTimer);
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
