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
function hasGlobPattern(str) {
    return /[*?[{\]}]/.test(str);
}
/**
 * Simple glob pattern matcher supporting basic patterns:
 * - * matches any characters
 * - ? matches single character
 * - [abc] matches a, b, or c
 * - [a-z] matches character range
 * - {pattern1,pattern2} matches either pattern
 */
function matchGlob(pattern, text, caseSensitive = false) {
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
        .replace(/[.*+^${}()|[\]\\]/g, "\\$&") // Escape regex special chars
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
    }
    catch (error) {
        console.warn(`Invalid glob pattern: ${pattern}`, error);
        return false;
    }
}
export function searchSnapshotText(snapshotText, query, options = {}) {
    const { contextLevels = 1, caseSensitive = false, useGlob } = options;
    const searchTerms = parseSearchQuery(query);
    if (searchTerms.length === 0) {
        return {
            matchedLines: [],
            contextLines: [],
            totalMatches: 0,
        };
    }
    const shouldUseGlob = useGlob !== undefined
        ? useGlob
        : searchTerms.some((term) => hasGlobPattern(term));
    const matcherFns = shouldUseGlob
        ? searchTerms.map((term) => (line) => matchGlob(term, line, caseSensitive))
        : [];
    const lines = snapshotText.split("\n");
    const matchedLines = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line === undefined) {
            continue;
        }
        if (matchLine(line, searchTerms, matcherFns, caseSensitive, shouldUseGlob)) {
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
function matchLine(line, searchTerms, matchers, caseSensitive, useGlob) {
    if (useGlob) {
        return matchers.some((match) => match(line));
    }
    const lineValue = caseSensitive ? line : line.toLowerCase();
    return searchTerms.some((term) => {
        const searchTerm = caseSensitive ? term : term.toLowerCase();
        return lineValue.includes(searchTerm);
    });
}
function expandLineContext(matchedLines, lines, levels) {
    const contextLines = new Set();
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
function shouldSkipLine(line) {
    const trimmedLine = line.trim();
    return SKIP_ROLES.some((role) => trimmedLine.startsWith(role));
}
export function parseSearchQuery(query) {
    return query
        .split("|")
        .map((term) => term.trim())
        .filter((term) => term.length > 0);
}
export function hasGlobPatterns(searchTerms) {
    return searchTerms.some((term) => hasGlobPattern(term));
}
