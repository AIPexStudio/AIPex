# AIpex Project Overview & Detailed Reproduction Manual

## Project Introduction

AIpex is a Chrome extension that integrates tab and history management, an AI chat assistant, intelligent grouping, quick commands, and more, aiming to enhance browser tab efficiency and intelligent experience. This document is for AI engineers and **does not rely on source code**. It details the project structure, functional modules, implementation methods, and reproduction steps, enabling a complete recreation of the project.

---

## 1. Project Structure & File Description

Recommended directory structure:

```
AIpex/
  ├── src/
  │   ├── background.js         # Main background logic: manages global state, AI requests, tabs/history/bookmarks/groups, etc.
  │   ├── content.js            # Injected frontend logic: command panel, AI chat, toolbar, etc.
  │   ├── content.html          # UI structure for command panel, AI chat, etc.
  │   ├── content.css           # Frontend styles, supports dark mode
  │   ├── popup.html            # Extension settings UI
  │   ├── popup.js              # Settings logic: save/read user preferences
  │   ├── assets/               # Icons, logos, fonts, and other static resources
  │   └── ...                   # Other auxiliary files (highlight.js, focus.js, virtual list, etc.)
  ├── manifest.json             # Chrome extension manifest
  └── README.md / This document
```

---

## 2. Main Functional Modules & Implementation Steps

### 2.1 Command Panel & Quick Actions

#### Functionality
- Triggered by shortcut or extension icon, pops up a command panel supporting various browser and AI functions.

#### Implementation Steps
1. **Content Script Injection**:
   - Configure `content.js`, `content.html`, and `content.css` as content scripts in the `content_scripts` field of `manifest.json` to inject into all web pages.
2. **Command Panel UI**:
   - `content.html` defines a floating div containing an input box, result list, and footer hints.
   - `content.css` handles styles, supporting dark mode.
3. **Shortcut Trigger**:
   - Define shortcuts (e.g., Command+M/Ctrl+M) in the `commands` field of `manifest.json`, bound to the "open-aipex" command.
   - `background.js` listens for `chrome.commands.onCommand` events and sends an "open-aipex" message to the current tab.
   - `content.js` listens for the message to show/hide the command panel.
4. **Command & Action Management**:
   - `background.js` maintains an `actions` array, each with `title`, `desc`, `type`, `action`, `keys`, `icon`, etc.
   - Supported actions include: new/close/reopen/pin/mute tab, grouping, history, bookmarks, downloads, extensions, settings, AI chat, scrolling, fullscreen, print, email, third-party docs, clear data, etc.
5. **Frontend-Backend Communication**:
   - `content.js` uses `chrome.runtime.sendMessage({ request: "get-actions" })` to get actions.
   - On user input, `content.js` filters actions and renders them in the panel.
   - When an action is selected, `content.js` sends a message to `background.js` to execute it.
6. **Interaction Details**:
   - Supports keyboard navigation (up/down), Enter to execute, ESC to close.
   - Supports command prefixes like `/ai`, `/history`, `/bookmarks` for quick mode switching.

#### Key Examples
- New tab: `chrome.tabs.create({ url: "about:blank" })`
- Close tab: `chrome.tabs.remove(tabId)`
- Switch tab: `chrome.tabs.highlight({ tabs: index, windowId })`
- Send message: `chrome.runtime.sendMessage({ request: "switch-tab", tab })`

---

### 2.2 Tab & Group Management (AI-driven)

#### Functionality
- Supports auto/manual tab grouping, with customizable categories.
- Uses AI (e.g., OpenAI GPT) to classify tabs by URL and title.

#### Implementation Steps
1. **Group Category Management**:
   - In the settings page (`popup.html`), allow users to customize group categories (e.g., "Social, Entertainment, Study"), saved to `chrome.storage.sync`.
2. **Auto Grouping Switch**:
   - Settings page provides an "Auto Grouping" toggle, saved to `chrome.storage.sync`.
3. **AI Classification Logic**:
   - `background.js` listens for `chrome.tabs.onCreated/onUpdated` events.
   - Gets the new tab's URL and title, constructs a prompt like:
     > "Classify the tab group based on the provided URL (xxx) and title (yyy) into one of the categories: Social, Entertainment, Study... Only return the category."
   - Calls the AI API (e.g., OpenAI Chat API) to get the category.
