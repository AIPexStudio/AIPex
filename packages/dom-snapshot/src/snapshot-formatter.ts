/**
 * Shared snapshot formatting utilities
 *
 * Used by both CDP-based and DOM-based snapshot implementations
 */

import { SKIP_ROLES } from "./query";
import type { TextSnapshotNode } from "./types";

/**
 * Interactive roles that should always be included
 */
const INTERACTIVE_ROLES = [
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
  "switch",
];

/**
 * Check if a node should be included in output with full attributes
 */
export function shouldIncludeInOutput(
  node: TextSnapshotNode,
  skipRoles: string[] = SKIP_ROLES,
): boolean {
  const role = node.role || "";
  const name = node.name || "";

  // Include root web area (always first)
  if (role === "RootWebArea") return true;

  // Always include interactive elements
  if (INTERACTIVE_ROLES.includes(role)) return true;

  // Include images
  if (role === "image" || role === "img") return true;

  // Include StaticText with meaningful content (at least 2 chars)
  if (role === "StaticText" && name && name.trim().length >= 2) return true;

  // Skip certain roles
  if (skipRoles.includes(role)) return false;

  // For any other role, include if it has meaningful content
  if (name && name.trim().length > 1) return true;

  return false;
}

/**
 * Get node attributes for formatting
 */
export function getNodeAttributes(node: TextSnapshotNode): string[] {
  const attributes: string[] = [];

  // StaticText nodes don't need uid - they can't be operated on directly
  if (node.role !== "StaticText") {
    attributes.push(`uid=${node.id}`);
  }

  attributes.push(node.role, `"${node.name || ""}"`);

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
    const value = (node as unknown as Record<string, unknown>)[property];
    if (value !== undefined && value !== null) {
      attributes.push(`${property}="${value}"`);
    }
  }

  // Add description if present
  if (node.description) {
    attributes.push(`desc="${node.description}"`);
  }

  // Add boolean properties with capability indicators
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
    const value = (node as unknown as Record<string, unknown>)[property];
    if (value !== undefined) {
      attributes.push(capability);
      if (value) {
        attributes.push(property);
      }
    }
  }

  // Add mixed properties (pressed, checked) - output as property="value"
  for (const property of ["pressed", "checked"]) {
    const value = (node as unknown as Record<string, unknown>)[property];
    if (value !== undefined) {
      attributes.push(`${property}="${value}"`);
    }
  }

  return attributes.filter((attr): attr is string => attr !== undefined);
}

/**
 * Format a node recursively into text representation
 */
export function formatNode(
  node: TextSnapshotNode,
  depth: number,
  focusAncestorSet: Set<string>,
  skipRoles: string[] = [],
): string {
  const shouldInclude = shouldIncludeInOutput(node, skipRoles);

  // For StaticText nodes that shouldn't be included, skip them entirely
  // (they have no children, so we don't need to recurse)
  if (!shouldInclude && node.role === "StaticText") {
    return "";
  }

  // For other non-included nodes, still process children but don't output this node
  if (!shouldInclude) {
    let result = "";
    for (const child of node.children) {
      result += formatNode(child, depth, focusAncestorSet, skipRoles);
    }
    return result;
  }

  const attributes = getNodeAttributes(node);

  // marker: '*' = exact focused node; '→' = ancestor in focus path
  const marker = node.focused ? "*" : focusAncestorSet.has(node.id) ? "→" : " ";
  let result = `${" ".repeat(depth) + marker + attributes.join(" ")}\n`;

  // Recursively format child nodes
  for (const child of node.children) {
    result += formatNode(child, depth + 1, focusAncestorSet, skipRoles);
  }

  return result;
}

/**
 * Build focus ancestor set for highlighting focus path
 */
export function buildFocusAncestorSet(
  root: TextSnapshotNode,
  idToNode: Map<string, TextSnapshotNode>,
): Set<string> {
  const focusedNodeIds: string[] = [];
  for (const [id, node] of idToNode.entries()) {
    if (node.focused) focusedNodeIds.push(id);
  }

  const focusAncestorSet = new Set<string>();
  const rootId = root.id;

  const findPath = (
    currentId: string,
    targetId: string,
    visited = new Set<string>(),
  ): string[] | null => {
    if (currentId === targetId) return [currentId];
    if (visited.has(currentId)) return null;
    visited.add(currentId);

    const node = idToNode.get(currentId);
    if (!node) return null;

    for (const child of node.children) {
      const path = findPath(child.id, targetId, visited);
      if (path) {
        return [currentId, ...path];
      }
    }
    return null;
  };

  for (const focusedId of focusedNodeIds) {
    const path = findPath(rootId, focusedId);
    if (path) {
      path.forEach((id) => {
        focusAncestorSet.add(id);
      });
    } else {
      focusAncestorSet.add(focusedId);
    }
  }

  return focusAncestorSet;
}
