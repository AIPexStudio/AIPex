/**
 * Snapshot Query and Search System
 *
 * Provides search functionality for snapshot text with glob pattern support
 */
import type { SerializedDomSnapshot } from "./types.js";
export declare const SKIP_ROLES: string[];
/**
 * Search options for snapshot text queries
 */
export interface SearchOptions {
  contextLevels?: number;
  caseSensitive?: boolean;
  useGlob?: boolean;
}
/**
 * Search result containing matched lines and context
 */
export interface SearchResult {
  matchedLines: number[];
  contextLines: number[];
  totalMatches: number;
}
/**
 * Main search entry point
 * Searches snapshot text and returns matched lines with surrounding context
 */
export declare function searchSnapshotText(
  snapshotText: string,
  query: string,
  options?: SearchOptions,
): SearchResult;
/**
 * Search snapshot and format results with context
 */
export declare function searchAndFormat(
  snapshot: SerializedDomSnapshot,
  query: string,
  contextLevels?: number,
  options?: Partial<SearchOptions>,
): string | null;
/**
 * Parse search query string with "|" separator
 * Example: "登录 | Login | Sign In" -> ["登录", "Login", "Sign In"]
 * Example: "button* | login | submit?" -> ["button*", "login", "submit?"]
 */
export declare function parseSearchQuery(query: string): string[];
/**
 * Check if any search terms contain glob patterns
 */
export declare function hasGlobPatterns(searchTerms: string[]): boolean;
