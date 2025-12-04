/**
 * Snapshot Query and Search System
 *
 * Provides search functionality for snapshot text with glob pattern support
 */

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
  return /[*?[\]{}]/.test(str);
}

function matchGlob(
  pattern: string,
  text: string,
  caseSensitive: boolean = false,
): boolean {
  if (!caseSensitive) {
    pattern = pattern.toLowerCase();
    text = text.toLowerCase();
  }

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

  let regexPattern = pattern
    .replace(/[.*+^${}()|[\]\\]/g, "\\$&")
    .replace(/\\\*/g, ".*")
    .replace(/\\\?/g, ".")
    .replace(/\\\[/g, "[")
    .replace(/\\\]/g, "]");

  regexPattern = regexPattern.replace(/\[([^\]]+)\]/g, (_, chars) => {
    if (chars.includes("-") && chars.length === 3) {
      return `[${chars}]`;
    }
    return `[${chars.replace(/[.*+^${}()|[\]\\]/g, "\\$&")}]`;
  });

  try {
    const regex = new RegExp(`${regexPattern}`, "i");
    return regex.test(text);
  } catch {
    return false;
  }
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

  const lines = snapshotText.split("\n");
  const matchedLines: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (matchLine(line, searchTerms, caseSensitive, shouldUseGlob)) {
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
      if (!shouldSkipLine(line)) {
        contextLines.add(i);
        beforeCount++;
      }
    }

    let afterCount = 0;
    for (let i = lineNum + 1; i < lines.length && afterCount < levels; i++) {
      const line = lines[i];
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
