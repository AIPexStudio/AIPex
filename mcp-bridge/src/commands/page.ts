import { defineGroup, addCommand } from "../lib/command-registry.js";

defineGroup("page", "Inspect and interact with page content");

addCommand("page", {
  name: "search",
  description:
    "Search for elements using glob/grep patterns against the DOM snapshot",
  toolName: "search_elements",
  args: [{ name: "query", required: true, description: "Glob/grep pattern" }],
  options: [
    {
      flag: "tab",
      type: "number",
      description: "Tab ID to search in",
      required: true,
    },
    {
      flag: "context",
      type: "number",
      description: "Number of context lines to include",
    },
  ],
  examples: [
    'browser-cli page search "button*" --tab 123',
    'browser-cli page search "{input,textarea}*" --tab 123',
  ],
  mapArgs: (positional, options) => ({
    tabId: options.tab as number,
    query: positional[0],
    ...(options.context != null
      ? { contextLevels: options.context as number }
      : {}),
  }),
});

addCommand("page", {
  name: "screenshot",
  description: "Capture screenshot of the current visible tab",
  toolName: "capture_screenshot",
  options: [
    {
      flag: "send-to-llm",
      type: "boolean",
      description: "Send screenshot to LLM for visual analysis",
    },
  ],
  examples: [
    "browser-cli page screenshot",
    "browser-cli page screenshot --send-to-llm true",
  ],
  mapArgs: (_positional, options) => ({
    ...(options["send-to-llm"] != null
      ? { sendToLLM: options["send-to-llm"] as boolean }
      : {}),
  }),
});

addCommand("page", {
  name: "screenshot-tab",
  description: "Capture screenshot of a specific tab by ID",
  toolName: "capture_tab_screenshot",
  args: [{ name: "id", required: true, description: "Tab ID to capture" }],
  options: [
    {
      flag: "send-to-llm",
      type: "boolean",
      description: "Send screenshot to LLM for visual analysis",
    },
  ],
  examples: ["browser-cli page screenshot-tab 123 --send-to-llm true"],
  mapArgs: (positional, options) => ({
    tabId: Number(positional[0]),
    ...(options["send-to-llm"] != null
      ? { sendToLLM: options["send-to-llm"] as boolean }
      : {}),
  }),
});

addCommand("page", {
  name: "metadata",
  description: "Get page metadata (title, description, keywords, etc.)",
  toolName: "get_page_metadata",
  options: [
    {
      flag: "tab",
      type: "number",
      description: "Tab ID to query (defaults to active tab)",
    },
  ],
  examples: ["browser-cli page metadata", "browser-cli page metadata --tab 123"],
  mapArgs: (_positional, options) => ({
    ...(options.tab != null ? { tabId: options.tab as number } : {}),
  }),
});

addCommand("page", {
  name: "scroll-to",
  description: "Scroll to a DOM element by CSS selector",
  toolName: "scroll_to_element",
  args: [
    { name: "selector", required: true, description: "CSS selector" },
  ],
  examples: ['browser-cli page scroll-to "#main-content"'],
  mapArgs: (positional) => ({ selector: positional[0] }),
});

addCommand("page", {
  name: "highlight",
  description: "Highlight a DOM element with drop shadow effect",
  toolName: "highlight_element",
  args: [
    { name: "selector", required: true, description: "CSS selector" },
  ],
  options: [
    { flag: "color", type: "string", description: "Shadow color" },
    { flag: "duration", type: "number", description: "Duration in ms (0 = permanent)" },
    {
      flag: "intensity",
      type: "string",
      description: "subtle | normal | strong",
    },
    {
      flag: "persist",
      type: "boolean",
      description: "Keep highlight permanently",
    },
  ],
  examples: ['browser-cli page highlight "button.submit"'],
  mapArgs: (positional, options) => ({
    selector: positional[0],
    ...(options.color != null ? { color: options.color } : {}),
    ...(options.duration != null ? { duration: options.duration } : {}),
    ...(options.intensity != null ? { intensity: options.intensity } : {}),
    ...(options.persist != null ? { persist: options.persist } : {}),
  }),
});

addCommand("page", {
  name: "highlight-text",
  description: "Highlight specific words/phrases within text content",
  toolName: "highlight_text_inline",
  args: [
    { name: "selector", required: true, description: "CSS selector" },
    { name: "text", required: true, description: "Text to highlight" },
  ],
  options: [
    { flag: "case-sensitive", type: "boolean", description: "Case-sensitive matching" },
    { flag: "whole-words", type: "boolean", description: "Match whole words only" },
    { flag: "bg-color", type: "string", description: "Background color" },
    { flag: "persist", type: "boolean", description: "Keep highlight permanently" },
  ],
  examples: ['browser-cli page highlight-text "p" "important"'],
  mapArgs: (positional, options) => ({
    selector: positional[0],
    searchText: positional[1],
    ...(options["case-sensitive"] != null
      ? { caseSensitive: options["case-sensitive"] }
      : {}),
    ...(options["whole-words"] != null
      ? { wholeWords: options["whole-words"] }
      : {}),
    ...(options["bg-color"] != null
      ? { backgroundColor: options["bg-color"] }
      : {}),
    ...(options.persist != null ? { persist: options.persist } : {}),
  }),
});
