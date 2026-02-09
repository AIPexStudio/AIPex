# Tool Surface Audit: aipex vs new-aipex

> **Purpose**: Compare legacy MCP tool set (`aipex/src/mcp/index.ts`) with new browser-runtime default tool bundle (`new-aipex/packages/browser-runtime/src/tools/index.ts`).

---

## Summary

| Metric | Count |
|--------|-------|
| Legacy MCP tools | ~82 |
| New `allBrowserTools` (default) | 32 |
| New tools implemented but NOT registered | ~45 |
| Tools completely missing in new | ~15 |

---

## Legend

| Status | Meaning |
|--------|---------|
| ✅ Registered | Included in `allBrowserTools` |
| 🔧 Implemented (not registered) | Code exists in `browser-runtime` but not in default bundle |
| ❌ Missing | No implementation found in new codebase |
| 🔄 Renamed | Same functionality with different name |
| ⚠️ Stub | Implementation exists but returns failure/placeholder |

---

## Tool Comparison by Category

### 1. Tab Management

| Legacy Tool | New Status | New Name/Path | Notes |
|-------------|------------|---------------|-------|
| `get_all_tabs` | ✅ Registered | `get_all_tabs` | |
| `get_current_tab` | ✅ Registered | `get_current_tab` | |
| `switch_to_tab` | ❌ Disabled | `switch_to_tab` (exists in tab.ts) | Commented out: "causes context switching issues" |
| `organize_tabs` | ⚠️ Stub | `organize_tabs` | Returns `success: false` - needs `groupTabsByAI()` migration |
| `ungroup_tabs` | ✅ Registered | `ungroup_tabs` | |
| `create_new_tab` | ✅ Registered | `create_new_tab` | |
| `get_tab_info` | ✅ Registered | `get_tab_info` | |
| `close_tab` | ✅ Registered | `close_tab` | |

### 2. Tab Groups

| Legacy Tool | New Status | New Name/Path | Notes |
|-------------|------------|---------------|-------|
| `get_all_tab_groups` | 🔧 Implemented | `tools/tab-groups/index.ts` | Not in default bundle |
| `create_tab_group` | 🔧 Implemented | `tools/tab-groups/index.ts` | Not in default bundle |
| `update_tab_group` | 🔧 Implemented | `tools/tab-groups/index.ts` | Not in default bundle |
| `ungroup_all_tabs` | 🔧 Implemented | `tools/tab-groups/index.ts` | Naming conflict with `ungroup_tabs` |

### 3. Bookmarks

| Legacy Tool | New Status | New Name/Path | Notes |
|-------------|------------|---------------|-------|
| `get_all_bookmarks` | 🔄 Renamed | `list_bookmarks` | `tools/bookmark.ts` - not registered |
| `get_bookmark_folders` | ❌ Missing | - | Replaced by `create_bookmark_folder` |
| `create_bookmark` | 🔧 Implemented | `create_bookmark` | `tools/bookmark.ts` - not registered |
| `delete_bookmark` | 🔧 Implemented | `delete_bookmark` | `tools/bookmark.ts` - not registered |
| `search_bookmarks` | 🔧 Implemented | `search_bookmarks` | `tools/bookmark.ts` - not registered |
| - | 🔧 New | `get_bookmark` | New tool, not in legacy |
| - | 🔧 New | `update_bookmark` | New tool, not in legacy |
| - | 🔧 New | `create_bookmark_folder` | New tool, not in legacy |
| - | 🔧 New | `delete_bookmark_folder` | New tool, not in legacy |

### 4. History

| Legacy Tool | New Status | New Name/Path | Notes |
|-------------|------------|---------------|-------|
| `get_recent_history` | 🔧 Implemented | `get_recent_history` | `tools/history.ts` - not registered |
| `search_history` | 🔧 Implemented | `search_history` | `tools/history.ts` - not registered |
| `delete_history_item` | 🔧 Implemented | `delete_history_item` | `tools/history.ts` - not registered |
| `clear_history` | 🔧 Implemented | `clear_history` | `tools/history.ts` - not registered |
| - | 🔧 New | `get_most_visited_sites` | New tool, not in legacy |
| - | 🔧 New | `get_history_stats` | New tool, not in legacy |

