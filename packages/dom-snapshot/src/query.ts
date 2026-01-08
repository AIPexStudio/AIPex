/**
 * Snapshot Query and Search System
 *
 * Provides search functionality for snapshot text with glob pattern support
 */

import { formatSnapshot } from "./manager.js";
import type {
  DomSnapshotNode,
  SerializedDomSnapshot,
  TextSnapshot,
  TextSnapshotNode,
} from "./types.js";

export const SKIP_ROLES = [
  "generic",
  "none",
  "group",
  "main",
  "navigation",
  "contentinfo",
  "search",
  "banner",
  "complementary",
  "region",
  "article",
  "section",
  "InlineTextBox", // These are usually redundant with StaticText
  "presentation", // ARIA presentation role (no semantic meaning)
  "LineBreak", // Line break elements
];

/**
 * Check if a string contains glob pattern characters
 */
function hasGlobPattern(str: string): boolean {
  return /[*?[\]{}]/.test(str);
}

/**
 * Simple glob pattern matcher supporting basic patterns:
 * - * matches any characters
 * - ? matches single character
 * - [abc] matches a, b, or c
 * - [a-z] matches character range
 * - {pattern1,pattern2} matches either pattern
 */
function matchGlob(
  pattern: string,
  text: string,
  caseSensitive: boolean = false,
): boolean {
  if (!caseSensitive) {
    pattern = pattern.toLowerCase();
    text = text.toLowerCase();
  }

  // Handle brace expansion {pattern1,pattern2}
  if (pattern.includes("{") && pattern.includes("}")) {
    const braceStart = pattern.indexOf("{");
    const braceEnd = pattern.indexOf("}");
    if (braceStart < braceEnd) {
      const prefix = pattern.substring(0, braceStart);
      const suffix = pattern.substring(braceEnd + 1);
      const alternatives = pattern
        .substring(braceStart + 1, braceEnd)
        .split(",");

      for (const alt of alternatives) {
        const fullPattern = prefix + alt.trim() + suffix;
        if (matchGlob(fullPattern, text, caseSensitive)) {
          return true;
        }
      }
      return false;
    }
  }

  // Convert glob pattern to regex
  let regexPattern = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&") // Escape regex special chars (including ?)
    .replace(/\\\*/g, ".*") // * -> .*
    .replace(/\\\?/g, ".") // ? -> .
    .replace(/\\\[/g, "[") // Restore [ for char class
    .replace(/\\\]/g, "]"); // Restore ] for char class

  // Handle character classes [abc] and [a-z]
  regexPattern = regexPattern.replace(/\[([^\]]+)\]/g, (_, chars) => {
    // Handle ranges like [a-z]
    if (chars.includes("-") && chars.length === 3) {
      return `[${chars}]`;
    }
    // Handle character sets like [abc]
    return `[${chars.replace(/[.*+^${}()|[\]\\]/g, "\\$&")}]`;
  });

  try {
    const regex = new RegExp(`${regexPattern}`, "i");
    return regex.test(text);
  } catch (error) {
    console.warn(`Invalid glob pattern: ${pattern}`, error);
    return false;
  }
}

/**
 * Search options for snapshot text queries
 */
export interface SearchOptions {
  contextLevels?: number; // Default: 1 (lines around matches)
  caseSensitive?: boolean; // Default: false
  useGlob?: boolean; // Default: auto-detect (true if pattern contains glob chars)
}

/**
 * Search result containing matched lines and context
 */
export interface SearchResult {
  matchedLines: number[]; // Line numbers of matched lines
  contextLines: number[]; // Line numbers of all lines to display (matched + context)
  totalMatches: number; // Total number of matches found
}

/**
 * Main search entry point
 * Searches snapshot text and returns matched lines with surrounding context
 */
