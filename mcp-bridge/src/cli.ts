/**
 * AIPex CLI — command-line tool for controlling the browser via AIPex.
 *
 * Connects to the AIPex daemon via WebSocket at /cli endpoint.
 * Auto-spawns the daemon if it's not running (same as bridge.ts).
 *
 * Usage:
 *   aipex-cli <tool_name> [--param value ...]
 *   aipex-cli --list
 *   aipex-cli --help <tool_name>
 *   aipex-cli --json '{"name":"create_new_tab","arguments":{"url":"..."}}'
 */

import { fork, spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { WebSocket } from "ws"

import { toolSchemas, type ToolSchema } from "./tool-schemas.js"

const DEFAULT_WS_URL = "ws://localhost:9223/cli"
const ENTRYPOINT_PATH = "/entrypoint.sh"
const CALL_TIMEOUT_MS = 60_000
const MAX_RETRY_TIMEOUT_MS = parseInt(
  process.env.AIPEX_CONNECT_TIMEOUT ?? "60000",
  10
)
const INITIAL_BACKOFF_MS = 500
const MAX_BACKOFF_MS = 5_000

// ── CLI argument parsing ─────────────────────────────────────────────────────

const args = process.argv.slice(2)

if (args.length === 0 || args[0] === "-h") {
  printUsage()
  process.exit(0)
}

if (args[0] === "--list") {
  printToolList()
  process.exit(0)
}

if (args[0] === "--help") {
  const toolName = args[1]
  if (!toolName) {
    process.stderr.write("Usage: aipex-cli --help <tool_name>\n")
    process.exit(1)
  }
  printToolHelp(toolName)
  process.exit(0)
}

if (args[0] === "--json") {
  const jsonStr = args[1]
  if (!jsonStr) {
    process.stderr.write(
      'Usage: aipex-cli --json \'{"name":"...","arguments":{...}}\'\n'
    )
    process.exit(1)
  }
  try {
    const parsed = JSON.parse(jsonStr)
    runTool(parsed.name, parsed.arguments ?? {})
  } catch (e) {
    process.stderr.write(
      `Invalid JSON: ${e instanceof Error ? e.message : String(e)}\n`
    )
    process.exit(1)
  }
} else {
  const toolName = args[0]
  const toolArgs = parseToolArgs(args.slice(1), toolName)
  runTool(toolName, toolArgs)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function printUsage(): void {
  process.stderr.write(`
AIPex CLI — control the browser from the command line

Usage:
  aipex-cli <tool_name> [--param value ...]
  aipex-cli --list                          List all available tools
  aipex-cli --help <tool_name>              Show tool parameters
  aipex-cli --json '{"name":"...","arguments":{...}}'

Examples:
  aipex-cli get_all_tabs
  aipex-cli create_new_tab --url https://google.com
  aipex-cli click --tabId 123 --uid btn-42
  aipex-cli search_elements --tabId 123 --query "button*"
  aipex-cli capture_screenshot

Environment:
  AIPEX_WS_URL              Daemon WebSocket URL (default: ws://localhost:9223/cli)
  AIPEX_CONNECT_TIMEOUT     Max ms to wait for daemon (default: 60000)
`)
}

function printToolList(): void {
  const maxLen = Math.max(...toolSchemas.map((t) => t.name.length))
  for (const tool of toolSchemas) {
    const desc = tool.description.split("\n")[0].slice(0, 80)
    process.stdout.write(`  ${tool.name.padEnd(maxLen + 2)}${desc}\n`)
  }
}

function printToolHelp(name: string): void {
  const tool = toolSchemas.find((t) => t.name === name)
  if (!tool) {
    process.stderr.write(`Unknown tool: ${name}\n`)
    process.stderr.write(`Run 'aipex-cli --list' to see available tools.\n`)
    process.exit(1)
  }
  process.stdout.write(`${tool.name}\n`)
  process.stdout.write(`  ${tool.description.split("\n")[0]}\n\n`)
  const props = tool.inputSchema.properties
  const required = new Set(tool.inputSchema.required ?? [])
  if (Object.keys(props).length === 0) {
    process.stdout.write("  No parameters.\n")
    return
  }
  process.stdout.write("  Parameters:\n")
  for (const [key, schema] of Object.entries(props)) {
    const s = schema as Record<string, unknown>
    const typeStr = (s.type as string) ?? "any"
    const reqStr = required.has(key) ? " (required)" : ""
    const desc = (s.description as string) ?? ""
    process.stdout.write(`    --${key}  <${typeStr}>${reqStr}\n`)
    if (desc) {
      process.stdout.write(`        ${desc.split("\n")[0]}\n`)
    }
  }
}

function parseToolArgs(
  rawArgs: string[],
  toolName: string
): Record<string, unknown> {
  const tool = toolSchemas.find((t) => t.name === toolName)
  const props = tool?.inputSchema.properties ?? {}
  const result: Record<string, unknown> = {}

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i]
    if (!arg.startsWith("--")) {
      process.stderr.write(`Unexpected argument: ${arg}\n`)
      process.exit(1)
    }
    const key = arg.slice(2)
    const value = rawArgs[++i]
    if (value === undefined) {
      process.stderr.write(`Missing value for --${key}\n`)
      process.exit(1)
    }
    result[key] = coerceValue(value, key, props)
  }

  return result
}

function coerceValue(
  value: string,
  key: string,
  props: Record<string, unknown>
): unknown {
  const schema = props[key] as Record<string, unknown> | undefined
  const type = schema?.type as string | undefined

  switch (type) {
    case "number": {
      const num = Number(value)
      if (isNaN(num)) {
        process.stderr.write(`--${key} expects a number, got: ${value}\n`)
        process.exit(1)
      }
      return num
    }
    case "boolean":
      return value === "true" || value === "1"
    case "array":
    case "object":
      try {
        return JSON.parse(value)
      } catch {
        process.stderr.write(`--${key} expects JSON (${type}), got: ${value}\n`)
        process.exit(1)
      }
    default:
      return value
  }
}

