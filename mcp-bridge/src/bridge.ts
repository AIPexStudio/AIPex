/**
 * AIPex MCP Bridge
 *
 * A stdio MCP server that auto-starts a shared daemon and relays tool calls
 * to the AIPex Chrome extension through it.
 *
 * Architecture:
 *
 *   IDE ──stdio──▶ this bridge ──WS /bridge──▶ daemon ──WS /extension──▶ AIPex extension
 *
 * On startup:
 *   1. Try connecting to existing daemon at ws://localhost:<port>/bridge
 *   2. If no daemon running, spawn one as a detached background process
 *   3. Retry connection with backoff
 *   4. Forward all tool calls over WebSocket
 *
 * Multiple bridge instances share one daemon (multi-client support).
 *
 * Usage:
 *   npx aipex-mcp-bridge [--port 9223]
 */

import { fork } from "node:child_process"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js"
import { WebSocket } from "ws"

import { toolSchemas } from "./tool-schemas.js"

// ── CLI args ────────────────────────────────────────────────────────────────

const cliArgs = process.argv.slice(2)

if (cliArgs.includes("--help") || cliArgs.includes("-h")) {
  process.stderr.write(`
AIPex MCP Bridge — connect AI agents to AIPex browser extension

Usage:
  npx aipex-mcp-bridge [--port <port>] [--host <host>]

Options:
  --port <port>  Daemon port (default: 9223)
  --host <host>  Daemon host (default: 127.0.0.1)
  --help, -h     Show this help message
  --version, -v  Show version

The bridge auto-starts a background daemon if one isn't already running.
Multiple IDE instances (Cursor, Claude Code) can run simultaneously.

After starting, connect AIPex extension → Options → ws://localhost:<port>/extension
`)
  process.exit(0)
}

if (cliArgs.includes("--version") || cliArgs.includes("-v")) {
  process.stderr.write("aipex-mcp-bridge 3.1.0\n")
  process.exit(0)
}

function getArg(name: string, fallback: string): string {
  const idx = cliArgs.indexOf(name)
  return idx !== -1 && cliArgs[idx + 1] ? cliArgs[idx + 1] : fallback
}

const PORT = parseInt(getArg("--port", "9223"), 10)
const HOST = getArg("--host", "127.0.0.1")
const DAEMON_URL = `ws://${HOST}:${PORT}/bridge`
const MAX_CONNECT_ATTEMPTS = 10
const INITIAL_BACKOFF_MS = 300
const TOOL_CALL_TIMEOUT_MS = 60_000

// ── Logging (stderr only — stdout reserved for MCP) ─────────────────────────

function log(msg: string) {
  process.stderr.write(`[aipex-bridge] ${msg}\n`)
}

// ── Daemon connection ───────────────────────────────────────────────────────

let daemonWs: WebSocket | undefined
let nextReqId = 1

interface PendingCall {
  resolve: (result: unknown) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

const pendingCalls = new Map<number, PendingCall>()

function isDaemonConnected(): boolean {
  return !!daemonWs && daemonWs.readyState === WebSocket.OPEN
}

function sendToolCallToDaemon(
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  if (!isDaemonConnected()) {
    return Promise.reject(
      new Error(
        "Not connected to AIPex daemon. The daemon may have stopped.\n" +
          "Restart the bridge or check if port " +
          PORT +
          " is available."
      )
    )
  }

  const id = nextReqId++
  const msg = {
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: { name: toolName, arguments: args }
  }
  daemonWs!.send(JSON.stringify(msg))

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (pendingCalls.has(id)) {
        pendingCalls.delete(id)
        reject(
          new Error(
            `Tool '${toolName}' timed out after ${TOOL_CALL_TIMEOUT_MS}ms`
          )
        )
      }
    }, TOOL_CALL_TIMEOUT_MS)
    pendingCalls.set(id, { resolve, reject, timer })
  })
}

function handleDaemonMessage(raw: string) {
  let msg: Record<string, unknown>
  try {
    msg = JSON.parse(raw)
  } catch {
    return
  }

  const id = msg.id as number | undefined
  if (id == null) return

  const pending = pendingCalls.get(id)
  if (!pending) return

  clearTimeout(pending.timer)
  pendingCalls.delete(id)

  if (msg.error) {
    const err = msg.error as { message?: string }
    pending.reject(new Error(err.message || "Daemon returned an error"))
  } else {
    pending.resolve(msg.result)
  }
}

