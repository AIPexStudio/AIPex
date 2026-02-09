# @aipexstudio/browser-runtime

Chrome/Chromium runtime implementations for `@aipexstudio/aipex-core`.

This package is where **browser-specific** code lives (Manifest V3 friendly). It provides:

- **Browser tools** (`allBrowserTools`) for tab/page interaction
- **Context providers** for common browser data sources (tabs, bookmarks, history, current page, screenshots)
- **Storage adapters** for extension environments (`ChromeStorageAdapter`, `IndexedDBStorage`)
- A CDP-based automation layer (via `chrome.debugger`) and related helpers
- Runtime contracts used by the AIPex extension (hosts, addons, omni action registry)

> Note: These APIs depend on `chrome.*` and/or `indexedDB`. They are not meant to run in plain Node.js.

## Why a separate runtime package?

AIPex is split into layers so each stays focused:

- `@aipexstudio/aipex-core`: platform-agnostic agent + events + contexts + sessions
- `@aipexstudio/browser-runtime`: Chrome/extension implementations (tools, providers, storage, automation)
- `@aipexstudio/aipex-react`: React UI toolkit that depends only on core
- `browser-ext`: the actual extension that wires everything together

## Features

### 1) `allBrowserTools` (32 tools)

`allBrowserTools` is a curated bundle of `FunctionTool`s that an agent can call.
It includes:

- **Tab management**: list/open/close, basic grouping helpers
- **UI operations**: locate elements, click, hover, fill inputs/forms, computer tool
- **Page content**: metadata, scrolling, highlighting
- **Screenshots**: capture to data URL
- **Downloads**: save images from the agent workflow
- **Human-in-the-loop interventions**: request/cancel interventions
- **Skills**: load/execute skill scripts

Tool names included (strings used for tool-calling):

- Tabs (7): `get_all_tabs`, `get_current_tab`, `create_new_tab`, `get_tab_info`, `close_tab`, `organize_tabs`, `ungroup_tabs`
- UI ops (7): `search_elements`, `click`, `fill_element_by_uid`, `get_editor_value`, `fill_form`, `hover_element_by_uid`, `computer`
- Page (4): `get_page_metadata`, `scroll_to_element`, `highlight_element`, `highlight_text_inline`
- Screenshot (2): `capture_screenshot`, `capture_tab_screenshot`
- Download (2): `download_image`, `download_chat_images`
- Interventions (4): `list_interventions`, `get_intervention_info`, `request_intervention`, `cancel_intervention`
- Skills (6): `load_skill`, `execute_skill_script`, and 4 other skill tools

**Disabled tools** (exist in code but not in default bundle):

- `switch_to_tab`: causes context switching issues
- `duplicate_tab`: not enabled
- `wait`: deprecated, replaced by `computer` tool's wait action
- `capture_screenshot_to_clipboard`: not enabled
- `download_text_as_markdown`: not enabled
- `download_current_chat_images`: architecture issue

**Available but not registered by default** (can be imported separately):

- Bookmarks: `list_bookmarks`, `search_bookmarks`, `create_bookmark`, `delete_bookmark`, etc. (`tools/bookmark.ts`)
- History: `get_recent_history`, `search_history`, `delete_history_item`, `clear_history`, etc. (`tools/history.ts`)
- Clipboard: `copy_to_clipboard`, `read_from_clipboard`, `copy_page_as_markdown`, etc. (`tools/tools/clipboard/`)
- Window management: `get_all_windows`, `switch_to_window`, `create_new_window`, etc. (`tools/tools/window-management/`)
- Sessions: `get_all_sessions`, `restore_session`, etc. (`tools/tools/sessions/`)
- Extensions: `get_all_extensions`, `set_extension_enabled`, etc. (`tools/tools/extensions/`)
- Context menus: `create_context_menu_item`, etc. (`tools/tools/context-menus/`)
- Tab groups: `create_tab_group`, `get_all_tab_groups`, etc. (`tools/tools/tab-groups/`)

> Note: `take_snapshot` exists but is intentionally not included in `allBrowserTools` because it is used internally.

### 2) Default browser context providers

This package includes providers and a convenience registration helper:

- `allBrowserProviders`
- `registerDefaultBrowserContextProviders(manager)`

Providers included by default:

- `CurrentPageProvider`
- `TabsProvider`
- `BookmarksProvider`
- `ScreenshotProvider`
- `HistoryProvider`

### 3) Storage adapters

- `ChromeStorageAdapter<T>`: implements `KeyValueStorage<T>` using `chrome.storage`.
  - Supports `"local"` and `"sync"` areas
  - Falls back to `localStorage` when `chrome.storage` is unavailable (useful for non-extension dev)
- `IndexedDBStorage<T extends { id: string }>`: a small `KeyValueStorage` implementation backed by IndexedDB

### 4) Automation helpers

Under `automation/`, you'll find building blocks for browser automation:

**CDP-based automation** (via `chrome.debugger`):
- `DebuggerManager`
- `SmartLocator` / `SmartElementHandle`