4. **Grouping Implementation**:
   - Query all current window groups (`chrome.tabGroups.query`).
   - If a group with the same name exists, add the tab to it (`chrome.tabs.group`).
   - Otherwise, create a new group and set its title (`chrome.tabGroups.update`).
   - Optionally set group collapsed state based on whether the tab is active.
5. **Manual Grouping**:
   - Command panel provides an "Organize Tabs" action to manually trigger grouping for all tabs.
6. **Group Category Changes**:
   - `background.js` listens for `chrome.storage.onChanged` to dynamically update group categories.

#### Key Examples
- AI classification API: POST to AI Host, body includes `model`, `messages`, `stream`, etc.
- Grouping API: `chrome.tabs.group({ tabIds: [tabId], groupId })`, `chrome.tabGroups.update(groupId, { title })`

---

### 2.3 AI Chat Assistant

#### Functionality
- Supports AI chat with Markdown, code highlighting, multi-turn conversation.
- Customizable AI Host, Token, and Model.

#### Implementation Steps
1. **Chat UI**:
   - `content.html` defines a side drawer containing chat, drawing, search, etc. tabs.
   - Chat tab includes message area, input box, send button, and Markdown preview.
2. **Message Flow**:
   - On user input, `content.js` sends a message to `background.js` (`action: "callOpenAI"`, including content, context, model, key, host, stream).
   - `background.js` calls the AI API, supporting streaming responses (when `stream=true`, reads `response.body` stream and sends chunks to the frontend).
   - `content.js` renders AI replies in real time, supporting Markdown (e.g., with marked.js) and code highlighting (e.g., with highlight.js).
3. **Multi-turn Conversation**:
   - `content.js` maintains a `conversations` array, passed as context to the AI.
4. **Custom AI API**:
   - Settings page allows users to set AI Host, Token, and Model, saved to `chrome.storage.sync`.
   - `content.js` and `background.js` read and use these parameters.
5. **Google Search Integration**:
   - `content.js` detects Google search result pages, inserts an AI summary area on the right, and automatically calls the AI to summarize the search term.
   - Provides a "Continue Conversation" button to jump to the chat drawer.

#### Key Examples
- AI API request format:
  ```json
  {
    "model": "gpt-3.5-turbo",
    "messages": [
      { "role": "system", "content": "..." },
      { "role": "user", "content": "..." }
    ],
    "stream": true/false
  }
  ```
- Streaming: `response.body.getReader()`, send each chunk to the frontend as received.
- Markdown rendering: `marked.parse(text)`
- Code highlighting: `highlight.js`

---

### 2.4 History & Bookmark Management

#### Functionality
- Command panel supports `/history` and `/bookmarks` commands for quick search and navigation.
- One-click add/remove bookmarks, clear history/cache.

#### Implementation Steps
1. **History/Bookmark Search**:
   - When the user enters `/history` or `/bookmarks`, `content.js` sends a message to `background.js` (`request: "search-history"` or `"search-bookmarks"`, with query).
   - `background.js` calls `chrome.history.search` or `chrome.bookmarks.search` and returns results.
   - `content.js` renders results, supporting click-to-navigate.
2. **Bookmark Management**:
   - Command panel provides a "Bookmark" action; `content.js` sends a `create-bookmark` message.
   - `background.js` gets the current tab info and calls `chrome.bookmarks.create`.
   - To delete a bookmark: `content.js` sends a `remove` message, `background.js` calls `chrome.bookmarks.remove`.
3. **History Management**:
   - Provides "Clear History", "Clear Cache", etc., calling `chrome.browsingData.removeHistory`, `removeCache`, etc.

#### Key Examples
- `chrome.history.search({ text: query, maxResults: 100 })`
- `chrome.bookmarks.create({ title, url })`
- `chrome.bookmarks.remove(bookmarkId)`
- `chrome.browsingData.removeHistory({ since: 0 })`

---

### 2.5 Selected Text Toolbar

