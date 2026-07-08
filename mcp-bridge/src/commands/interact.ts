import { defineGroup, addCommand } from "../lib/command-registry.js";

defineGroup("interact", "Click, fill, hover, and type on page elements");

addCommand("interact", {
  name: "click",
  description: "Click an element using its unique UID from a snapshot",
  toolName: "click",
  args: [{ name: "uid", required: true, description: "Element UID" }],
  options: [
    {
      flag: "tab",
      type: "number",
      description: "Tab ID",
      required: true,
    },
    {
      flag: "dbl",
      type: "boolean",
      description: "Double click",
    },
  ],
  examples: [
    "browser-cli interact click btn-42 --tab 123",
    "browser-cli interact click btn-42 --tab 123 --dbl true",
  ],
  mapArgs: (positional, options) => ({
    tabId: options.tab as number,
    uid: positional[0],
    ...(options.dbl != null ? { dblClick: options.dbl } : {}),
  }),
});

addCommand("interact", {
  name: "fill",
  description: "Fill an input element using its unique UID",
  toolName: "fill_element_by_uid",
  args: [
    { name: "uid", required: true, description: "Element UID" },
    { name: "value", required: true, description: "Value to fill" },
  ],
  options: [
    {
      flag: "tab",
      type: "number",
      description: "Tab ID",
      required: true,
    },
  ],
  examples: ['browser-cli interact fill input-5 "hello world" --tab 123'],
  mapArgs: (positional, options) => ({
    tabId: options.tab as number,
    uid: positional[0],
    value: positional[1],
  }),
});

addCommand("interact", {
  name: "hover",
  description: "Hover over an element using its unique UID",
  toolName: "hover_element_by_uid",
  args: [{ name: "uid", required: true, description: "Element UID" }],
  options: [
    {
      flag: "tab",
      type: "number",
      description: "Tab ID",
      required: true,
    },
  ],
  examples: ["browser-cli interact hover menu-3 --tab 123"],
  mapArgs: (positional, options) => ({
    tabId: options.tab as number,
    uid: positional[0],
  }),
});

addCommand("interact", {
  name: "form",
  description: "Fill multiple form elements at once using UIDs",
  toolName: "fill_form",
  options: [
    {
      flag: "tab",
      type: "number",
      description: "Tab ID",
      required: true,
    },
    {
      flag: "elements",
      type: "json",
      description: 'JSON array of {uid, value} objects',
      required: true,
    },
  ],
  examples: [
    `browser-cli interact form --tab 123 --elements '[{"uid":"in-1","value":"foo"},{"uid":"in-2","value":"bar"}]'`,
  ],
  mapArgs: (_positional, options) => ({
    tabId: options.tab as number,
    elements: options.elements,
  }),
});

addCommand("interact", {
  name: "editor",
  description:
    "Get complete content from a code editor (Monaco, CodeMirror, ACE) or textarea",
  toolName: "get_editor_value",
  args: [{ name: "uid", required: true, description: "Editor element UID" }],
  options: [
    {
      flag: "tab",
      type: "number",
      description: "Tab ID",
      required: true,
    },
  ],
  examples: ["browser-cli interact editor editor-1 --tab 123"],
  mapArgs: (positional, options) => ({
    tabId: options.tab as number,
    uid: positional[0],
  }),
});

addCommand("interact", {
  name: "upload",
  description: "Upload a file to a file input element on the page",
  toolName: "upload_file_to_input",
  options: [
    {
      flag: "tab",
      type: "number",
      description: "Tab ID",
      required: true,
    },
    { flag: "uid", type: "string", description: "File input element UID" },
    {
      flag: "index",
      type: "number",
      description: "0-based index for multiple file inputs",
    },
    { flag: "file-id", type: "string", description: "Attached file ref ID" },
    {
      flag: "file-path",
      type: "string",
      description: "Absolute local file path to upload",
    },
  ],
  examples: [
    "browser-cli interact upload --tab 123 --file-path /Users/me/resume.pdf",
  ],
  mapArgs: (_positional, options) => ({
    tabId: options.tab as number,
    ...(options.uid != null ? { uid: options.uid } : {}),
    ...(options.index != null ? { input_index: options.index } : {}),
    ...(options["file-id"] != null ? { file_id: options["file-id"] } : {}),
    ...(options["file-path"] != null
      ? { file_path: options["file-path"] }
      : {}),
  }),
});

addCommand("interact", {
  name: "computer",
  description:
    "Coordinate-based mouse/keyboard interaction (fallback for visual elements)",
  toolName: "computer",
  options: [
    {
      flag: "action",
      type: "string",
      description:
        "Action: left_click, right_click, type, scroll, key, left_click_drag, double_click, triple_click, scroll_to, hover",
      required: true,
    },
    {
      flag: "coordinate",
      type: "json",
      description: "[x, y] pixel coordinates",
    },
    {
      flag: "text",
      type: "string",
      description: "Text to type or key(s) to press",
    },
    {
      flag: "start-coordinate",
      type: "json",
      description: "[x, y] start position for drag",
    },
    {
      flag: "scroll-direction",
      type: "string",
      description: "up | down | left | right",
    },
    { flag: "scroll-amount", type: "number", description: "Pixels to scroll" },
    { flag: "tab", type: "number", description: "Tab ID" },
    { flag: "uid", type: "string", description: "Element UID for scroll_to" },
  ],
  examples: [
    'browser-cli interact computer --action left_click --coordinate "[500,300]" --tab 123',
    'browser-cli interact computer --action type --text "hello"',
    'browser-cli interact computer --action key --text "Enter"',
  ],
  mapArgs: (_positional, options) => ({
    action: options.action as string,
    ...(options.coordinate != null ? { coordinate: options.coordinate } : {}),
    ...(options.text != null ? { text: options.text } : {}),
    ...(options["start-coordinate"] != null
      ? { start_coordinate: options["start-coordinate"] }
      : {}),
    ...(options["scroll-direction"] != null
      ? { scroll_direction: options["scroll-direction"] }
      : {}),
    ...(options["scroll-amount"] != null
      ? { scroll_amount: options["scroll-amount"] }
      : {}),
    ...(options.tab != null ? { tabId: options.tab } : {}),
    ...(options.uid != null ? { uid: options.uid } : {}),
  }),
});
