/**
 * Bookmarks Context Provider
 * Provides contexts from browser bookmarks
 */
import type {
  Context,
  ContextProvider,
  ContextQuery,
} from "@aipexstudio/aipex-core";
export declare class BookmarksProvider implements ContextProvider {
  id: string;
  name: string;
  description: string;
  capabilities: {
    canList: boolean;
    canSearch: boolean;
    canWatch: boolean;
    types: "bookmark"[];
  };
  getContexts(query?: ContextQuery): Promise<Context[]>;
  getContext(id: string): Promise<Context | null>;
  private traverseBookmarks;
}
