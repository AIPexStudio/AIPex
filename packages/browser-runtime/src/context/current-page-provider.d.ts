/**
 * Current Page Context Provider
 * Provides context from the currently active browser tab
 */
import type { Context, ContextProvider, ContextQuery } from "@aipexstudio/aipex-core";
export declare class CurrentPageProvider implements ContextProvider {
    id: string;
    name: string;
    description: string;
    capabilities: {
        canList: boolean;
        canSearch: boolean;
        canWatch: boolean;
        types: "page"[];
    };
    getContexts(_query?: ContextQuery): Promise<Context[]>;
    getContext(id: string): Promise<Context | null>;
    watch(callback: (contexts: Context[]) => void): () => void;
    private getCurrentPage;
}
