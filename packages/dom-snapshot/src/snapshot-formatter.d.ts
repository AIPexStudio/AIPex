/**
 * Shared snapshot formatting utilities
 *
 * Used by both CDP-based and DOM-based snapshot implementations
 */
import type { TextSnapshotNode } from "./types.js";
/**
 * Check if a node should be included in output with full attributes
 */
export declare function shouldIncludeInOutput(
  node: TextSnapshotNode,
  skipRoles?: string[],
): boolean;
/**
 * Get node attributes for formatting
 */
export declare function getNodeAttributes(node: TextSnapshotNode): string[];
/**
 * Format a node recursively into text representation
 */
export declare function formatNode(
  node: TextSnapshotNode,
  depth: number,
  focusAncestorSet: Set<string>,
  skipRoles?: string[],
): string;
/**
 * Build focus ancestor set for highlighting focus path
 */
export declare function buildFocusAncestorSet(
  root: TextSnapshotNode,
  idToNode: Map<string, TextSnapshotNode>,
): Set<string>;
