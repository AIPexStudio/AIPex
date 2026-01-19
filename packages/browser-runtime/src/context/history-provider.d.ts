/**
 * History Context Provider
 * Provides contexts from browser browsing history
 */
import type { Context, ContextProvider, ContextQuery } from "@aipexstudio/aipex-core";
export declare class HistoryProvider implements ContextProvider {
    id: string;
    name: string;
    description: string;
    capabilities: {
        canList: boolean;
        canSearch: boolean;
        canWatch: boolean;
        types: "custom"[];
    };
    getContexts(query?: ContextQuery): Promise<Context[]>;
    getContext(id: string): Promise<Context | null>;
}
