import { matcher } from "micromatch";

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
  "InlineTextBox",
];

function hasGlobPattern(str: string): boolean {
  return /[*?[{\]}]/.test(str);
}

export interface SearchOptions {
  contextLevels?: number;
  caseSensitive?: boolean;
  useGlob?: boolean;
}

export interface SearchResult {
  matchedLines: number[];
  contextLines: number[];
  totalMatches: number;
}

export function searchSnapshotText(
  snapshotText: string,
  query: string,
  options: SearchOptions = {},
): SearchResult {
  const { contextLevels = 1, caseSensitive = false, useGlob } = options;

  const searchTerms = parseSearchQuery(query);
  if (searchTerms.length === 0) {
    return {
      matchedLines: [],
      contextLines: [],
      totalMatches: 0,
    };
  }

  const shouldUseGlob =
    useGlob !== undefined
      ? useGlob
      : searchTerms.some((term) => hasGlobPattern(term));
  const matcherFns = shouldUseGlob
    ? searchTerms.map((term) => matcher(term, { nocase: !caseSensitive }))
    : [];

  const lines = snapshotText.split("\n");
  const matchedLines: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) {
      continue;
    }
    if (
      matchLine(line, searchTerms, matcherFns, caseSensitive, shouldUseGlob)
    ) {
      matchedLines.push(i);
    }
  }

  const contextLines = expandLineContext(matchedLines, lines, contextLevels);

  return {
    matchedLines,
    contextLines,
    totalMatches: matchedLines.length,
  };
}

function matchLine(
  line: string,
  searchTerms: string[],
  matchers: Array<(value: string) => boolean>,
  caseSensitive: boolean,
  useGlob: boolean,
): boolean {
  if (useGlob) {
    return matchers.some((match) => match(line));
  }

  const lineValue = caseSensitive ? line : line.toLowerCase();
  return searchTerms.some((term) => {
    const searchTerm = caseSensitive ? term : term.toLowerCase();
    return lineValue.includes(searchTerm);
  });
}

function expandLineContext(
  matchedLines: number[],
  lines: string[],
  levels: number,
): number[] {
  const contextLines = new Set<number>();

  for (const lineNum of matchedLines) {
    contextLines.add(lineNum);

    let beforeCount = 0;
    for (let i = lineNum - 1; i >= 0 && beforeCount < levels; i--) {
      const line = lines[i];
      if (line === undefined) {
        continue;
      }
      if (!shouldSkipLine(line)) {
        contextLines.add(i);
        beforeCount++;
      }
    }

    let afterCount = 0;
    for (let i = lineNum + 1; i < lines.length && afterCount < levels; i++) {
      const line = lines[i];
      if (line === undefined) {
        continue;
      }
      if (!shouldSkipLine(line)) {
        contextLines.add(i);
        afterCount++;
      }
    }
  }

  return Array.from(contextLines).sort((a, b) => a - b);
}

function shouldSkipLine(line: string): boolean {
  const trimmedLine = line.trim();
  return SKIP_ROLES.some((role) => trimmedLine.startsWith(role));
}

export function parseSearchQuery(query: string): string[] {
  return query
    .split("|")
    .map((term) => term.trim())
    .filter((term) => term.length > 0);
}

export function hasGlobPatterns(searchTerms: string[]): boolean {
  return searchTerms.some((term) => hasGlobPattern(term));
}
