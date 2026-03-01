# aipex-mcp-bridge

MCP bridge that connects AI agents to the [AIPex](https://aipex.ai) browser extension via WebSocket.

Works with **any** MCP client that supports stdio transport — Cursor, Claude Desktop, Claude Code, VS Code Copilot, Windsurf, Zed, and more.

## How it works

```
AI Agent (MCP client) ──stdio──▶ aipex-mcp-bridge ──WebSocket──▶ AIPex Chrome Extension
```

The bridge starts a WebSocket server on `localhost:9223` (configurable) and communicates with your AI agent over stdio using the MCP protocol. The AIPex extension connects to the WebSocket server to expose browser control tools.

## Quick start

### 1. Configure your AI agent

Add the following to your agent's MCP configuration:

**Cursor** (`.cursor/mcp.json`):

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

**Claude Desktop** (`claude_desktop_config.json`):

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

**VS Code Copilot** (`.vscode/mcp.json`):

```json
{
  "servers": {
    "aipex-browser": {
      "command": "npx",
      "args": ["-y", "aipex-mcp-bridge"]
    }
  }
}
```

**Windsurf** (`mcp_config.json`):

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

### 2. Connect AIPex extension

1. Open Chrome → AIPex extension → Options page
2. Set WebSocket URL to `ws://localhost:9223`
3. Click **Connect**

Your AI agent can now control the browser through AIPex.

## Options

```
npx aipex-mcp-bridge [--port <port>]
```

| Option            | Default | Description                        |
| ----------------- | ------- | ---------------------------------- |
| `--port <port>`   | `9223`  | WebSocket port for AIPex extension |
| `--help`, `-h`    |         | Show help message                  |
| `--version`, `-v` |         | Show version                       |

### Custom port example

```json
{
  "mcpServers": {
    "aipex-browser": {
      "command": "npx",
      "args": ["-y", "aipex-mcp-bridge", "--port", "8080"]
    }
  }
}
```

## Requirements

- Node.js >= 18
- AIPex Chrome extension installed

## License

MIT
