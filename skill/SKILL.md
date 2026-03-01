---
name: aipex-browser
description: AI-powered browser automation using the AIPex Chrome Extension via MCP bridge. Use this skill when the agent needs to control a Chrome browser — navigating pages, clicking elements, filling forms, capturing screenshots, managing tabs, or downloading content — by connecting to the AIPex MCP bridge.
version: 1.0.0
metadata:
  openclaw:
    requires:
      bins:
        - npx
    emoji: "🌐"
    homepage: https://aipex.ai
    os: [macos, linux, windows]
---

# AIPex Browser Control

AIPex is a Chrome extension that exposes 30+ browser automation tools over the Model Context Protocol (MCP). Once connected, the agent can control any Chrome tab using natural language — clicking, typing, navigating, capturing screenshots, downloading content, and more.

**Architecture:**
```
Agent (MCP client) ──stdio──▶ aipex-mcp-bridge ──WebSocket──▶ AIPex Chrome Extension ──▶ Browser APIs
```

---

## When to Use This Skill

Use this skill when the user wants to:

- Navigate to URLs, click links, fill forms, or interact with any web page
- Automate multi-step browser workflows
- Extract or download data from web pages
- Capture screenshots of browser tabs
- Manage multiple tabs across browser windows
- Perform browser-assisted testing (accessibility, UX, regression)

---

## Prerequisites

- **AIPex Chrome extension** installed (available on the Chrome Web Store or via developer build)
- **Node.js >= 18** installed on the local machine

The user is assumed to have AIPex installed. The agent only needs to complete the two connection steps below.

---

## Step 1: Register the MCP Server

Add the following to the agent's MCP configuration. No manual installation is needed — `npx` downloads and runs `aipex-mcp-bridge` automatically.

### Cursor (`.cursor/mcp.json`)

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

### Claude Desktop (`claude_desktop_config.json`)

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

### Claude Code (CLI)

```bash
claude mcp add aipex-browser -- npx -y aipex-mcp-bridge
```

### VS Code Copilot (`.vscode/mcp.json`)

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

### Windsurf (`mcp_config.json`)

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

### Custom port (optional)

The bridge listens on `localhost:9223` by default. To use a different port:

```json
{
  "mcpServers": {
    "aipex-browser": {
      "command": "npx",
      "args": ["-y", "aipex-mcp-bridge", "--port", "9224"]
    }
  }
}
```

Then use `ws://localhost:9224` in Step 2.

---

## Step 2: Connect the AIPex Extension to the Bridge

After the MCP server is registered and running:

1. Open Chrome and click the **AIPex** extension icon
2. Go to **Options** (or right-click the icon → "Extension options")
3. Find the **WebSocket Connection** section
4. Enter: `ws://localhost:9223`
5. Click **Connect**

The bridge and extension will handshake, and all browser tools will become available to the agent.

**Verifying the connection:** If only a single tool called `check_aipex_connection` is visible, the extension has not yet connected. Follow Step 2 again, then reload the MCP server in agent settings.

---

## Tool Usage Strategy (IMPORTANT)

Always follow this priority order to minimize token cost and latency:

### Priority 1 — `search_elements` (always try first)

Query the page's accessibility tree to find elements and get their UIDs. Fast, cheap, requires no screenshot.

```
search_elements(tabId, "{button,input,textarea,select,a}*")
```

### Priority 2 — UID-based interaction (preferred)

Use UIDs returned by `search_elements` to interact directly:

- `click(tabId, uid)` — click any element
- `fill_element_by_uid(tabId, uid, value)` — type into inputs
- `hover_element_by_uid(tabId, uid)` — reveal menus or tooltips

### Priority 3 — `capture_screenshot` + `computer` (high-cost fallback only)

Use only when `search_elements` fails after two different query attempts, or when pixel-level interaction is required (canvas, drag-and-drop, sliders).

1. `capture_screenshot(sendToLLM=true)` — see the page
2. `computer(action, coordinate)` — click/type at pixel coordinates

### Standard Workflow

```
get_all_tabs()
  → search_elements(tabId, "<pattern>")
  → click(tabId, uid)  OR  fill_element_by_uid(tabId, uid, value)
  → [capture_screenshot(sendToLLM=true) to verify if needed]
```

---

## Available Tool Categories

| Category | Tools | Description |
|---|---|---|
| Tab Management | 8 tools | Open, close, switch, pin, group tabs |
| UI Interaction | 7 tools | Click, fill, hover, keyboard, coordinate-based |
| Page Content | 4 tools | Metadata, scroll, highlight elements/text |
| Screenshots | 2 tools | Capture visible tab or specific tab |
| Downloads | 3 tools | Save text as markdown, download images |
| Human Intervention | 4 tools | Request user input mid-automation |

**Key tools by category:**

| Category | Key Tools |
|---|---|
| Tab | `get_all_tabs`, `switch_to_tab`, `create_new_tab`, `close_tab` |
| UI | `search_elements`, `click`, `fill_element_by_uid`, `computer` |
| Page | `get_page_metadata`, `scroll_to_element`, `highlight_element` |
| Screenshot | `capture_screenshot`, `capture_tab_screenshot` |
| Download | `download_text_as_markdown`, `download_image` |
| Intervention | `request_intervention`, `list_interventions` |

To load complete parameter schemas and examples for every tool:

```
read_skill_reference("aipex-browser", "references/tools-reference.md")
```

---

## Common Patterns

### Navigate to a URL and click a button

```
create_new_tab("https://example.com")
→ search_elements(tabId, "*[Ss]ubmit*")
→ click(tabId, uid)
```

### Fill a login form

```
get_all_tabs()
→ search_elements(tabId, "{input,textbox}*")
→ fill_element_by_uid(tabId, emailUid, "user@example.com")
→ fill_element_by_uid(tabId, passwordUid, "secret")
→ search_elements(tabId, "*[Ll]ogin*")
→ click(tabId, uid)
```

### Extract page content to markdown

```
get_page_metadata()
→ download_text_as_markdown(content, "page-extract")
```

### Visual verification

```
capture_screenshot(sendToLLM=true)
```

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Only `check_aipex_connection` visible | Extension not connected to bridge | Open AIPex Options → set WebSocket URL → Connect |
| Port 9223 already in use | Port conflict on machine | Use `--port 9224` in MCP config and `ws://localhost:9224` in extension |
| `search_elements` returns 0 results | Page uses canvas or non-semantic HTML | Fall back to `capture_screenshot(sendToLLM=true)` + `computer` tool |
| Connection drops frequently | Service worker sleep cycle | AIPex uses keepalive pings; reconnect extension from Options if needed |
| Tools appear but calls time out | Bridge not receiving WebSocket messages | Restart bridge: reload MCP server in agent settings |
