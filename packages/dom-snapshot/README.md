# @aipexstudio/dom-snapshot

A lightweight library for capturing DOM snapshots without relying on Chrome DevTools Protocol (CDP) Accessibility Tree (AXTree). This library provides a pure JavaScript/TypeScript solution for creating structured page snapshots that can be used for web automation, testing, and AI-powered browser agents.

## Why Not CDP AXTree?

Traditional approaches to capturing page structure often rely on CDP's Accessibility Tree, which has several limitations:

- **Browser dependency**: Requires Chrome/Chromium with DevTools Protocol
- **Performance overhead**: CDP communication adds latency
- **Complex setup**: Needs browser debugging port configuration
- **Limited portability**: Doesn't work in all browser contexts

This library takes a different approach by directly traversing the DOM and building a semantic snapshot that mimics accessibility tree structure, but works in any browser environment with just JavaScript.

## Features

- **Pure DOM-based**: No CDP or browser extensions required
- **Accessibility-aware**: Captures semantic roles, names, and states following ARIA patterns
- **Interactive element focus**: Prioritizes buttons, links, inputs, and other actionable elements
- **Hidden element filtering**: Automatically skips `aria-hidden`, `display:none`, `visibility:hidden`, and `inert` elements
- **Stable node IDs**: Assigns persistent `data-aipex-nodeid` attributes for reliable element targeting
- **Text content extraction**: Captures static text nodes for full page context
- **Configurable options**: Control text length limits, hidden element inclusion, and text node capture
- **Search functionality**: Built-in glob pattern search across snapshot text
- **Same-origin iframe support**: Automatically traverses and captures content from same-origin iframes and nested iframes

## Installation

```bash
npm install @aipexstudio/dom-snapshot
# or
pnpm add @aipexstudio/dom-snapshot
```

## Usage

### Basic Snapshot Collection

```typescript
import { collectDomSnapshot, collectDomSnapshotInPage } from '@aipexstudio/dom-snapshot';

// Collect snapshot from current page
const snapshot = collectDomSnapshotInPage();

// Or specify a custom document
const snapshot = collectDomSnapshot(document, {
  maxTextLength: 160,      // Max characters for element text (default: 160, does not affect StaticText)
  includeHidden: false,    // Include hidden elements (default: false)
  captureTextNodes: true,  // Capture StaticText nodes (default: true)
});

console.log(snapshot.totalNodes);        // Total nodes captured
console.log(snapshot.root);              // Root node of the tree
console.log(snapshot.idToNode);          // Flat map of id -> node
console.log(snapshot.metadata.url);      // Page URL
```

### Converting to Text Format

```typescript
import { collectDomSnapshot, buildTextSnapshot, formatSnapshot } from '@aipexstudio/dom-snapshot';

// Collect raw snapshot
const serialized = collectDomSnapshot(document);

// Convert to TextSnapshot format
const textSnapshot = buildTextSnapshot(serialized);

// Format as readable text representation
const formatted = formatSnapshot(textSnapshot);
console.log(formatted);
```

Output example:
```
→uid=dom_abc123 RootWebArea "My Page" <body>
  uid=dom_def456 button "Submit" <button>
  uid=dom_ghi789 textbox "Email" <input> desc="Enter your email"
   StaticText "Welcome to our site"
  *uid=dom_jkl012 link "Learn More" <a>
```

Markers:
- `*` - Currently focused element
- `→` - Ancestor of focused element
- ` ` (space) - Regular element

### Searching Snapshots

```typescript
import { searchSnapshotText, searchAndFormat, buildTextSnapshot, formatSnapshot } from '@aipexstudio/dom-snapshot';

const textSnapshot = buildTextSnapshot(serialized);
const formatted = formatSnapshot(textSnapshot);

// Simple text search
const result = searchSnapshotText(formatted, 'Submit');

// Multiple terms with | separator
const result = searchSnapshotText(formatted, '登录 | Login | Sign In');

// Glob pattern search
const result = searchSnapshotText(formatted, 'button* | *submit*', {
  useGlob: true,
  contextLevels: 2,      // Lines of context around matches
  caseSensitive: false,
});

console.log(result.matchedLines);   // Line numbers of matches
console.log(result.contextLines);   // All lines to display (with context)
console.log(result.totalMatches);   // Total match count

// Or use searchAndFormat for a convenient one-step search with formatted output
const formattedResults = await searchAndFormat(serialized, 'Submit', 2);
console.log(formattedResults);      // Formatted search results with context
```

## API Reference

### `collectDomSnapshot(document, options?)`

Collects a DOM snapshot from the specified document.