#### Functionality
- Floating toolbar appears when text is selected, offering "AI Answer", "Translate", etc.

#### Implementation Steps
1. **Selection Detection**:
   - `content.js` listens for `document mouseup` events, gets `window.getSelection().toString()`.
   - If there is a selection, after a 0.5s delay, inserts a toolbar div at the selection position.
2. **Toolbar UI**:
   - Toolbar includes "AI Answer", "Translate", etc. buttons, styled with `content.css`.
3. **Button Interactions**:
   - Clicking "AI Answer" sends the selected text to `background.js`, calls the AI API, and displays the result.
   - Clicking "Translate" can call a third-party translation API.
4. **Show/Hide Logic**:
   - Toolbar is removed on mousedown or when there is no selection.
5. **Toggle Setting**:
   - Settings page provides a "Show Selected Text Toolbar" toggle, saved to `chrome.storage.sync`.
   - `content.js` reads this setting to decide whether to enable the feature.

#### Key Examples
- `window.getSelection().toString()`
- Dynamically insert/remove div elements
- `chrome.runtime.sendMessage({ action: "callOpenAI", content: selection })`

---

### 2.6 Settings & Customization

#### Functionality
- Supports custom shortcuts, group categories, AI API, auto-grouping, toolbar visibility, etc.

#### Implementation Steps
1. **Settings UI**:
   - `popup.html` designs a form including shortcuts, group categories, auto-grouping, AI Host, Token, Model, toolbar visibility, etc.
2. **Data Storage**:
   - `popup.js` uses `chrome.storage.sync.set/get` to save and read settings.
3. **Shortcut Settings**:
   - Provides a button to jump to `chrome://extensions/shortcuts` for user customization.
4. **Settings Sync**:
   - `background.js` and `content.js` read settings and respond to changes in real time (listen to `chrome.storage.onChanged`).

#### Key Examples
- `chrome.storage.sync.set({ key: value })`
- `chrome.storage.sync.get([key], callback)`
- `chrome.storage.onChanged.addListener`

---

## 3. Technical Highlights

### 3.1 Chrome Extension Architecture
- Uses Manifest V3, `background.js` as service_worker.
- `content.js` as content script injected into all web pages.
- Required permissions: tabs, tabGroups, bookmarks, history, browsingData, storage, contextMenus, sessions, scripting, etc.

### 3.2 Frontend-Backend Communication
- Content scripts and background communicate via `chrome.runtime.sendMessage` and `chrome.runtime.onMessage.addListener` for async messaging.
- All operations are dispatched via messages; frontend handles UI, backend handles actual operations.

### 3.3 AI API Calls
- Supports custom AI Host/Token/Model, defaulting to OpenAI Chat API.
- Supports streaming responses, with real-time frontend rendering.
- AI request format must include `model`, `messages`, and `stream` fields.

### 3.4 UI/UX Design
- All UI elements are custom HTML/CSS, modern style, supporting dark mode.
- Command panel, AI chat, toolbar, etc. all support keyboard navigation and shortcuts.
- For long lists, use virtual lists for performance optimization.

---

## 4. Reproduction Recommendations & Order

1. Build basic Chrome extension structure (manifest, background.js, content.js, popup.html).
2. Implement command panel UI and connect to backend actions.
3. Implement tab/group/history/bookmark operations via Chrome API.
4. Integrate AI chat with custom API and streaming.
5. Implement auto tab grouping (AI classification) and custom categories.
6. Complete settings page and ensure full integration.
7. Optimize UI/UX (toolbar, dark mode, virtual list).
8. Test compatibility and stability in Chrome.

---

## 5. Key Dependencies

- jQuery (DOM manipulation)
- marked.js (Markdown rendering)
- highlight.js (code highlighting)
- Chrome Extension API

---

## 6. Reproduction Notes
- All features must use Chrome Extension API with correct permissions.
- AI API must be customizable, defaulting to OpenAI Chat API.
- Strictly follow the described frontend/backend communication and data sync flows.
- The manual alone is sufficient for full reproduction—no source code required.

For detailed code implementation, refer to the step-by-step instructions in each module above. This document covers the full scope and implementation details, sufficient to guide AI engineers in reproducing the project. 