### 5. Window Management

| Legacy Tool | New Status | New Name/Path | Notes |
|-------------|------------|---------------|-------|
| `get_all_windows` | 🔧 Implemented | `get_all_windows` | `tools/window-management/index.ts` - not registered |
| `get_current_window` | 🔧 Implemented | `get_current_window` | `tools/window-management/index.ts` - not registered |
| `close_window` | 🔧 Implemented | `close_window` | `tools/window-management/index.ts` - not registered |
| `minimize_window` | ❌ Missing | - | TODO in window-management/index.ts |
| `maximize_window` | ❌ Missing | - | TODO in window-management/index.ts |
| `restore_window` | ❌ Missing | - | TODO in window-management/index.ts |
| `update_window` | ❌ Missing | - | TODO in window-management/index.ts |
| `arrange_windows_in_grid` | ❌ Missing | - | TODO in window-management/index.ts |
| `cascade_windows` | ❌ Missing | - | TODO in window-management/index.ts |
| - | 🔧 New | `switch_to_window` | New tool with automationMode gating |
| - | 🔧 New | `create_new_window` | New tool with automationMode gating |

### 6. Clipboard

| Legacy Tool | New Status | New Name/Path | Notes |
|-------------|------------|---------------|-------|
| `copy_to_clipboard` | 🔧 Implemented | `copy_to_clipboard` | `tools/clipboard/index.ts` - not registered |
| `read_from_clipboard` | 🔧 Implemented | `read_from_clipboard` | `tools/clipboard/index.ts` - not registered |
| `copy_current_page_url` | 🔧 Implemented | `copy_current_page_url` | `tools/clipboard/index.ts` - not registered |
| `copy_current_page_title` | 🔧 Implemented | `copy_current_page_title` | `tools/clipboard/index.ts` - not registered |
| `copy_selected_text` | 🔧 Implemented | `copy_selected_text` | `tools/clipboard/index.ts` - not registered |
| `copy_page_as_markdown` | 🔧 Implemented | `copy_page_as_markdown` | `tools/clipboard/index.ts` - not registered |
| `copy_page_as_text` | 🔧 Implemented | `copy_page_as_text` | `tools/clipboard/index.ts` - not registered |
| `copy_page_links` | 🔧 Implemented | `copy_page_links` | `tools/clipboard/index.ts` - not registered |
| `copy_page_metadata` | 🔧 Implemented | `copy_page_metadata` | `tools/clipboard/index.ts` - not registered |

### 7. Storage

| Legacy Tool | New Status | New Name/Path | Notes |
|-------------|------------|---------------|-------|
| `get_storage_value` | ❌ Missing | - | |
| `set_storage_value` | ❌ Missing | - | |
| `remove_storage_value` | ❌ Missing | - | |
| `get_all_storage_keys` | ❌ Missing | - | |
| `clear_all_storage` | ❌ Missing | - | |
| `get_extension_settings` | ❌ Missing | - | |
| `update_extension_settings` | ❌ Missing | - | |
| `get_ai_config` | ❌ Missing | - | |
| `set_ai_config` | ❌ Missing | - | |
| `export_storage_data` | ❌ Missing | - | |
| `import_storage_data` | ❌ Missing | - | |
| `get_storage_stats` | ❌ Missing | - | |

### 8. Utilities