export function searchSnapshotText(
  snapshotText: string,
  query: string,
  options: SearchOptions = {},
): SearchResult {
  const { contextLevels = 1, caseSensitive = false, useGlob } = options;

  // Parse query string
  const searchTerms = parseSearchQuery(query);
  if (searchTerms.length === 0) {
    return {
      matchedLines: [],
      contextLines: [],
      totalMatches: 0,
    };
  }

  // Auto-detect glob patterns if not explicitly set
  const shouldUseGlob =
    useGlob !== undefined
      ? useGlob
      : searchTerms.some((term) => hasGlobPattern(term));

  // Split text into lines
  const lines = snapshotText.split("\n");
  const matchedLines: number[] = [];

  // Step 1: Find all matching lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (
      line !== undefined &&
      matchLine(line, searchTerms, caseSensitive, shouldUseGlob)
    ) {
      matchedLines.push(i);
    }
  }

  console.log(
    `🔍 [SEARCH] Found ${matchedLines.length} matched lines for terms:`,
    searchTerms,
  );

  // Step 2: Expand context around matched lines
  const contextLines = expandLineContext(matchedLines, lines, contextLevels);

  console.log(
    `📦 [SEARCH] Expanded to ${contextLines.length} total lines (context level: ${contextLevels})`,
  );

  return {
    matchedLines,
    contextLines,
    totalMatches: matchedLines.length,
  };
}

/**
 * Convert DOM snapshot node to TextSnapshotNode format
 */
function convertDomNodeToTextNode(node: DomSnapshotNode): TextSnapshotNode {
  const textNode: TextSnapshotNode = {
    id: node.id,
    role: node.role,
    name: node.name,
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
): TextSnapshot {
  const root = convertDomNodeToTextNode(domSnapshot.root);
  const idToNode = new Map<string, TextSnapshotNode>();

  // Build idToNode map from flat map
  for (const [uid, node] of Object.entries(domSnapshot.idToNode)) {
    idToNode.set(uid, convertDomNodeToTextNode(node));
  }

  return {
    root,
    idToNode,
  };
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
export function searchAndFormat(
  snapshot: SerializedDomSnapshot,
  query: string,
  contextLevels: number = 1,
  options?: Partial<SearchOptions>,
): string | null {
  if (!snapshot) {
    return null;
  }

  const unified = convertDomSnapshotToUnified(snapshot);

  const snapshotText = formatSnapshot(unified);
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
 * Check if a line matches any of the search terms
 */
function matchLine(
  line: string,
  searchTerms: string[],
  caseSensitive: boolean,
  useGlob: boolean,
): boolean {
  for (const term of searchTerms) {
    if (useGlob) {
      if (matchGlob(term, line, caseSensitive)) {
        return true;
      }
    } else {
      const lineValue = caseSensitive ? line : line.toLowerCase();
      const searchTerm = caseSensitive ? term : term.toLowerCase();
      if (lineValue.includes(searchTerm)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Expand context around matched lines
 * Includes lines before and after matched lines, skipping lines that start with SKIP_ROLES
 */
function expandLineContext(
  matchedLines: number[],
  lines: string[],
  levels: number,
): number[] {
  const contextLines = new Set<number>();

  for (const lineNum of matchedLines) {
    // Add the matched line itself
    contextLines.add(lineNum);

    // Add context lines before, skipping SKIP_ROLES
    let beforeCount = 0;
    for (let i = lineNum - 1; i >= 0 && beforeCount < levels; i--) {
      const line = lines[i];
      if (line !== undefined && !shouldSkipLine(line)) {
        contextLines.add(i);
        beforeCount++;
      }
    }

    // Add context lines after, skipping SKIP_ROLES
    let afterCount = 0;
    for (let i = lineNum + 1; i < lines.length && afterCount < levels; i++) {
      const line = lines[i];
      if (line !== undefined && !shouldSkipLine(line)) {
        contextLines.add(i);
        afterCount++;
      }
    }
  }

  return Array.from(contextLines).sort((a, b) => a - b);
}

/**
 * Check if a line should be skipped based on SKIP_ROLES
 */
function shouldSkipLine(line: string): boolean {
  const trimmedLine = line.trim();
  return SKIP_ROLES.some((role) => trimmedLine.startsWith(role));
}

/**
 * Parse search query string with "|" separator
 * Example: "登录 | Login | Sign In" -> ["登录", "Login", "Sign In"]
 * Example: "button* | login | submit?" -> ["button*", "login", "submit?"]
 */
export function parseSearchQuery(query: string): string[] {
  return query
    .split("|")
    .map((term) => term.trim())
    .filter((term) => term.length > 0);
}

/**
 * Check if any search terms contain glob patterns
 */
export function hasGlobPatterns(searchTerms: string[]): boolean {
  return searchTerms.some((term) => hasGlobPattern(term));
}
