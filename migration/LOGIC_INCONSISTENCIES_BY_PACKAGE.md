# AIPex vs new-aipex: Logic Inconsistencies by Package

> **Purpose**: This document enumerates every confirmed logic/functionality gap between the legacy `aipex/` codebase and the new `new-aipex/packages/*` architecture. Each entry includes evidence paths, impact assessment, suggested migration target, and priority.

---

## Baseline


| Codebase               | Root Path              |
| ---------------------- | ---------------------- |
| Legacy (full-featured) | `aipex/`               |
| New (restructured)     | `new-aipex/packages/*` |


**Focus areas**: Tools, Context/Summarization, Skill system, UI components, Use-cases, Hosted services (auth, uploads, version-check).

---

## 1. `packages/core` (`@aipexstudio/aipex-core`)

### 1.1 Conversation Compression/Summarization Strategy Differs Significantly

**Status**: ⚠️ Acceptable Difference | **No action planned**


| Aspect                      | Legacy                                                                                 | New                                                                                                              |
| --------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Summary prompt              | High-density structured Markdown prompt (`aipex/src/lib/context/context-optimizer.ts`) | Simple character-length-capped summarizer instruction (`new-aipex/packages/core/src/conversation/compressor.ts`) |
| Trigger condition           | Real `totalTokens` from `BackgroundContextManager.getTokenUsage()` hitting watermark   | Item count **or** optional token watermark                                                                       |
| Tool-pair boundary handling | Explicit `adjustProtectedBoundary()` to avoid splitting assistant↔tool pairs           | `expandForToolCallClosure()` exists but logic is simpler                                                         |


**Impact**: Long sessions may lose critical context more aggressively in new architecture.

**Priority**: N/A — Closed

**Migration target**: N/A

**Resolution**: The new architecture's compression approach is intentionally simpler and acceptable for the current use case. The `expandForToolCallClosure()` provides adequate tool-pair protection. No migration required.

---

### 1.2 Token Usage Tracking & UI Hook Missing

**Status**: ✅ Resolved


| Aspect          | Legacy                                                             | New                                                                                      |
| --------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Usage recording | `BackgroundContextManager.recordUsage()` aggregates real API usage | `AIPex.runExecution()` emits `metrics_update` event with `AgentMetrics`; `Session.addMetrics()` aggregates into `SessionMetrics` |
| UI integration  | `TokenUsageIndicator.tsx` consumes usage                           | `TokenUsageIndicator` component in `@aipexstudio/aipex-react` consumes `useChatContext().metrics` |


**Impact**: ~~Cannot display real-time token consumption in UI.~~ Resolved.

**Priority**: P1 (Completed)

**Migration target**: `packages/core` + `packages/aipex-react` + `packages/browser-ext`

**Evidence**:
- Core: `types.ts` — `AgentEvent.metrics_update` now includes optional `sessionId`
- Core: `aipex.ts` — yields `{ type: "metrics_update", metrics, sessionId }` on success and error paths
- React: `use-chat.ts` — exposes `metrics: AgentMetrics | null` in return value and processes `metrics_update` events
- React: `context.ts` — `ChatContextValue` includes `metrics` field
- React: `components/chatbot/components/token-usage-indicator.tsx` — new component with compact/full modes
- Browser-ext: `browser-chat-header.tsx` — integrates `<TokenUsageIndicator compact />` in header

---

### 1.3 MCP System Absent

**Status**: ⚠️ Superseded | **No action needed**


| Legacy                                                              | New                                            |
| ------------------------------------------------------------------- | ---------------------------------------------- |
| `aipex/src/mcp/*` (UnifiedToolManager, tool converters, MCP server) | No `mcp/` directory; 0 matches for `**/mcp/**` |


**Impact**: Dynamic tool registration / MCP-to-OpenAI conversion path does not exist.

**Priority**: N/A — Closed

**Migration target**: N/A

**Resolution**: The new architecture provides direct tool registration via `@aipexstudio/aipex-core` tool definitions passed to `AIPex.create()`. The MCP abstraction layer is superseded by this simpler pattern; no migration required.

---

## 2. `packages/browser-runtime` (`@aipexstudio/browser-runtime`)

### 2.1 Default `allBrowserTools` Surface Area Reduced + README Drift


| Aspect                         | Legacy        | New                                                                                                                                      |
| ------------------------------ | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Approx. tool count             | 70+ MCP tools | 32 tools in `allBrowserTools`                                                                                                            |
| Disabled tools (code comments) | N/A           | `switch_to_tab`, `duplicate_tab`, `wait`, `capture_screenshot_to_clipboard`, `download_text_as_markdown`, `download_current_chat_images` |
| README claim                   | N/A           | "31 tools" – contradicts code                                                                                                            |


**Evidence**:

- New: `new-aipex/packages/browser-runtime/src/tools/index.ts` (lines 31-88)
- README: `new-aipex/packages/browser-runtime/README.md` (line 26, 40-45)

**Impact**: Many commonly-used tools unavailable; documentation misleading.

**Priority**: P0

