# AIPex Browser Tools Reference

Complete parameter schemas and usage examples for all AIPex MCP tools exposed via `aipex-mcp-bridge`.

---

## Tab Management

### `get_all_tabs`

Get all open tabs across all browser windows.

**Parameters:** none

**Returns:** Array of tab objects — `id`, `title`, `url`, `windowId`, `active`, `pinned`

---

### `get_current_tab`

Get the currently active tab.

**Parameters:** none

**Returns:** Tab object — `id`, `title`, `url`, `windowId`

---

### `switch_to_tab`

Switch browser focus to a specific tab.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `tabId` | number | yes | ID of the tab to switch to |

---

### `create_new_tab`

Open a new tab at the specified URL.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `url` | string | yes | URL to open |

**Returns:** New tab object including its `id`

---

### `get_tab_info`

Get detailed info about a specific tab.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `tabId` | number | yes | ID of the tab |

---

### `close_tab`

Close a tab by ID.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `tabId` | number | yes | ID of the tab to close |

---

### `organize_tabs`

Use AI to automatically group all open tabs by topic or domain.

**Parameters:** none

---

### `ungroup_tabs`

Remove all tab groups in the current window.

**Parameters:** none

---

## UI Interaction

### `search_elements` ← **Use First**

Search the page's accessibility tree using glob patterns. Returns matching elements with `uid` values for direct interaction. Fast and token-efficient — no screenshot needed.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `tabId` | number | yes | — | ID of the tab to search |
| `query` | string | yes | — | Glob pattern (see below) |
| `contextLevels` | number | no | 1 | Lines of surrounding context to include |

**Glob syntax quick reference:**

| Pattern | Matches |
|---|---|
| `*` | Any sequence of characters |
| `?` | Exactly one character |
| `[abc]` | Any of those characters |
| `{a,b,c}` | Any of those alternatives |

**Starter queries:**

```
{button,input,textarea,select,a}*    — all interactive elements
{button,link,a}*                      — clickable elements only
*[Ss]ubmit*, *[Ss]ave*, *[Cc]onfirm* — action buttons
*login*, *sign*                 — auth elements
*search*                           — search inputs
{input,textbox,combobox}*             — text inputs
```

**Returns:** Accessibility tree excerpt with `uid=` attributes on matched elements. Use those UIDs directly with `click`, `fill_element_by_uid`, and `hover_element_by_uid`.

---

### `click`

Click an element by UID.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `tabId` | number | yes | — | ID of the tab |
| `uid` | string | yes | — | Element UID from `search_elements` |
| `dblClick` | boolean | no | false | Set to `true` for double-click |

---

### `fill_element_by_uid`

Type text into an input element by UID.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `tabId` | number | yes | ID of the tab |
| `uid` | string | yes | Element UID from `search_elements` |
| `value` | string | yes | Text to type into the element |

---

### `fill_form`

Fill multiple form fields at once.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `tabId` | number | yes | ID of the tab |
| `elements` | array | yes | Array of `{ uid, value }` objects |

**Example:**

```json
{
  "tabId": 42,
  "elements": [
    { "uid": "input-email-3", "value": "user@example.com" },
    { "uid": "input-pass-4", "value": "password123" }
  ]
}
```

---

### `get_editor_value`

Read the full text content of a code editor (Monaco, CodeMirror, ACE) or textarea without truncation. Call before overwriting to avoid data loss.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `tabId` | number | yes | ID of the tab |
| `uid` | string | yes | UID of the editor element |

---

### `hover_element_by_uid`

Hover over an element to reveal tooltips, dropdown menus, or hover states.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `tabId` | number | yes | ID of the tab |
| `uid` | string | yes | Element UID from `search_elements` |

---

### `computer` ← **High-Cost Fallback**

Coordinate-based mouse and keyboard interaction. Use only when `search_elements` fails after two different query attempts, or when the task requires pixel-level interaction (canvas, drag-and-drop, custom sliders).

**Prerequisite:** Call `capture_screenshot(sendToLLM=true)` first. Coordinates are pixel positions from the screenshot.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `action` | enum | yes | See action table below |
| `coordinate` | [x, y] | conditional | Pixel coords. Required for most actions. |
| `text` | string | conditional | Text to type or key name(s) to press |
| `start_coordinate` | [x, y] | conditional | Drag start position (for `left_click_drag`) |
| `scroll_direction` | enum | no | `up`, `down`, `left`, `right` |
| `scroll_amount` | number | no | Pixels to scroll |
| `tabId` | number | no | Tab ID (defaults to active tab) |
| `uid` | string | no | Element UID (for `scroll_to` action) |

**Actions:**

| Action | Description |
|---|---|
| `left_click` | Single left click at coordinate |
| `right_click` | Right-click (context menu) at coordinate |
| `double_click` | Double-click at coordinate |
| `triple_click` | Triple-click (select all in field) at coordinate |
| `hover` | Move mouse to coordinate without clicking |
| `type` | Type a text string at the current cursor position |
| `key` | Press a keyboard key or combination |
| `scroll` | Scroll at coordinate in given direction |
| `scroll_to` | Scroll a UID element into view |
| `left_click_drag` | Drag from `start_coordinate` to `coordinate` |

**Common `key` values:**