// ── WebSocket tool call ─────────────────────────────────────────────────────

function isRetryableError(msg: string): boolean {
  const lower = msg.toLowerCase()
  return (
    lower.includes("not connected") ||
    lower.includes("extension is not connected") ||
    lower.includes("no extension") ||
    lower.includes("econnrefused") ||
    lower.includes("fetch failed")
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function attemptWsToolCall(
  wsUrl: string,
  name: string,
  args: Record<string, unknown>
): Promise<{ retry: boolean; code: number }> {
  return new Promise((resolve) => {
    let settled = false
    const ws = new WebSocket(wsUrl)

    const connectTimer = setTimeout(() => {
      if (!settled) {
        settled = true
        ws.terminate()
        resolve({ retry: true, code: 1 })
      }
    }, 5_000)

    ws.on("error", () => {
      if (!settled) {
        settled = true
        clearTimeout(connectTimer)
        resolve({ retry: true, code: 1 })
      }
    })

    ws.on("close", () => {
      if (!settled) {
        settled = true
        clearTimeout(connectTimer)
        resolve({ retry: true, code: 1 })
      }
    })

    ws.on("open", () => {
      clearTimeout(connectTimer)
      const msg = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name, arguments: args }
      }
      ws.send(JSON.stringify(msg))

      const callTimer = setTimeout(() => {
        if (!settled) {
          settled = true
          process.stderr.write(
            `Tool '${name}' timed out after ${CALL_TIMEOUT_MS}ms\n`
          )
          ws.close()
          resolve({ retry: false, code: 1 })
        }
      }, CALL_TIMEOUT_MS)

      ws.on("message", (data) => {
        if (settled) return
        settled = true
        clearTimeout(callTimer)

        try {
          const response = JSON.parse(data.toString())

          if (response.error) {
            const errMsg =
              response.error.message ?? JSON.stringify(response.error)
            if (isRetryableError(errMsg)) {
              ws.close()
              resolve({ retry: true, code: 1 })
              return
            }
            process.stderr.write(`Error: ${errMsg}\n`)
            ws.close()
            resolve({ retry: false, code: 1 })
            return
          }

          const result = response.result
          if (result?.content && Array.isArray(result.content)) {
            for (const item of result.content) {
              if (item.type === "text" && item.text) {
                try {
                  const parsed = JSON.parse(item.text)
                  process.stdout.write(JSON.stringify(parsed, null, 2) + "\n")
                } catch {
                  process.stdout.write(item.text + "\n")
                }
              } else if (item.type === "image") {
                process.stdout.write(
                  `[Image: ${item.mimeType ?? "image/png"}, ${(((item.data?.length ?? 0) * 0.75) / 1024).toFixed(1)}KB]\n`
                )
              }
            }
          } else if (result !== undefined) {
            process.stdout.write(JSON.stringify(result, null, 2) + "\n")
          }
        } catch (e) {
          process.stderr.write(
            `Failed to parse response: ${data.toString().slice(0, 200)}\n`
          )
        }

        ws.close()
        resolve({ retry: false, code: 0 })
      })
    })
  })
}

function spawnDaemon(): void {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)
  const daemonPath = join(__dirname, "daemon.js")

  try {
    const child = fork(daemonPath, ["--port", "9223", "--host", "127.0.0.1"], {
      detached: true,
      stdio: "ignore"
    })
    child.unref()
    child.on("error", () => {})
  } catch {
    // ignore spawn errors
  }
}

async function runTool(
  name: string,
  args: Record<string, unknown>
): Promise<void> {
  const wsUrl = process.env.AIPEX_WS_URL ?? DEFAULT_WS_URL
  const deadline = Date.now() + MAX_RETRY_TIMEOUT_MS
  let backoff = INITIAL_BACKOFF_MS
  let attempt = 0
  let daemonSpawned = false

  while (true) {
    attempt++

    const result = await attemptWsToolCall(wsUrl, name, args)

    if (!result.retry) {
      process.exit(result.code)
    }

    if (Date.now() >= deadline) {
      process.stderr.write(
        `Gave up after ${MAX_RETRY_TIMEOUT_MS / 1000}s — daemon not ready at ${wsUrl}\n`
      )
      process.exit(1)
    }

    if (attempt === 1) {
      // In Docker, try the entrypoint script
      if (existsSync(ENTRYPOINT_PATH)) {
        process.stderr.write(
          `[aipex-cli] Auto-starting services via ${ENTRYPOINT_PATH} ...\n`
        )
        const child = spawn(ENTRYPOINT_PATH, [], {
          detached: true,
          stdio: "ignore",
          shell: true,
          env: { ...process.env, DISPLAY: ":99" }
        })
        child.on("error", () => {})
        child.unref()
      } else if (!daemonSpawned) {
        process.stderr.write("[aipex-cli] Spawning daemon...\n")
        spawnDaemon()
        daemonSpawned = true
      }
      process.stderr.write(
        `[aipex-cli] Waiting for AIPex daemon + extension ...\n`
      )
    }

    const remaining = Math.max(0, deadline - Date.now())
    const wait = Math.min(backoff, remaining, MAX_BACKOFF_MS)
    process.stderr.write(
      `[aipex-cli] Retry #${attempt} in ${(wait / 1000).toFixed(1)}s\n`
    )
    await sleep(wait)
    backoff = Math.min(backoff * 2, MAX_BACKOFF_MS)
  }
}
