import { describe, expect, it } from "vitest";
import {
  SCREENSHOT_TOOLS,
  toolDefinitions,
  toolNameSet,
} from "../tools/tool-definitions.js";

/**
 * Expected tool names matching allBrowserTools in
 * @aipexstudio/browser-runtime/src/tools/index.ts
 *
 * Update this list when tools are added/removed from the extension.
 */
const EXPECTED_TOOL_NAMES = [
  // Tab Management (6)
  "get_all_tabs",
  "get_current_tab",
  "create_new_tab",
  "get_tab_info",
  "close_tab",
  "ungroup_tabs",
  // Element Interaction (6)
  "search_elements",
  "click",
  "fill_element_by_uid",
  "get_editor_value",
  "fill_form",
  "hover_element_by_uid",
  // Computer (1)
  "computer",
  // Page Content (4)
  "get_page_metadata",
  "scroll_to_element",
  "highlight_element",
  "highlight_text_inline",
  // Screenshot (3)
  "capture_screenshot",
  "capture_screenshot_with_highlight",
  "capture_tab_screenshot",
  // Downloads (2)
  "download_image",
  "download_chat_images",
  // Interventions (4)
  "list_interventions",
  "get_intervention_info",
  "request_intervention",
  "cancel_intervention",
  // Skills (6)
  "load_skill",
  "execute_skill_script",
  "read_skill_reference",
  "get_skill_asset",
  "list_skills",
  "get_skill_info",
];

describe("toolDefinitions", () => {
  it("has exactly 32 tools", () => {
    expect(toolDefinitions).toHaveLength(32);
  });

  it("has no duplicate names", () => {
    expect(toolNameSet.size).toBe(toolDefinitions.length);
  });

  it("matches the expected tool names from browser-runtime", () => {
    const definedNames = toolDefinitions.map((t) => t.name).sort();
    const expectedNames = [...EXPECTED_TOOL_NAMES].sort();
    expect(definedNames).toEqual(expectedNames);
  });

  it("every tool has a non-empty description", () => {
    for (const tool of toolDefinitions) {
      expect(tool.description.length).toBeGreaterThan(0);
    }
  });

  it("every tool has an inputSchema with type=object", () => {
    for (const tool of toolDefinitions) {
      expect(tool.inputSchema.type).toBe("object");
    }
  });

  it("SCREENSHOT_TOOLS contains the correct tools", () => {
    expect(SCREENSHOT_TOOLS.has("capture_screenshot")).toBe(true);
    expect(SCREENSHOT_TOOLS.has("capture_tab_screenshot")).toBe(true);
    expect(SCREENSHOT_TOOLS.has("capture_screenshot_with_highlight")).toBe(
      true,
    );
    expect(SCREENSHOT_TOOLS.size).toBe(3);
  });

  it("computer tool has all expected actions", () => {
    const computerTool = toolDefinitions.find((t) => t.name === "computer");
    expect(computerTool).toBeDefined();
    const actionProp = (
      computerTool!.inputSchema.properties as Record<
        string,
        Record<string, unknown>
      >
    )["action"];
    expect(actionProp).toBeDefined();
    expect(actionProp!.enum).toEqual([
      "left_click",
      "right_click",
      "type",
      "wait",
      "scroll",
      "key",
      "left_click_drag",
      "double_click",
      "triple_click",
      "scroll_to",
      "hover",
    ]);
  });

  it("required fields are correctly specified", () => {
    const createTab = toolDefinitions.find((t) => t.name === "create_new_tab");
    expect(createTab?.inputSchema.required).toContain("url");

    const click = toolDefinitions.find((t) => t.name === "click");
    expect(click?.inputSchema.required).toContain("tabId");
    expect(click?.inputSchema.required).toContain("uid");

    const computer = toolDefinitions.find((t) => t.name === "computer");
    expect(computer?.inputSchema.required).toContain("action");
  });
});
