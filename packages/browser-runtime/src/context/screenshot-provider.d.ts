/**
 * Screenshot Context Provider
 * Provides screenshot of the currently visible tab
 */
import type {
  Context,
  ContextProvider,
  ContextQuery,
} from "@aipexstudio/aipex-core";
export declare class ScreenshotProvider implements ContextProvider {
  id: string;
  name: string;
  description: string;
  capabilities: {
    canList: boolean;
    canSearch: boolean;
    canWatch: boolean;
    types: "screenshot"[];
  };
  getContexts(_query?: ContextQuery): Promise<Context[]>;
  getContext(id: string): Promise<Context | null>;
  private captureScreenshot;
}
