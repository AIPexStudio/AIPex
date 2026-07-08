import { defineGroup, addCommand } from "../lib/command-registry.js";

defineGroup("tab", "Manage browser tabs (list, open, close, switch)");

addCommand("tab", {
  name: "list",
  description: "List all open tabs with IDs, titles, and URLs",
  toolName: "get_all_tabs",
  examples: ["browser-cli tab list"],
  mapArgs: () => ({}),
});

addCommand("tab", {
  name: "current",
  description: "Get the currently active tab",
  toolName: "get_current_tab",
  examples: ["browser-cli tab current"],
  mapArgs: () => ({}),
});

addCommand("tab", {
  name: "switch",
  description: "Switch to a specific tab by ID",
  toolName: "switch_to_tab",
  args: [{ name: "id", required: true, description: "Tab ID to switch to" }],
  examples: ["browser-cli tab switch 42"],
  mapArgs: (positional) => ({ tabId: Number(positional[0]) }),
});

addCommand("tab", {
  name: "new",
  description: "Open a new tab with the given URL",
  toolName: "create_new_tab",
  args: [{ name: "url", required: true, description: "URL to open" }],
  examples: ["browser-cli tab new https://google.com"],
  mapArgs: (positional) => ({ url: positional[0] }),
});

addCommand("tab", {
  name: "close",
  description: "Close a specific tab by ID",
  toolName: "close_tab",
  args: [{ name: "id", required: true, description: "Tab ID to close" }],
  examples: ["browser-cli tab close 42"],
  mapArgs: (positional) => ({ tabId: Number(positional[0]) }),
});

addCommand("tab", {
  name: "info",
  description: "Get detailed info about a specific tab",
  toolName: "get_tab_info",
  args: [
    { name: "id", required: true, description: "Tab ID to get info for" },
  ],
  examples: ["browser-cli tab info 42"],
  mapArgs: (positional) => ({ tabId: Number(positional[0]) }),
});

addCommand("tab", {
  name: "organize",
  description: "Auto-group tabs by topic using AI",
  toolName: "organize_tabs",
  examples: ["browser-cli tab organize"],
  mapArgs: () => ({}),
});

addCommand("tab", {
  name: "ungroup",
  description: "Remove all tab groups in the current window",
  toolName: "ungroup_tabs",
  examples: ["browser-cli tab ungroup"],
  mapArgs: () => ({}),
});