**Migration target**: `packages/browser-runtime`

---

### 2.2 Tool Implementations Exist but Not Exported by Default


| Category                   | Implemented Path                             | Exported in `allBrowserTools`?                                |
| -------------------------- | -------------------------------------------- | ------------------------------------------------------------- |
| Clipboard                  | `src/tools/tools/clipboard/index.ts`         | No                                                            |
| Context Menus              | `src/tools/tools/context-menus/index.ts`     | No                                                            |
| Downloads (extended)       | `src/tools/tools/downloads/index.ts`         | Partial (`downloadImageTool`, `downloadChatImagesTool` only)  |
| Extensions                 | `src/tools/tools/extensions/index.ts`        | No                                                            |
| Sessions                   | `src/tools/tools/sessions/index.ts`          | No                                                            |
| Tab Groups                 | `src/tools/tools/tab-groups/index.ts`        | No (only `organizeTabsTool`, `ungroupTabsTool` from `tab.ts`) |
| Window Management          | `src/tools/tools/window-management/index.ts` | No                                                            |
| Bookmarks                  | `src/tools/bookmark.ts`                      | No                                                            |
| History                    | `src/tools/history.ts`                       | No                                                            |
| Snapshot (`take_snapshot`) | `src/tools/snapshot.ts`                      | No (intentional, internal use)                                |


**Impact**: Features exist in code but are invisible to the extension/agent.

**Priority**: P0

**Migration target**: `packages/browser-runtime/src/tools/index.ts`

---

### 2.3 `organize_tabs` Is a Stub (AI Grouping Disabled)

**Status**: ⚠️ Mitigated | **Tool removed from default bundle**


| Legacy                                                                         | New                                                                                                                                       |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `aipex/src/mcp-servers/tab-groups.ts` → `groupTabsByAI()` with full LLM prompt | `new-aipex/packages/browser-runtime/src/tools/tab.ts` → returns `{ success: false, message: "...requires additional implementation..." }` |


**Impact**: ~~Core feature (smart tab grouping) non-functional.~~ Tool is no longer exposed to users.

**Priority**: N/A — Mitigated

**Migration target**: N/A (tool removed from `allBrowserTools`)

**Resolution**: The `organize_tabs` tool has been removed from `allBrowserTools` in `packages/browser-runtime/src/tools/index.ts`. The implementation code is retained for future completion of AI-powered tab grouping. The tool is listed in the "Disabled tools" comment block.

---

### 2.4 Tab-Group Tool Naming Inconsistency

**Status**: ✅ Resolved


| Tool        | Legacy name    | New (tab.ts)   | New (tab-groups/index.ts) |
| ----------- | -------------- | -------------- | ------------------------- |
| Ungroup all | `ungroup_tabs` | `ungroup_tabs` | `ungroup_tabs`            |


**Impact**: ~~Skill scripts / prompts referencing old names may break.~~ Resolved.

**Priority**: N/A — Resolved

**Migration target**: N/A

**Resolution**: The `ungroupAllTabsTool` in `packages/browser-runtime/src/tools/tools/tab-groups/index.ts` has been renamed from `ungroup_all_tabs` to `ungroup_tabs` for consistency with the legacy naming convention. A comment has been added warning against registering both tools simultaneously to avoid duplicate name conflicts.

---

### 2.5 Bookmark/History/Window Tool Naming Changed + Default Off


| Category  | Legacy names (sample)                                         | New names (sample)                                                                  | Default exported? |
| --------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------- |
| Bookmarks | `get_all_bookmarks`, `get_bookmark_folders`                   | `list_bookmarks`, `search_bookmarks`, `create_bookmark_folder`                      | No                |
| History   | `get_recent_history`, `search_history`                        | Same                                                                                | No                |
| Windows   | `get_all_windows`, `minimize_window`, `maximize_window`, etc. | `get_all_windows`, `switch_to_window`, `create_new_window`, `close_window` (subset) | No                |


**Impact**: Prompts/scripts using legacy names fail; features hidden.

**Priority**: P1

**Migration target**: `packages/browser-runtime`

---

### 2.6 Page Content Tools Missing


| Legacy                                                                                                        | New                                                                 |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `get_page_images`, `get_page_performance`, `get_page_accessibility` (`aipex/src/mcp-servers/page-content.ts`) | Not found in `new-aipex/packages/browser-runtime/src/tools/page.ts` |


**Impact**: Accessibility audits, performance checks unavailable.

**Priority**: P2

**Migration target**: `packages/browser-runtime`

---

### 2.7 Voice Input Degraded to Web Speech API Only


| Legacy                                                                                                                                                    | New                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Three-tier: Server STT → ElevenLabs → Web Speech (`aipex/src/lib/voice/voice-input-manager.ts`, `aipex/src/interventions/implementations/voice-input.ts`) | Web Speech API only (`new-aipex/packages/browser-runtime/src/intervention/implementations/voice-input.ts`) |


**Impact**: Non-BYOK users lose server-side STT; BYOK users lose ElevenLabs path.

**Priority**: P1

**Migration target**: `packages/browser-runtime`

