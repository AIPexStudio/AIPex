/**
 * Tabs Context Provider
 * Provides contexts from all open browser tabs
 */
import type {
  Context,
  ContextProvider,
  ContextQuery,
} from "@aipexstudio/aipex-core";
export declare class TabsProvider implements ContextProvider {
  id: string;
  name: string;
  description: string;
  capabilities: {
    canList: boolean;
    canSearch: boolean;
    canWatch: boolean;
    types: "tab"[];
  };
  getContexts(query?: ContextQuery): Promise<Context[]>;
  getContext(id: string): Promise<Context | null>;
  watch(callback: (contexts: Context[]) => void): () => void;
}
