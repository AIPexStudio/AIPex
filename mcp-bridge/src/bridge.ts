/**
 * AIPex MCP Bridge
 *
 * A stdio MCP server that bridges AI agents to the AIPex Chrome extension via WebSocket.
 *
 *   Agent (MCP client) ──stdio──▶ this bridge ──WebSocket──▶ AIPex extension (MCP server)
 *
 * Usage:
 *   npx aipex-mcp-bridge [--port 9223]
 *
 * Works with any MCP client that supports stdio transport:
 *   - Cursor, Claude Desktop, Claude Code, VS Code Copilot, Windsurf, Zed, etc.
 */

import { createServer } from "node:http"
import { createInterface } from "node:readline"
import { WebSocket, WebSocketServer } from "ws"

// ── CLI args ────────────────────────────────────────────────────────────────

const cliArgs = process.argv.slice(2)

if (cliArgs.includes("--help") || cliArgs.includes("-h")) {
  process.stderr.write(`
AIPex MCP Bridge — connect AI agents to AIPex browser extension

Usage:
  npx aipex-mcp-bridge [--port <port>]

Options:
  --port <port>  WebSocket port for AIPex extension (default: 9223)
  --help, -h     Show this help message
  --version, -v  Show version

After starting, open AIPex extension Options and connect to:
  ws://localhost:<port>
`)
  process.exit(0)
}

if (cliArgs.includes("--version") || cliArgs.includes("-v")) {
  process.stderr.write("aipex-mcp-bridge 1.0.0\n")
  process.exit(0)
}

const portIdx = cliArgs.indexOf("--port")
const WS_PORT = portIdx !== -1 ? parseInt(cliArgs[portIdx + 1], 10) : 9223

if (isNaN(WS_PORT) || WS_PORT < 1 || WS_PORT > 65535) {
  process.stderr.write(`Invalid port number. Must be between 1 and 65535.\n`)
  process.exit(1)
}

// ── Logging (stderr only — stdout is reserved for MCP protocol) ─────────────

function log(msg: string) {
  process.stderr.write(`[aipex-bridge] ${msg}\n`)
}

// ── JSON-RPC types ──────────────────────────────────────────────────────────

interface JSONRPCRequest {
  jsonrpc: "2.0"
  id: number | string | null
  method: string
  params?: unknown
}

interface JSONRPCResponse {
  jsonrpc: "2.0"
  id: number | string | null
  result?: unknown
  error?: { code: number; message: string }
}

type JSONRPCMessage = JSONRPCRequest | JSONRPCResponse

interface McpTool {
  name: string
  description?: string
  inputSchema?: unknown
}

// ── AIPex WebSocket connection state ────────────────────────────────────────

let aipexSocket: WebSocket | null = null
let aipexReady = false
let cachedTools: McpTool[] = []

let nextAipexId = 1
const aipexPending = new Map<
  number | string,
  { resolve: (v: unknown) => void; reject: (e: Error) => void }
>()

// ── Respond to MCP client (stdout, JSON-RPC 2.0) ───────────────────────────

function respond(id: number | string | null, result: unknown) {
  const msg: JSONRPCResponse = { jsonrpc: "2.0", id, result }
  process.stdout.write(JSON.stringify(msg) + "\n")
}

function respondError(
  id: number | string | null,
  code: number,
  message: string
) {
  const msg: JSONRPCResponse = { jsonrpc: "2.0", id, error: { code, message } }
  process.stdout.write(JSON.stringify(msg) + "\n")
}

// ── Send requests to AIPex (WebSocket) ──────────────────────────────────────

function sendToAipex(method: string, params: unknown = {}): Promise<unknown> {
  if (!aipexSocket || aipexSocket.readyState !== WebSocket.OPEN) {
    return Promise.reject(new Error("AIPex extension not connected"))
  }
  const id = nextAipexId++
  const msg = { jsonrpc: "2.0", id, method, params }
  aipexSocket.send(JSON.stringify(msg))
  return new Promise((resolve, reject) => {
    aipexPending.set(id, { resolve, reject })
  })
}

// ── Handle messages from AIPex ──────────────────────────────────────────────

function handleAipexMessage(raw: string) {
  let msg: JSONRPCMessage
  try {
    msg = JSON.parse(raw)
  } catch {
    log(`Failed to parse AIPex message: ${raw.slice(0, 100)}`)
    return
  }

  if ("result" in msg || "error" in msg) {
    const res = msg as JSONRPCResponse
    const p = aipexPending.get(res.id!)
    if (p) {
      aipexPending.delete(res.id!)
      if (res.error) {
        p.reject(new Error(res.error.message))
      } else {
        p.resolve(res.result)
      }
    }
  }
}

// ── MCP handshake (runs automatically when AIPex connects) ──────────────────