---

### 2.8 Skill System: `refreshSkillMetadata()` Missing

**Status**: ✅ Resolved


| Legacy                                                                       | New                                                                                         |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `aipex/src/skill/lib/services/skill-manager.ts` has `refreshSkillMetadata()` | `new-aipex/packages/browser-runtime/src/skill/lib/services/skill-manager.ts` now has `refreshSkillMetadata()` |


**Impact**: ~~Skill metadata may become stale after updates.~~ Resolved.

**Priority**: N/A — Resolved

**Migration target**: N/A

**Resolution**: The `refreshSkillMetadata(skillId: string)` method has been ported to the new `SkillManager`. It reads `SKILL.md` from ZenFS, parses frontmatter, updates IndexedDB metadata via `skillStorage.updateSkill()`, refreshes the registry cache via `skillRegistry.updateSkill()`, and emits a `skill_loaded` event with type `skill_metadata_refreshed`. Path traversal is guarded by rejecting skill IDs containing `/`, `\\`, or `..`.

---

## 3. `packages/aipex-react` (`@aipexstudio/aipex-react`)

### 3.1 UI Components Missing


| Component             | Legacy path                                                | New status |
| --------------------- | ---------------------------------------------------------- | ---------- |
| `TokenUsageIndicator` | `aipex/src/lib/components/chatbot/TokenUsageIndicator.tsx` | Not found  |
| `AuthProvider`        | `aipex/src/lib/components/auth/AuthProvider.tsx`           | Not found  |
| `VoiceInput` (UI)     | `aipex/src/lib/components/voice-mode/voice-input.tsx`      | Not found  |


**Impact**: Token monitor, login/user-state, voice-mode UI unavailable.

**Priority**: P1

**Migration target**: `packages/aipex-react`

---

## 4. `packages/browser-ext` (Extension Assembly)

### 4.1 Tool Surface Defined Entirely by `allBrowserTools`

- Extension agent config (`new-aipex/packages/browser-ext/src/lib/browser-agent-config.ts`) uses `allBrowserTools` directly.
- Any tool not in that bundle is invisible.

**Impact**: See section 2.1 / 2.2.

**Priority**: Addressed via P0 items above.

---

### 4.2 Legacy Services Not Migrated


| Service                | Legacy path                                   | New status |
| ---------------------- | --------------------------------------------- | ---------- |
| `version-checker.ts`   | `aipex/src/lib/services/version-checker.ts`   | Not found  |
| `web-auth.ts`          | `aipex/src/lib/services/web-auth.ts`          | Not found  |
| `recording-upload.ts`  | `aipex/src/lib/services/recording-upload.ts`  | Not found  |
| `screenshot-upload.ts` | `aipex/src/lib/services/screenshot-upload.ts` | Not found  |
| `user-manuals-api.ts`  | `aipex/src/lib/services/user-manuals-api.ts`  | Not found  |
| `replay-controller.ts` | `aipex/src/lib/services/replay-controller.ts` | Not found  |


**Impact**: Hosted login, version check, upload, manual retrieval, replay all missing.

**Priority**: P1 (auth) / P2 (others)

**Migration target**: `packages/browser-ext` or new `packages/services`

---

## 5. `packages/dom-snapshot` (`@aipexstudio/dom-snapshot`)


| Status       | Notes                                                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| ✅ Consistent | Legacy `aipex/src/experimental/dom-automation/snapshot/*` is a compatibility wrapper around the new package. No action needed. |


---

## 6. `packages/use-cases` (Planned but Not Created)


| Legacy                                                                            | New                                                                                       |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `aipex/src/use-cases/*` (User Guide Generator, batch jobs, e2e testing templates) | `new-aipex/packages/use-cases/` does not exist; only mentioned in `MIGRATION_STRATEGY.md` |


**Impact**: High-level workflow templates (screen recording → GIF/PDF export) unavailable.

**Priority**: P0

**Migration target**: Create `packages/use-cases`

---

## Migration Priority Summary


| Priority | Items                                    |
| -------- | ---------------------------------------- |
| P0       | 2.1, 2.2, 6                              |
| P1       | ~~1.1~~, ~~1.2~~ (completed), ~~2.4~~ (resolved), 2.5, 2.7, 3.1, 4.2 (auth) |
| P2       | ~~1.3~~ (superseded), 2.6, ~~2.8~~ (resolved), 4.2 (non-auth) |
| Closed   | 1.1 (acceptable difference), 1.2 (resolved), 1.3 (superseded), 2.3 (mitigated), 2.4 (resolved), 2.8 (resolved) |


---

## Security Review Card (Before Re-enabling High-Risk Tools)

- Threat snapshot updated (entry points, trust boundaries, sensitive data)
- Tool input validated against schema with allowlists/bounds
- No tokens/PII written to logs
- BYOK token stored securely (chrome.storage.local, masked in UI)
- High-risk tools (storage/clipboard/extensions/downloads) default-off with explicit opt-in
- Minimal regression tests added (tool invocation, permission-denied scenarios, background vs focus mode)
