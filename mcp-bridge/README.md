# aipex-mcp-bridge

Local bridge, daemon, and CLI tools for connecting AI agents to the AIPex browser extension.

## How It Works

```
Cursor / Claude Code / VS Code ──stdio──▶ aipex-mcp-bridge ──WS /bridge──┐
browser-cli / aipex-cli        ──WS /cli─────────────────────────────────┤
                                                                         ├── aipex-mcp-daemon (:9223) ──WS /extension──▶ AIPex Extension ──▶ Browser
                                                                         │
Other bridge clients            ──WS /bridge─────────────────────────────┘
```

The daemon is auto-spawned by the bridge or CLI when needed, shared by multiple clients, and exits after idle time. The AIPex extension connects to `ws://localhost:9223/extension`.

## Install

```bash
npm install -g aipex-mcp-bridge
```

Requirements:

- Node.js >= 18
- AIPex Chrome or Edge extension installed

## Use with MCP Agents

**Cursor**, **Claude Desktop**, **Windsurf**, and other stdio MCP clients:

```json
{
  "mcpServers": {
    "aipex-browser": {
      "command": "npx",
      "args": ["-y", "aipex-mcp-bridge"]
    }
  }
}
```

**Claude Code**:

```bash
claude mcp add aipex-browser -- npx -y aipex-mcp-bridge
```

Then open the AIPex extension options and set the WebSocket URL to:

```text
ws://localhost:9223/extension
```

## Browser CLI

`browser-cli` is now included in this package. It provides friendly command groups over the same local daemon used by MCP.

```bash
browser-cli status
browser-cli tab list
browser-cli tab new https://example.com
browser-cli page search "button*" --tab 123
browser-cli interact click btn-42 --tab 123
browser-cli page screenshot
```

Command groups:

- `tab` — list, open, close, switch, and organize tabs
- `page` — search DOM snapshots, capture screenshots, inspect metadata, highlight elements
- `interact` — click, fill, hover, upload files, and use coordinate-based computer actions
- `download` — save markdown, images, and chat images
- `intervention` — request or cancel human intervention during automation
- `skill` — list, inspect, load, and run AIPex skills

## Raw CLI

`aipex-cli` remains available for direct tool calls:

```bash
aipex-cli --list
aipex-cli get_all_tabs
aipex-cli create_new_tab --url https://example.com
aipex-cli search_elements --tabId 123 --query "button*"
aipex-cli --json '{"name":"capture_screenshot","arguments":{}}'
```

## Why It Is Fast

AIPex avoids the slow path common in browser agents:

- It controls your local browser directly through the extension instead of streaming a remote browser.
- It prefers structured DOM snapshots and stable element UIDs before falling back to screenshots.
- It preserves existing sessions, cookies, tabs, and extensions, so agents start from your real working context.
- It shares one daemon across MCP and CLI clients, avoiding repeated startup cost.

## Options

```bash
aipex-mcp-bridge [--port <port>] [--host <host>]
browser-cli [--port <port>] [--host <host>] <group> <command>
aipex-mcp-daemon [--port <port>] [--host <host>]
```

| Option | Default | Description |
| --- | --- | --- |
| `--port <port>` | `9223` | Local daemon port |
| `--host <host>` | `127.0.0.1` | Bind/connect host |
| `--help`, `-h` | | Show help |
| `--version`, `-v` | | Show version |

## Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `AIPEX_WS_URL` | `ws://localhost:9223/cli` | WebSocket URL for raw `aipex-cli` |
| `AIPEX_CONNECT_TIMEOUT` | `60000` | Max wait time for raw `aipex-cli` |
| `BROWSER_CLI_WS_URL` | `ws://127.0.0.1:9223/cli` | WebSocket URL for `browser-cli` |
| `BROWSER_CLI_CONNECT_TIMEOUT` | `60000` | Max wait time for `browser-cli` |

## License

MIT
