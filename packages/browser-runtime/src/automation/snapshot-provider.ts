/**
 * Unified Snapshot Provider
 *
 * Provides a unified interface for page snapshots with two implementations:
 * 1. CDP-based (focus mode): Uses Chrome DevTools Protocol Accessibility API
 * 2. DOM-based (background mode): Uses pure DOM traversal, no debugger required
 *
 * The implementation is chosen based on the automation mode setting.
 */

import { getAutomationMode } from "../runtime/automation-mode";
import { type SearchOptions, SKIP_ROLES, searchSnapshotText } from "./query";
import { snapshotManager } from "./snapshot-manager";
import type { TextSnapshotNode } from "./types";

/**
 * DOM snapshot node structure from @aipexstudio/dom-snapshot
 */
export interface DomSnapshotNode {
  id: string;
  role: string;
  name?: string;
  value?: string;
  description?: string;
  children: DomSnapshotNode[];
  tagName?: string;
  checked?: boolean | "mixed";
  pressed?: boolean | "mixed";
  disabled?: boolean;
  focused?: boolean;
  selected?: boolean;
  expanded?: boolean;
  placeholder?: string;
  href?: string;
  title?: string;
  textContent?: string;
  inputType?: string;
}

/**
 * DOM snapshot result from @aipexstudio/dom-snapshot
 */
export interface SerializedDomSnapshot {
  root: DomSnapshotNode;
  idToNode: { [uid: string]: DomSnapshotNode };
  totalNodes: number;
  timestamp: number;
  metadata: {
    title: string;
    url: string;
    collectedAt: string;
    options: any;
  };
}

/**
 * Message protocol for DOM snapshot collection
 */
export const DOM_SNAPSHOT_MESSAGE = "aipex:collect-dom-snapshot";

export interface DomSnapshotMessageRequest {
  type: typeof DOM_SNAPSHOT_MESSAGE;
  options?: any;
}

export interface DomSnapshotMessageResponse {
  success: boolean;
  data?: SerializedDomSnapshot;
  error?: string;
}

/**
 * Unified snapshot interface that works with both CDP and DOM implementations
 */
export interface UnifiedSnapshot {
  root: TextSnapshotNode;
  idToNode: Map<string, TextSnapshotNode>;
  tabId: number;
}

/**
 * Cache for DOM-based snapshots (per tab)
 */
const domSnapshotCache = new Map<number, UnifiedSnapshot>();

/**
 * Convert DOM snapshot node to TextSnapshotNode format
 */
function convertDomNodeToTextNode(node: DomSnapshotNode): TextSnapshotNode {
  const textNode: TextSnapshotNode = {
    id: node.id,
    role: node.role,
    name: node.name || "",
    value: node.value,
    description: node.description,
    children: node.children.map(convertDomNodeToTextNode),
    tagName: node.tagName,
    focused: node.focused,
    disabled: node.disabled,
    expanded: node.expanded,
    selected: node.selected,
    checked: node.checked,
    pressed: node.pressed,
  };

  // Copy additional properties if present
  if (node.placeholder) textNode.valuetext = node.placeholder;
  if (node.href) (textNode as any).href = node.href;
  if (node.title) (textNode as any).title = node.title;

  return textNode;
}

/**
 * Convert SerializedDomSnapshot to UnifiedSnapshot format
 */
function convertDomSnapshotToUnified(
  domSnapshot: SerializedDomSnapshot,
  tabId: number,
): UnifiedSnapshot {
  const root = convertDomNodeToTextNode(domSnapshot.root);
  const idToNode = new Map<string, TextSnapshotNode>();

  // Build idToNode map from flat map
  for (const [uid, node] of Object.entries(domSnapshot.idToNode)) {
    idToNode.set(uid, convertDomNodeToTextNode(node));
  }

  return {
    root,
    idToNode,
    tabId,
  };
}

/**
 * Request DOM snapshot from content script
 */
async function requestDomSnapshot(
  tabId: number,
  options?: any,
): Promise<SerializedDomSnapshot> {
  if (typeof chrome === "undefined" || !chrome.tabs?.sendMessage) {
    throw new Error("chrome.tabs API unavailable in this context.");
  }

  const response = (await chrome.tabs.sendMessage(tabId, {
    type: DOM_SNAPSHOT_MESSAGE,
    options,
  } as DomSnapshotMessageRequest)) as DomSnapshotMessageResponse;

  if (!response) {
    throw new Error(
      "No response received from DOM snapshot handler. The content script may not be loaded on this tab.",
    );
  }

  if (!response.success || !response.data) {
    throw new Error(
      response.error ||
        "Failed to collect DOM snapshot. The content script may not be ready.",
    );
  }

  return response.data;
}

/**
 * Create a snapshot using the appropriate implementation based on automation mode
 */
