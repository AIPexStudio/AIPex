import type { ElementHandle, Locator, TextSnapshotNode } from "./types";
export declare class SmartLocator implements Locator {
  private tabId;
  private node;
  private backendDOMNodeId;
  constructor(tabId: number, node: TextSnapshotNode, backendDOMNodeId: number);
  fill(value: string): Promise<void>;
  click(options?: { count?: number }): Promise<void>;
  hover(): Promise<void>;
  /**
   * Get element bounding box (public method for external use)
   */
  boundingBox(): Promise<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>;
  /**
   * Get editor value - supports Monaco Editor and standard inputs/textareas
   */
  getEditorValue(): Promise<string | null>;
  dispose(): void;
  /**
   * Helper: Get element bounding box using CDP
   */
  private getElementBoundingBox;
  /**
   * Helper: Ensure DOM domain is enabled
   */
  private ensureDOMEnabled;
  /**
   * Helper: Resolve backendDOMNodeId to RemoteObject
   */
  private resolveNodeToRemoteObject;
  /**
   * Helper: Scroll to element
   */
  private scrollToElement;
  /**
   * Execute action using CDP (Chrome DevTools Protocol) for realistic interactions
   * Includes a global timeout to prevent indefinite hanging
   */
  private executeInPage;
  /**
   * Internal implementation of executeInPage without timeout
   */
  private executeInPageInternal;
  /**
   * Execute click action using CDP
   */
  private executeClickViaCDP;
  /**
   * Add highlight to element during operation
   */
  private addHighlightToElement;
  /**
   * Remove highlight from element
   */
  private removeHighlightFromElement;
  /**
   * Try to fill Monaco Editor using native API
   */
  private tryFillMonaco;
  /**
   * Fill using select-all + replace strategy (universal fallback)
   */
  private fillUsingSelectAll;
  /**
   * Execute fill action using CDP with Monaco detection and visual feedback
   */
  private executeFillViaCDP;
  /**
   * Execute hover action using CDP
   */
  private executeHoverViaCDP;
}
export declare class SmartElementHandle implements ElementHandle {
  private locator;
  constructor(tabId: number, node: TextSnapshotNode, backendDOMNodeId: number);
  asLocator(): Locator;
  dispose(): void;
}
