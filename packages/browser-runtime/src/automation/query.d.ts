export declare const SKIP_ROLES: string[];
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
export declare function searchSnapshotText(snapshotText: string, query: string, options?: SearchOptions): SearchResult;
export declare function parseSearchQuery(query: string): string[];
export declare function hasGlobPatterns(searchTerms: string[]): boolean;