export async function createSnapshot(
  tabId: number,
): Promise<UnifiedSnapshot | null> {
  const mode = await getAutomationMode();
  console.log(
    `🔧 [SnapshotProvider] createSnapshot called for tabId=${tabId}, mode=${mode}`,
  );

  if (mode === "background") {
    console.log("🧪 [SnapshotProvider] Using DOM snapshot (background mode)");
    try {
      const domSnapshot = await requestDomSnapshot(tabId);
      console.log(
        `🧪 [SnapshotProvider] DOM snapshot received, nodes: ${Object.keys(domSnapshot.idToNode).length}`,
      );
      const unified = convertDomSnapshotToUnified(domSnapshot, tabId);
      domSnapshotCache.set(tabId, unified);
      // Clear CDP cache to avoid confusion
      snapshotManager.clearSnapshot(tabId);
      console.log(
        "🧪 [SnapshotProvider] DOM snapshot cached, CDP cache cleared",
      );
      return unified;
    } catch (error) {
      console.error("❌ [SnapshotProvider] DOM snapshot failed:", error);
      // Strict silent mode: DO NOT fallback to CDP
      throw new Error(
        `Failed to create DOM snapshot in background mode: ${error instanceof Error ? error.message : "Unknown error"}. ` +
          `Please ensure the content script is loaded on this tab, or switch to focus mode.`,
      );
    }
  } else {
    console.log("🔍 [SnapshotProvider] Using CDP snapshot (focus mode)");
    // Clear DOM cache when using CDP mode
    domSnapshotCache.delete(tabId);
    return snapshotManager.createSnapshot(tabId);
  }
}

/**
 * Get cached snapshot for a tab
 */
export function getSnapshot(tabId: number): UnifiedSnapshot | null {
  // Check DOM cache first (if background mode was used)
  const domCached = domSnapshotCache.get(tabId);
  if (domCached) {
    console.log(
      `🔧 [SnapshotProvider] getSnapshot from DOM cache: tabId=${tabId}`,
    );
    return domCached;
  }

  // Fall back to CDP cache
  const cdpSnapshot = snapshotManager.getSnapshot(tabId);
  if (cdpSnapshot) {
    console.log(
      `🔧 [SnapshotProvider] getSnapshot from CDP cache: tabId=${tabId}`,
    );
  }
  return cdpSnapshot;
}

/**
 * Get node by UID from the current snapshot
 */
export function getNodeByUid(
  tabId: number,
  uid: string,
): TextSnapshotNode | null {
  // Check DOM cache first
  const domCached = domSnapshotCache.get(tabId);
  if (domCached) {
    const node = domCached.idToNode.get(uid) || null;
    console.log(
      `🔧 [SnapshotProvider] getNodeByUid from DOM cache: uid=${uid}, found=${!!node}`,
    );
    return node;
  }

  // Fall back to CDP
  const node = snapshotManager.getNodeByUid(tabId, uid);
  if (node) {
    console.log(
      `🔧 [SnapshotProvider] getNodeByUid from CDP cache: uid=${uid}`,
    );
  }
  return node;
}

/**
 * Build focus ancestor set for formatting
 */
function buildFocusAncestorSet(
  root: TextSnapshotNode,
  idToNode: Map<string, TextSnapshotNode>,
): Set<string> {
  const focusedNodeIds: string[] = [];
  for (const [id, node] of idToNode.entries()) {
    if (node.focused) focusedNodeIds.push(id);
  }

  const focusAncestorSet = new Set<string>();

  // Helper: DFS to find path from root to target
  function findPath(
    rootId: string,
    targetId: string,
    visited = new Set<string>(),
  ): string[] | null {
    if (rootId === targetId) return [rootId];
    if (visited.has(rootId)) return null;
    visited.add(rootId);
    const node = idToNode.get(rootId);
    if (!node) return null;
    for (const c of node.children) {
      const p = findPath(c.id, targetId, visited);
      if (p) {
        return [rootId, ...p];
      }
    }
    return null;
  }

  for (const fid of focusedNodeIds) {
    const path = findPath(root.id, fid);
    if (path) {
      for (const p of path) {
        focusAncestorSet.add(p);
      }
    } else {
      focusAncestorSet.add(fid);
    }
  }

  return focusAncestorSet;
}

/**
 * Determine if a node should be included in output
 */
function shouldIncludeInOutput(node: TextSnapshotNode): boolean {
  const role = node.role || "";
  const name = node.name || "";

  // Include root web area (always first)
  if (role === "RootWebArea") {
    return true;
  }

  // Always include interactive elements
  const interactiveRoles = [
    "button",
    "link",
    "textbox",
    "combobox",
    "checkbox",
    "radio",
    "menuitem",
    "tab",
    "slider",
    "spinbutton",
    "searchbox",
  ];

  if (interactiveRoles.includes(role)) {
    return true;
  }

  // Include images
  if (role === "image" || role === "img") {
    return true;
  }

  // Include StaticText with meaningful content
  if (role === "StaticText" && name && name.trim().length >= 2) {
    return true;
  }

  if (SKIP_ROLES.includes(role)) {
    return false;
  }

  // For any other role, include if it has meaningful content
  if (name && name.trim().length > 1) {
    return true;
  }

  return false;
}

/**
 * Get node attributes list for formatting
 */