| Legacy Tool | New Status | New Name/Path | Notes |
|-------------|------------|---------------|-------|
| `get_browser_info` | ❌ Missing | - | |
| `get_system_info` | ❌ Missing | - | |
| `get_current_datetime` | ❌ Missing | - | |
| `format_timestamp` | ❌ Missing | - | |
| `generate_random_string` | ❌ Missing | - | |
| `validate_url` | ❌ Missing | - | |
| `extract_domain` | ❌ Missing | - | |
| `get_url_parameters` | ❌ Missing | - | |
| `build_url` | ❌ Missing | - | |
| `get_text_stats` | ❌ Missing | - | |
| `convert_text_case` | ❌ Missing | - | |
| `check_permissions` | ❌ Missing | - | |
| `wait` | ❌ Deprecated | - | Replaced by `computer` tool's wait action |

### 9. Extensions

| Legacy Tool | New Status | New Name/Path | Notes |
|-------------|------------|---------------|-------|
| `get_all_extensions` | 🔧 Implemented | `get_all_extensions` | `tools/extensions/index.ts` - not registered |
| `get_extension` | 🔧 Implemented | `get_extension` | `tools/extensions/index.ts` - not registered |
| `set_extension_enabled` | 🔧 Implemented | `set_extension_enabled` | `tools/extensions/index.ts` - not registered |
| `uninstall_extension` | 🔧 Implemented | `uninstall_extension` | `tools/extensions/index.ts` - not registered |
| `get_extension_permissions` | ❌ Missing | - | |

### 10. Downloads

| Legacy Tool | New Status | New Name/Path | Notes |
|-------------|------------|---------------|-------|
| `get_all_downloads` | ❌ Missing | - | |
| `get_download` | ❌ Missing | - | |
| `pause_download` | ❌ Missing | - | |
| `resume_download` | ❌ Missing | - | |
| `cancel_download` | ❌ Missing | - | |
| `remove_download` | ❌ Missing | - | |
| `open_download` | ❌ Missing | - | |
| `show_download_in_folder` | ❌ Missing | - | |
| `get_download_stats` | ❌ Missing | - | |
| `download_text_as_markdown` | ❌ Disabled | - | Disabled in index.ts |
| `download_image` | ✅ Registered | `download_image` | `tools/downloads/index.ts` |
| `download_chat_images` | ✅ Registered | `download_chat_images` | `tools/downloads/index.ts` |
| `download_current_chat_images` | ❌ Disabled | - | Disabled in index.ts |

### 11. Sessions

| Legacy Tool | New Status | New Name/Path | Notes |
|-------------|------------|---------------|-------|
| `get_all_sessions` | 🔧 Implemented | `get_all_sessions` | `tools/sessions/index.ts` - not registered |
| `get_session` | 🔧 Implemented | `get_session` | `tools/sessions/index.ts` - not registered |
| `restore_session` | 🔧 Implemented | `restore_session` | `tools/sessions/index.ts` - not registered |
| `get_current_device` | 🔧 Implemented | `get_current_device` | `tools/sessions/index.ts` - not registered |
| `get_all_devices` | 🔧 Implemented | `get_all_devices` | `tools/sessions/index.ts` - not registered |

### 12. Context Menus

| Legacy Tool | New Status | New Name/Path | Notes |
|-------------|------------|---------------|-------|
| `create_context_menu_item` | 🔧 Implemented | - | `tools/context-menus/index.ts` - not registered |
| `update_context_menu_item` | 🔧 Implemented | - | `tools/context-menus/index.ts` - not registered |
| `remove_context_menu_item` | 🔧 Implemented | - | `tools/context-menus/index.ts` - not registered |
| `remove_all_context_menu_items` | 🔧 Implemented | - | `tools/context-menus/index.ts` - not registered |
| `get_context_menu_items` | 🔧 Implemented | - | `tools/context-menus/index.ts` - not registered |

### 13. Screenshots

| Legacy Tool | New Status | New Name/Path | Notes |
|-------------|------------|---------------|-------|
| `capture_screenshot` | ✅ Registered | `capture_screenshot` | |
| `capture_screenshot_with_highlight` | ❌ Missing | - | |
| `capture_tab_screenshot` | ✅ Registered | `capture_tab_screenshot` | |
| `capture_screenshot_to_clipboard` | ❌ Disabled | - | Disabled in index.ts |
| `read_clipboard_image` | ❌ Missing | - | |
| `get_clipboard_image_info` | ❌ Missing | - | |