function rejectAllPending(reason: string) {
  for (const [, entry] of pendingCalls) {
    clearTimeout(entry.timer)
    entry.reject(new Error(reason))
  }
  pendingCalls.clear()
}

// ── Daemon lifecycle ────────────────────────────────────────────────────────

function tryConnectToDaemon(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(DAEMON_URL)
    const timeout = setTimeout(() => {
      ws.terminate()
      reject(new Error("Connection timeout"))
    }, 3_000)

    ws.on("open", () => {
      clearTimeout(timeout)
      resolve(ws)
    })

    ws.on("error", (err) => {
      clearTimeout(timeout)
      reject(err)
    })
  })
}

function spawnDaemon() {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)
  const daemonPath = join(__dirname, "daemon.js")

  log(`Spawning daemon: ${daemonPath} --port ${PORT} --host ${HOST}`)

  const child = fork(daemonPath, ["--port", String(PORT), "--host", HOST], {
    detached: true,
    stdio: "ignore"
  })
  child.unref()
  child.on("error", (err) => {
    log(`Failed to spawn daemon: ${err.message}`)
  })
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function connectWithAutoSpawn(): Promise<WebSocket> {
  // First, try connecting to an existing daemon
  try {
    const ws = await tryConnectToDaemon()
    log("Connected to existing daemon")
    return ws
  } catch {
    // No daemon running
  }

  // Spawn a new daemon
  log("No daemon running, spawning one...")
  spawnDaemon()

  // Retry with backoff
  let backoff = INITIAL_BACKOFF_MS
  for (let attempt = 1; attempt <= MAX_CONNECT_ATTEMPTS; attempt++) {
    await sleep(backoff)
    try {
      const ws = await tryConnectToDaemon()
      log(`Connected to daemon (attempt ${attempt})`)
      return ws
    } catch {
      backoff = Math.min(backoff * 1.5, 2_000)
    }
  }

  throw new Error(
    `Failed to connect to daemon after ${MAX_CONNECT_ATTEMPTS} attempts.\n` +
      `Check if port ${PORT} is available: lsof -i :${PORT}`
  )
}

function setupDaemonConnection(ws: WebSocket) {
  daemonWs = ws

  ws.on("message", (data) => handleDaemonMessage(data.toString()))

  ws.on("close", () => {
    log("Daemon connection lost, will reconnect on next tool call")
    rejectAllPending("Daemon connection lost")
    daemonWs = undefined
  })

  ws.on("error", (err) => {
    log(`Daemon WebSocket error: ${err.message}`)
  })
}

async function ensureDaemonConnection() {
  if (isDaemonConnected()) return

  log("Reconnecting to daemon...")
  const ws = await connectWithAutoSpawn()
  setupDaemonConnection(ws)
}

// ── MCP Server (stdio to IDE) ───────────────────────────────────────────────

const server = new Server(
  { name: "aipex-mcp-bridge", version: "3.1.0" },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: toolSchemas }
})

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  const tool = toolSchemas.find((t) => t.name === name)
  if (!tool) {
    return {
      content: [{ type: "text", text: `Tool "${name}" not found` }],
      isError: true
    }
  }

  try {
    await ensureDaemonConnection()

    const result = (await sendToolCallToDaemon(
      name,
      (args ?? {}) as Record<string, unknown>
    )) as Record<string, unknown> | undefined

    if (result && result.content) {
      return result as {
        content: Array<{
          type: string
          text?: string
          data?: string
          mimeType?: string
        }>
      }
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: String(error instanceof Error ? error.message : error)
        }
      ],
      isError: true
    }
  }
})

// ── Start ───────────────────────────────────────────────────────────────────

async function main() {
  const ws = await connectWithAutoSpawn()
  setupDaemonConnection(ws)

  const transport = new StdioServerTransport()
  await server.connect(transport)

  log("AIPex MCP Bridge started (stdio → daemon relay)")
  log(`Connected to daemon at ${DAEMON_URL}`)
}

// ── Exit handling ───────────────────────────────────────────────────────────

process.stdin.on("close", async () => {
  setTimeout(() => process.exit(0), 5_000)
  rejectAllPending("Bridge shutting down")
  if (daemonWs) daemonWs.close()
  await server.close()
  process.exit(0)
})

process.on("SIGINT", () => {
  log("Shutting down...")
  rejectAllPending("Bridge shutting down")
  if (daemonWs) daemonWs.close()
  process.exit(0)
})

main().catch((err) => {
  log(`Fatal error: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})