function getNodeAttributes(node: TextSnapshotNode): string[] {
  const attributes = [`uid=${node.id}`, node.role, `"${node.name || ""}"`];

  // Add tagName if available
  if (node.tagName) {
    attributes.push(`<${node.tagName}>`);
  }

  // Add value properties
  const valueProperties = [
    "value",
    "valuetext",
    "valuemin",
    "valuemax",
    "level",
    "autocomplete",
  ];
  for (const property of valueProperties) {
    const value = (node as any)[property];
    if (value !== undefined && value !== null) {
      attributes.push(`${property}="${value}"`);
    }
  }

  // Add boolean properties
  const booleanProperties: Record<string, string> = {
    disabled: "disableable",
    expanded: "expandable",
    focused: "focusable",
    selected: "selectable",
    modal: "modal",
    readonly: "readonly",
    required: "required",
  };

  for (const [property, capability] of Object.entries(booleanProperties)) {
    const value = (node as any)[property];
    if (value !== undefined) {
      attributes.push(capability);
      if (value) {
        attributes.push(property);
      }
    }
  }

  // Add mixed properties
  for (const property of ["pressed", "checked"]) {
    const value = (node as any)[property];
    if (value !== undefined) {
      attributes.push(property);
      if (value && value !== true) {
        attributes.push(`${property}="${value}"`);
      } else if (value === true) {
        attributes.push(property);
      }
    }
  }

  return attributes.filter(
    (attribute): attribute is string => attribute !== undefined,
  );
}

/**
 * Format node recursively
 */
function formatNode(
  node: TextSnapshotNode,
  depth: number,
  focusAncestorSet: Set<string>,
): string {
  const shouldInclude = shouldIncludeInOutput(node);
  const attributes = shouldInclude ? getNodeAttributes(node) : [node.role];
  // marker: '*' = exact focused node; '→' = ancestor in focus path
  const marker = node.focused ? "*" : focusAncestorSet.has(node.id) ? "→" : " ";
  let result = `${" ".repeat(depth * 1) + marker + attributes.join(" ")}\n`;

  // recursively format child nodes
  for (const child of node.children) {
    result += formatNode(child, depth + 1, focusAncestorSet);
  }

  return result;
}

/**
 * Format snapshot to text representation
 */
export function formatSnapshot(snapshot: UnifiedSnapshot): string {
  const focusAncestorSet = buildFocusAncestorSet(
    snapshot.root,
    snapshot.idToNode,
  );
  return formatNode(snapshot.root, 0, focusAncestorSet);
}

/**
 * Format search results with context
 */
function formatSearchResults(
  snapshotText: string,
  searchResult: {
    matchedLines: number[];
    contextLines: number[];
    totalMatches: number;
  },
): string {
  const { matchedLines, contextLines } = searchResult;
  const lines = snapshotText.split("\n");
  const matchedSet = new Set(matchedLines);
  const resultGroups: string[][] = [];
  let currentGroup: string[] = [];
  let lastContextLine = -1;

  for (const lineNum of contextLines) {
    if (lineNum >= 0 && lineNum < lines.length) {
      const line = lines[lineNum];

      if (!line) {
        continue;
      }

      if (currentGroup.length > 0 && lineNum - lastContextLine > 2) {
        resultGroups.push(currentGroup);
        currentGroup = [];
      }

      if (matchedSet.has(lineNum)) {
        const markedLine = line.replace(/^(\s*)([^\s])/, "$1✓$2");
        currentGroup.push(markedLine);
      } else {
        currentGroup.push(line);
      }

      lastContextLine = lineNum;
    }
  }

  if (currentGroup.length > 0) {
    resultGroups.push(currentGroup);
  }

  return resultGroups.map((group) => group.join("\n")).join("\n----\n");
}

/**
 * Search snapshot and format results with context
 */
export async function searchAndFormat(
  tabId: number,
  query: string,
  contextLevels: number = 1,
  options?: Partial<SearchOptions>,
): Promise<string | null> {
  const snapshot = await createSnapshot(tabId);

  if (!snapshot) {
    return null;
  }

  const snapshotText = formatSnapshot(snapshot);
  const searchResult = searchSnapshotText(snapshotText, query, {
    contextLevels,
    ...options,
  });

  if (searchResult.totalMatches === 0) {
    return `No matches found for: ${query}`;
  }

  return formatSearchResults(snapshotText, searchResult);
}

/**
 * Get the current snapshot mode
 */
export async function getSnapshotMode(): Promise<"cdp" | "dom"> {
  const mode = await getAutomationMode();
  return mode === "background" ? "dom" : "cdp";
}

/**
 * Clear snapshot cache for a tab
 */
export function clearSnapshot(tabId: number): void {
  domSnapshotCache.delete(tabId);
  snapshotManager.clearSnapshot(tabId);
}

/**
 * Clear all snapshot caches
 */
export function clearAllSnapshots(): void {
  domSnapshotCache.clear();
  snapshotManager.clearAllSnapshots();
}

/**
 * Check if a UID is valid in current snapshot
 */
export function isValidUid(tabId: number, uid: string): boolean {
  const domCached = domSnapshotCache.get(tabId);
  if (domCached) {
    return domCached.idToNode.has(uid);
  }
  return snapshotManager.isValidUid(tabId, uid);
}