```
"Enter"          — submit / confirm
"Tab"            — move focus forward
"shift+Tab"      — move focus backward
"Escape"         — close dialogs / cancel
"cmd+a"          — select all (macOS)
"ctrl+a"         — select all (Windows/Linux)
"Backspace"      — delete character before cursor
"Delete"         — delete character after cursor
"ArrowDown"      — navigate list down
"ArrowUp"        — navigate list up
"Space"          — toggle checkbox / activate button
```

---

## Page Content

### `get_page_metadata`

Get page metadata from the active tab.

**Parameters:** none

**Returns:** `{ title, description, keywords, url, favicon }`

---

### `scroll_to_element`

Scroll a DOM element into view and center it in the viewport.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `selector` | string | yes | CSS selector of the element |

---

### `highlight_element`

Add a persistent visual highlight (drop shadow) to DOM elements. Useful for audit reports or before capturing screenshots.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `selector` | string | yes | — | CSS selector |
| `color` | string | no | — | Shadow color, e.g. `"#00d4ff"` |
| `duration` | number | no | — | Duration in ms (`0` = permanent) |
| `intensity` | enum | no | `"normal"` | `"subtle"`, `"normal"`, or `"strong"` |
| `persist` | boolean | no | `true` | Keep highlight after page interaction |

---

### `highlight_text_inline`

Highlight specific words or phrases within text content on the page.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `selector` | string | yes | — | CSS selector of container element(s) |
| `searchText` | string | yes | — | Text or phrase to highlight |
| `caseSensitive` | boolean | no | `false` | Case-sensitive match |
| `wholeWords` | boolean | no | `false` | Match whole words only |
| `highlightColor` | string | no | `"#DC143C"` | Text color |
| `backgroundColor` | string | no | `"transparent"` | Background color |
| `fontWeight` | string | no | `"bold"` | Font weight |
| `persist` | boolean | no | `true` | Keep highlight permanently |

---

## Screenshots

### `capture_screenshot`

Capture the current visible area of the active tab.

**When to use:** Only when `search_elements` cannot find the target after two query attempts, or when visual layout, images, charts, or canvas content must be analyzed. Adding `sendToLLM=true` increases token cost.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `sendToLLM` | boolean | no | `false` | Send image to LLM for visual analysis. When `true`, enables the `computer` tool for coordinate-based follow-up actions. |

---

### `capture_tab_screenshot`

Capture a screenshot of a specific tab by ID.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `tabId` | number | yes | — | ID of the tab to capture |
| `sendToLLM` | boolean | no | `false` | Send image to LLM. Use sparingly. |

---

## Downloads

### `download_text_as_markdown`

Save text content as a `.md` file to the user's local filesystem.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `text` | string | yes | — | Text content to save |
| `filename` | string | no | — | Filename without `.md` extension |
| `folderPath` | string | no | — | Optional subfolder path |
| `displayResults` | boolean | no | `true` | Show download confirmation |

---

### `download_image`

Download an image from base64 data to the local filesystem.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `imageData` | string | yes | Base64 image data URL (must start with `data:image/`) |
| `filename` | string | no | Filename without extension |
| `folderPath` | string | no | Optional subfolder path |

---

### `download_chat_images`

Download multiple images from chat messages to the local filesystem.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `messages` | array | yes | — | Array of `{ id, parts: [{ type, imageData, imageTitle }] }` |
| `folderPrefix` | string | no | — | Folder name for organizing downloads |
| `filenamingStrategy` | enum | no | `"descriptive"` | `"descriptive"`, `"sequential"`, or `"timestamp"` |
| `displayResults` | boolean | no | `true` | Show download results |

---

## Human Intervention

Use these tools to pause automation and request user input when the agent cannot proceed autonomously (e.g., CAPTCHA, 2FA, ambiguous choices).

### `list_interventions`

List all available human intervention types.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `enabledOnly` | boolean | no | Return only enabled intervention types |

---

### `get_intervention_info`

Get detailed schema and examples for a specific intervention type.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `type` | string | yes | Intervention type (e.g. `"voice-input"`, `"user-selection"`, `"monitor-operation"`) |

---

### `request_intervention`

Pause automation and request human input.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `type` | string | yes | — | Intervention type to request |
| `params` | any | no | — | Type-specific parameters |
| `timeout` | number | no | `300` | Timeout in seconds before auto-cancelling |
| `reason` | string | no | — | Explanation shown to the user |

---

### `cancel_intervention`

Cancel the currently active intervention request.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | string | no | Intervention ID. If omitted, cancels the active intervention. |

---

## Tool Selection Decision Tree

```
Need to interact with a page element?
│
├── YES ──▶ search_elements(tabId, pattern)
│              │
│              ├── Found UIDs? ──▶ YES ──▶ click / fill_element_by_uid / hover_element_by_uid
│              │
│              └── No results after 2 different queries?
│                   └──▶ capture_screenshot(sendToLLM=true)
│                              └──▶ computer(action, coordinate)
│
└── NO ──▶ What kind of task?
              │
              ├── Tab operation ──▶ get_all_tabs / switch_to_tab / create_new_tab / close_tab
              ├── Download content ──▶ download_text_as_markdown / download_image
              ├── Visual capture ──▶ capture_screenshot / capture_tab_screenshot
              ├── Page info ──▶ get_page_metadata / scroll_to_element
              └── Need user input ──▶ request_intervention
```
