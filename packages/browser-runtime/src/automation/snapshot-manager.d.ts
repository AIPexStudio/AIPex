/**
 * Chrome DevTools MCP 快照管理系统
 *
 * 基于文档指南实现优化的快照机制，提供清晰的UID管理和元素定位
 */
import { type SearchOptions } from "./query";
import type { TextSnapshot, TextSnapshotNode } from "./types";
/**
 * 快照管理器
 *
 * 负责创建、管理和格式化页面快照
 */
export declare class SnapshotManager {
  /**
   * Fetch existing data-aipex-nodeid attributes from DOM elements and tagName
   * Returns a map of backendDOMNodeId → { existingId, tagName }
   */
  private fetchExistingNodeIds;
  /**
   * Get REAL accessibility tree using Chrome DevTools Protocol
   * This is the ACTUAL browser's native accessibility tree - exactly like Puppeteer's page.accessibility.snapshot()
   */
  private getRealAccessibilityTree;
  /**
   * Check if a node is a control element (from Puppeteer source)
   */
  private isControl;
  /**
   * Check if a node is a leaf node (from Puppeteer source)
   * Special case: control elements are treated as leaf nodes even if they have children
   */
  private isLeafNode;
  /**
   * Check if a node has any interesting descendants in the given set
   */
  private hasInterestingDescendantsInSet;
  /**
   * Check if a node is "interesting" - optimized for DevTools MCP-like output
   * More selective than Puppeteer to reduce noise
   */
  private isInterestingNode;
  private collectInterestingNodes;
  private serializeTree;
  /**
   * Convert CDP accessibility tree to Puppeteer-like SerializedAXNode tree
   * This uses Puppeteer's TWO-PASS approach: collect interesting nodes, then serialize
   */
  private convertAccessibilityTreeToSnapshot;
  /**
   * create snapshot
   *
   * get accessibility tree using Chrome DevTools Protocol
   */
  createSnapshot(tabId: number): Promise<TextSnapshot>;
  /**
   * inject aipex-nodeId attribute to page elements for precise positioning
   * use CDP's DOM.resolveNode to precisely locate elements instead of heuristic lookup
   *
   * solution: use backendNodeId to locate DOM nodes using CDP, then inject attribute
   * optimized: only inject new nodes that don't already have the attribute
   */
  private injectNodeIdsToPage;
  /**
   * get snapshot by tabId
   */
  getSnapshot(tabId: number): TextSnapshot | null;
  /**
   * get node by uid
   */
  getNodeByUid(tabId: number, uid: string): TextSnapshotNode | null;
  /**
   * format snapshot to text
   */
  formatSnapshot(snapshot: TextSnapshot): string;
  /**
   * Search snapshot and format results with context
   *
   * @param tabId - Tab ID to search
   * @param query - Search query string (supports "|" for multiple terms and glob patterns)
   * @param contextLevels - Number of lines to include around matches (default: 1)
   * @param options - Additional search options
   * @returns Formatted text showing matched lines with context, or null if no snapshot
   */
  searchAndFormat(
    tabId: number,
    query: string,
    contextLevels?: number,
    options?: Partial<SearchOptions>,
  ): Promise<string | null>;
  /**
   * Format search results with context
   * Shows only matched lines with surrounding context, separated by dividers
   */
  private formatSearchResults;
  /**
   * clear snapshot by tabId
   */
  clearSnapshot(tabId: number): void;
  /**
   * clear all snapshots
   */
  clearAllSnapshots(): void;
  /**
   * check if uid is valid
   */
  isValidUid(tabId: number, uid: string): boolean;
  /**
   * Determine if a node should be included in output (like DevTools MCP)
   * Only include truly interactive or meaningful elements
   */
  private shouldIncludeInOutput;
  /**
   * format node recursively
   */
  private formatNode;
  /**
   * get node attributes list
   */
  private getNodeAttributes;
}
export declare const snapshotManager: SnapshotManager;