**Parameters:**
- `document` - The Document to snapshot
- `options` - Optional configuration:
  - `maxTextLength` (number, default: 160) - Maximum text length for element nodes (does not affect StaticText nodes which preserve full content)
  - `includeHidden` (boolean, default: false) - Include hidden elements
  - `captureTextNodes` (boolean, default: true) - Capture text nodes as StaticText

**Returns:** `SerializedDomSnapshot`

### `collectDomSnapshotInPage(options?)`

Convenience function that calls `collectDomSnapshot` with the current `document`.

### `buildTextSnapshot(source)`

Converts a serialized DOM snapshot to TextSnapshot format.

**Parameters:**
- `source` - The SerializedDomSnapshot to convert

**Returns:** `TextSnapshot`

### `formatSnapshot(snapshot)`

Formats a TextSnapshot as readable text representation.

**Parameters:**
- `snapshot` - The TextSnapshot to format

**Returns:** `string`

### `searchSnapshotText(text, query, options?)`

Search snapshot text with optional glob patterns.

**Parameters:**
- `text` - The formatted snapshot text
- `query` - Search query (use `|` to separate multiple terms)
- `options`:
  - `contextLevels` (number, default: 1) - Lines of context around matches
  - `caseSensitive` (boolean, default: false) - Case-sensitive search
  - `useGlob` (boolean, auto-detect) - Enable glob pattern matching

**Returns:** `SearchResult`

### `searchAndFormat(snapshot, query, contextLevels?, options?)`

Convenience function that searches a snapshot and returns formatted results with context.

**Parameters:**
- `snapshot` - The SerializedDomSnapshot to search
- `query` - Search query (use `|` to separate multiple terms)
- `contextLevels` (number, default: 1) - Lines of context around matches
- `options` - Optional SearchOptions

**Returns:** `Promise<string | null>` - Formatted search results or null if no snapshot

## Node Structure

Each captured node includes:

```typescript
interface DomSnapshotNode {
  id: string;                    // Unique node identifier
  role: string;                  // Semantic role (button, link, textbox, etc.)
  name?: string;                 // Accessible name
  value?: string;                // Current value (for inputs)
  description?: string;          // Additional description
  children: DomSnapshotNode[];   // Child nodes
  tagName?: string;              // HTML tag name

  // State properties
  checked?: boolean | 'mixed';   // Checkbox/radio state
  pressed?: boolean | 'mixed';   // Toggle button state
  disabled?: boolean;            // Disabled state
  focused?: boolean;             // Focus state
  selected?: boolean;            // Selection state
  expanded?: boolean;            // Expanded state

  // Additional properties
  placeholder?: string;          // Input placeholder
  href?: string;                 // Link URL
  title?: string;                // Element title
  textContent?: string;          // Text content
  inputType?: string;            // Input type attribute
}
```

## Role Mapping

The library maps HTML elements to semantic roles:

| HTML Element | Role |
|-------------|------|
| `<button>` | button |
| `<a href="...">` | link |
| `<input type="text">` | textbox |
| `<input type="checkbox">` | checkbox |
| `<input type="radio">` | radio |
| `<input type="range">` | slider |
| `<select>` | combobox |
| `<textarea>` | textbox |
| `<img>` | image |
| Elements with `contenteditable` | textbox |

Explicit `role` attributes are respected and take precedence.

## Skipped Elements

The following are automatically excluded from snapshots:

- `<script>`, `<style>`, `<noscript>`, `<template>`, `<svg>`, `<head>`, `<meta>`, `<link>`
- Elements with `aria-hidden="true"`
- Elements with `hidden` attribute
- Elements with `inert` attribute
- Elements with `display: none`
- Elements with `visibility: hidden`

## Iframe Handling

The library automatically handles same-origin iframes:

- **Same-origin iframes**: Content is fully traversed and included in the snapshot tree
- **Nested iframes**: Supports recursive traversal of nested same-origin iframes (up to 10 levels deep)
- **Cross-origin iframes**: Skipped due to browser security restrictions (SecurityError)
- **Coordinate tracking**: Element bounding boxes account for iframe offsets for accurate positioning

```typescript
// Iframe content is automatically included in the snapshot
const snapshot = collectDomSnapshot(document);

// Elements inside iframes are accessible via their unique IDs
const iframeElement = snapshot.idToNode['dom_iframe_element_123'];
```

## Use Cases

- **Web Automation**: Provide page context to AI agents for browser automation
- **Testing**: Capture page state for snapshot testing
- **Accessibility Auditing**: Analyze semantic structure of pages
- **Content Extraction**: Extract meaningful content from web pages
- **Browser Extensions**: Build tools that need page structure without CDP

## License

MIT
