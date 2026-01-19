/**
 * Chrome DevTools Protocol Accessibility API Implementation
 *
 * This implementation EXACTLY mimics Puppeteer's page.accessibility.snapshot():
 * 1. Uses CDP's Accessibility.getFullAXTree (same as Puppeteer under the hood)
 * 2. Filters to "interesting only" nodes (interestingOnly: true, Puppeteer's default)
 * 3. Builds a clean tree structure (not flat array)
 * 4. Returns formatted text representation (like DevTools MCP)
 *
 * The key insight: Puppeteer already filters heavily, we should match that exactly.
 */
import type { ElementHandle } from "./types";
/**
 * Take accessibility snapshot (exactly like DevTools MCP's take_snapshot)
 * Returns formatted text representation of the page structure
 */
export declare function takeSnapshot(): Promise<{
  success: boolean;
  snapshotId: number;
  snapshot: string;
  title: string;
  url: string;
  message?: string;
}>;
/**
 * Get element by UID following DevTools MCP pattern - NO DEBUGGER DEPENDENCY!
 */
export declare function getElementByUid(
  tabId: number,
  uid: string,
): Promise<ElementHandle | null>;
/**
 * Click element by UID following DevTools MCP pattern
 * This implementation is completely based on snapshot UID mapping with retry mechanism
 *
 * 🖱️ With Fake Mouse Guidance: Before clicking, a virtual mouse cursor will appear
 * and move to the target element, showing the user where the AI is about to click.
 */
export declare function clickElementByUid(params: {
  tabId: number;
  uid: string;
  dblClick: boolean;
}): Promise<{
  success: boolean;
  message: string;
}>;
/**
 * Fill element by UID following DevTools MCP pattern
 * This implementation uses the new Locator system - NO debugger dependency!
 *
 * ✨ With Fake Mouse Guidance: Before filling, a virtual mouse cursor will appear
 * and move to the target element, showing the user where the AI is about to type.
 */
export declare function fillElementByUid(params: {
  tabId: number;
  uid: string;
  value: string;
}): Promise<{
  success: boolean;
  message: string;
}>;
/**
 * Fill multiple form elements at once using new Locator system
 *
 * ✨ With Fake Mouse Guidance: Before filling each element, a virtual mouse cursor
 * will move to the target, showing the user where the AI is typing.
 */
export declare function fillForm(params: {
  tabId: number;
  elements: Array<{
    uid: string;
    value: string;
  }>;
}): Promise<{
  success: boolean;
  message: string;
}>;
/**
 * Hover element by UID following DevTools MCP pattern
 * This implementation is completely based on snapshot UID mapping - NO debugger dependency!
 */
export declare function hoverElementByUid(params: {
  tabId: number;
  uid: string;
}): Promise<{
  success: boolean;
  message: string;
}>;
export declare function searchSnapshotText(params: {
  tabId: number;
  query: string;
  contextLevels: number;
}): Promise<{
  success: boolean;
  message: string;
  data: string;
}>;
/**
 * Get editor content by UID
 * Supports Monaco Editor, CodeMirror, ACE, and standard inputs/textareas
 */
export declare function getEditorValueByUid(params: {
  tabId: number;
  uid: string;
}): Promise<{
  success: boolean;
  message: string;
  value?: string;
}>;