### 14. Page Content

| Legacy Tool | New Status | New Name/Path | Notes |
|-------------|------------|---------------|-------|
| `get_page_metadata` | ✅ Registered | `get_page_metadata` | |
| `get_page_images` | ❌ Missing | - | |
| `get_page_performance` | ❌ Missing | - | |
| `get_page_accessibility` | ❌ Missing | - | |
| `scroll_to_element` | ✅ Registered | `scroll_to_element` | |
| `highlight_element` | ✅ Registered | `highlight_element` | |
| `highlight_text_inline` | ✅ Registered | `highlight_text_inline` | |

### 15. UI Operations

| Legacy Tool | New Status | New Name/Path | Notes |
|-------------|------------|---------------|-------|
| `take_snapshot` | ❌ Internal | - | Not in allBrowserTools (internal use) |
| `search_elements` | ✅ Registered | `search_elements` | |
| `click` | ✅ Registered | `click` | |
| `fill_element_by_uid` | ✅ Registered | `fill_element_by_uid` | |
| `get_editor_value` | ✅ Registered | `get_editor_value` | |
| `fill_form` | ✅ Registered | `fill_form` | |
| `hover_element_by_uid` | ✅ Registered | `hover_element_by_uid` | |
| `click_by_xy` | ❌ Deprecated | - | Replaced by `computer` tool |
| `hover_by_xy` | ❌ Deprecated | - | Replaced by `computer` tool |
| `fill_by_xy` | ❌ Deprecated | - | Replaced by `computer` tool |
| `computer` | ✅ Registered | `computer` | Unified tool |

### 16. Interventions

| Legacy Tool | New Status | New Name/Path | Notes |
|-------------|------------|---------------|-------|
| `list_interventions` | ✅ Registered | `list_interventions` | |
| `get_intervention_info` | ✅ Registered | `get_intervention_info` | |
| `request_intervention` | ✅ Registered | `request_intervention` | |
| `cancel_intervention` | ✅ Registered | `cancel_intervention` | |

### 17. Skills

| Legacy Tool | New Status | New Name/Path | Notes |
|-------------|------------|---------------|-------|
| `load_skill` | ✅ Registered | `load_skill` | |
| `execute_skill_script` | ✅ Registered | `execute_skill_script` | |
| (other skill tools) | ✅ Registered | - | 6 skill tools total |

---

## Recommendations

### P0: High Priority (Blocking Core Functionality)

1. **Register existing tool implementations** in `allBrowserTools`:
   - Bookmarks (8 tools)
   - History (6 tools)
   - Window management (5 tools)
   - Clipboard (9 tools)
   - Sessions (5 tools)
   - Extensions (4 tools)
   - Tab groups (4 tools)

2. **Fix `organize_tabs` stub** by migrating `groupTabsByAI()` from legacy

3. **Enable disabled tools** with proper security controls:
   - `switch_to_tab` (with automationMode gating)
   - `download_text_as_markdown`
   - `capture_screenshot_to_clipboard`

### P1: Medium Priority

1. **Implement missing storage tools** (12 tools)
2. **Implement missing utility tools** (12 tools)
3. **Implement missing download management tools** (9 tools)

### P2: Low Priority

1. **Implement missing window management tools** (minimize, maximize, arrange)
2. **Implement missing page content tools** (images, performance, accessibility)
3. **Implement missing screenshot tools** (clipboard image, highlight capture)

---

## Security Considerations

Before registering high-risk tools, implement:

1. **Tool bundles by risk level**:
   - `coreTools` (safe, always enabled)
   - `browserTools` (moderate, enabled by default)
   - `systemTools` (high-risk, requires opt-in)

2. **Per-tool permission checks**:
   - `automationMode` gating for focus-changing operations
   - User consent for destructive operations (clear history, uninstall extension)

3. **Rate limiting** for sensitive tools