async function doAipexHandshake(socket: WebSocket) {
  log("Starting MCP handshake with AIPex...")

  const initResult = (await sendToAipex("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "aipex-mcp-bridge", version: "1.0.0" }
  })) as Record<string, unknown>

  const serverInfo = initResult?.serverInfo as
    | Record<string, string>
    | undefined
  log(`AIPex server: ${serverInfo?.name ?? "?"} v${serverInfo?.version ?? "?"}`)

  socket.send(
    JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })
  )

  const toolsResult = (await sendToAipex("tools/list")) as Record<
    string,
    unknown
  >
  cachedTools = (toolsResult?.tools as McpTool[]) ?? []
  aipexReady = true

  log(`Handshake complete. ${cachedTools.length} tools available.`)
}

// ── Handle MCP requests from the agent (stdin) ──────────────────────────────

async function handleAgentRequest(req: JSONRPCRequest) {
  const { id, method, params } = req

  if (method === "initialize") {
    respond(id, {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "aipex-mcp-bridge", version: "1.0.0" }
    })
    return
  }

  if (method === "notifications/initialized") {
    return
  }

  if (method === "tools/list") {
    if (aipexReady && cachedTools.length > 0) {
      respond(id, { tools: cachedTools })
    } else {
      respond(id, {
        tools: [
          {
            name: "check_aipex_connection",
            description: [
              "AIPex extension is not connected. To enable browser control:",
              `1. Open Chrome → AIPex extension → Options page`,
              `2. Set WebSocket URL to: ws://localhost:${WS_PORT}`,
              `3. Click Connect`,
              `Then reload this MCP server.`
            ].join("\n"),
            inputSchema: { type: "object", properties: {} }
          }
        ]
      })
    }
    return
  }

  if (method === "tools/call") {
    if (
      !aipexReady ||
      !aipexSocket ||
      aipexSocket.readyState !== WebSocket.OPEN
    ) {
      respondError(
        id,
        -32000,
        `AIPex extension not connected. Open AIPex Options and connect to ws://localhost:${WS_PORT}`
      )
      return
    }
    try {
      const result = await sendToAipex(
        "tools/call",
        params as Record<string, unknown>
      )
      respond(id, result)
    } catch (e) {
      respondError(id, -32000, e instanceof Error ? e.message : String(e))
    }
    return
  }

  if (method === "ping") {
    if (aipexReady && aipexSocket?.readyState === WebSocket.OPEN) {
      try {
        const result = await sendToAipex("ping")
        respond(id, result)
      } catch {
        respond(id, {})
      }
    } else {
      respond(id, {})
    }
    return
  }

  respondError(id, -32601, `Method not found: ${method}`)
}

// ── Read MCP requests from stdin ────────────────────────────────────────────

const stdinRl = createInterface({ input: process.stdin })

stdinRl.on("line", (line) => {
  const trimmed = line.trim()
  if (!trimmed) return

  let req: JSONRPCRequest
  try {
    req = JSON.parse(trimmed)
  } catch {
    log(`Failed to parse stdin: ${trimmed.slice(0, 100)}`)
    return
  }

  handleAgentRequest(req).catch((e) => {
    log(`Error handling request: ${e instanceof Error ? e.message : String(e)}`)
    if (req.id != null) {
      respondError(req.id, -32603, "Internal error")
    }
  })
})

stdinRl.on("close", () => {
  log("stdin closed, shutting down")
  process.exit(0)
})

// ── WebSocket server (waits for AIPex extension to connect) ─────────────────

const httpServer = createServer()
const wss = new WebSocketServer({ server: httpServer })

wss.on("connection", (socket, req) => {
  const addr = req.socket.remoteAddress ?? "unknown"

  if (aipexSocket && aipexSocket.readyState === WebSocket.OPEN) {
    log(`New connection from ${addr}, closing previous`)
    aipexSocket.close()
  }

  aipexSocket = socket
  aipexReady = false
  cachedTools = []
  log(`AIPex extension connected from ${addr}`)

  socket.on("message", (data) => {
    handleAipexMessage(data.toString())
  })

  socket.on("close", () => {
    log("AIPex extension disconnected")
    if (aipexSocket === socket) {
      aipexSocket = null
      aipexReady = false
      cachedTools = []
    }
  })

  socket.on("error", (err) => {
    log(`Socket error: ${err.message}`)
  })

  doAipexHandshake(socket).catch((err: Error) => {
    log(`Handshake failed: ${err.message}`)
  })
})

wss.on("error", (err) => {
  log(`WebSocket server error: ${err.message}`)
})

// ── Start ───────────────────────────────────────────────────────────────────

httpServer.listen(WS_PORT, () => {
  log(`AIPex MCP Bridge started`)
  log(`WebSocket server listening on ws://localhost:${WS_PORT}`)
  log(`Waiting for AIPex extension to connect...`)
  log(`Open AIPex Options → set URL to ws://localhost:${WS_PORT} → Connect`)
})

process.on("SIGINT", () => {
  log("Shutting down...")
  wss.close()
  httpServer.close()
  process.exit(0)
})