**DOM-based automation** (pure JavaScript, no CDP required):
- `DomLocator` / `DomElementHandle` - Element handles that work with DOM snapshot strategy
- Supports same-origin iframes with automatic coordinate offset tracking

**Snapshot management**:
- `SnapshotManager` - Supports dual snapshot strategies:
  - `cdp`: CDP-based accessibility tree snapshots
  - `dom`: Pure DOM-based snapshots (using `@aipexstudio/dom-snapshot`)
- Snapshot text search utilities (`searchSnapshotText`, `parseSearchQuery`, `hasGlobPatterns`)

## Installation

```bash
npm install @aipexstudio/browser-runtime
# or
pnpm add @aipexstudio/browser-runtime
```

Peer dependencies:

- `@types/chrome` (for TypeScript)
- `react` (optional; only needed if you use React-related helpers)

## Usage

### 1) Use the built-in browser tools with an agent

```ts
import { google } from "@ai-sdk/google";
import { AIPex, aisdk } from "@aipexstudio/aipex-core";
import { allBrowserTools } from "@aipexstudio/browser-runtime";

const agent = AIPex.create({
  instructions: "You can control the current browser tab.",
  model: aisdk(google("gemini-2.5-flash")),
  tools: allBrowserTools,
});
```

### 2) Register default browser context providers

```ts
import { ContextManager } from "@aipexstudio/aipex-core";
import { registerDefaultBrowserContextProviders } from "@aipexstudio/browser-runtime";

const contextManager = new ContextManager({ autoInitialize: true });
registerDefaultBrowserContextProviders(contextManager);
```

### 3) Use extension storage in UI packages

`@aipexstudio/aipex-react` accepts any `KeyValueStorage` implementation for persisting settings.
In a Chrome extension, you can pass `chromeStorageAdapter`:

```tsx
import { Chatbot } from "@aipexstudio/aipex-react";
import { chromeStorageAdapter } from "@aipexstudio/browser-runtime";

export function App({ agent }: { agent: any }) {
  return <Chatbot agent={agent} storageAdapter={chromeStorageAdapter} />;
}
```

### 4) Execute a function in the active tab

```ts
import { executeScriptInActiveTab } from "@aipexstudio/browser-runtime";

const title = await executeScriptInActiveTab(() => document.title, []);
console.log(title);
```

### 5) IndexedDB-backed storage

```ts
import { IndexedDBStorage } from "@aipexstudio/browser-runtime";

const storage = new IndexedDBStorage<{ id: string; value: string }>({
  dbName: "aipex",
  storeName: "sessions",
});
```

## API reference

### Tools

- `allBrowserTools: FunctionTool[]`
- `interventionTools: FunctionTool[]`
- `registerDefaultBrowserTools(registryLike)`
- `getActiveTab(): Promise<chrome.tabs.Tab>`
- `executeScriptInTab(tabId, func, args)`
- `executeScriptInActiveTab(func, args)`

### Context providers

- `allBrowserProviders: ContextProvider[]`
- `registerDefaultBrowserContextProviders(manager)`
- Provider classes: `CurrentPageProvider`, `TabsProvider`, `BookmarksProvider`, `ScreenshotProvider`, `HistoryProvider`

### Storage

- `ChromeStorageAdapter<T>`
- `chromeStorageAdapter: ChromeStorageAdapter`
- `IndexedDBStorage<T>`
- `IndexedDBConfig`

### Automation

- `DebuggerManager`, `debuggerManager`
- `SnapshotManager`, `snapshotManager` - supports `SnapshotStrategy` (`"cdp"` | `"dom"`)
- `SmartLocator`, `SmartElementHandle` - CDP-based element handles
- `DomLocator`, `DomElementHandle` - DOM-based element handles
- `searchSnapshotText`, `parseSearchQuery`, `hasGlobPatterns`

### Runtime contracts

- `RuntimeAddon`
- `NoopBrowserAutomationHost`
- `InMemoryOmniActionRegistry`
- `NullInterventionHost`
- `NoopContextProvider`

## Development (monorepo)

From the repository root:

```bash
pnpm --filter @aipexstudio/browser-runtime build
pnpm --filter @aipexstudio/browser-runtime typecheck
pnpm --filter @aipexstudio/browser-runtime test
```

### Testing

This package includes Puppeteer-based integration tests for CDP automation features:

- **Iframe Manager tests**: Test iframe accessibility tree merging (`iframe-manager.puppeteer.test.ts`)
- **Snapshot Manager tests**: Test snapshot creation, search, and node ID injection (`snapshot-manager.puppeteer.test.ts`)

These tests use Puppeteer to simulate a browser environment without requiring a real Chrome extension. They automatically handle CI environments (GitHub Actions) with appropriate launch flags.

To run tests:

```bash
pnpm --filter @aipexstudio/browser-runtime test
```

**CI Considerations**: The tests are configured to work in CI environments (GitHub Actions) with:
- Automatic Chromium download via Puppeteer
- Sandbox flags (`--no-sandbox`, `--disable-setuid-sandbox`) for containerized environments
- Increased timeouts for slower CI runners

## License

MIT
