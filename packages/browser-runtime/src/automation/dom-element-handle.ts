/**
 * DOM Element Handle
 * 
 * Provides ElementHandle/Locator interface using DOM-based operations
 * No CDP/debugger required - suitable for background mode
 */

import type { ElementHandle, Locator, TextSnapshotNode } from "./types";
import { DomLocator } from "./dom-locator";

/**
 * DOM-based Locator implementation
 */
class DomLocatorImpl implements Locator {
  constructor(
    private tabId: number,
    private uid: string,
  ) {}

  async fill(value: string): Promise<void> {
    const locator = new DomLocator(this.tabId);
    const result = await locator.fill(this.uid, { value, commit: true });
    if (!result.success) {
      throw new Error(result.error || "Failed to fill element");
    }
  }

  async click(options?: { count?: number }): Promise<void> {
    const locator = new DomLocator(this.tabId);
    const result = await locator.click(this.uid, {
      count: options?.count ?? 1,
      scroll: true,
    });
    if (!result.success) {
      throw new Error(result.error || "Failed to click element");
    }
  }

  async hover(): Promise<void> {
    const locator = new DomLocator(this.tabId);
    const result = await locator.hover(this.uid, { scroll: true });
    if (!result.success) {
      throw new Error(result.error || "Failed to hover element");
    }
  }

  async boundingBox(): Promise<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null> {
    const locator = new DomLocator(this.tabId);
    const result = await locator.boundingBox(this.uid);
    if (!result.success) {
      throw new Error(result.error || "Failed to get bounding box");
    }
    return result.data ?? null;
  }

  async getEditorValue(): Promise<string | null> {
    const locator = new DomLocator(this.tabId);
    const result = await locator.editorValue(this.uid);
    if (!result.success) {
      // For editor value, return null instead of throwing
      // This allows graceful fallback for non-editor elements
      console.warn(
        `[DomLocator] Failed to get editor value for ${this.uid}:`,
        result.error,
      );
      return null;
    }
    return result.data ?? null;
  }

  dispose(): void {
    // No cleanup needed for DOM-based locator
  }
}

/**
 * DOM-based ElementHandle implementation
 */
export class DomElementHandle implements ElementHandle {
  private locator: DomLocatorImpl;

  constructor(
    private tabId: number,
    private node: TextSnapshotNode,
  ) {
    this.locator = new DomLocatorImpl(tabId, node.id);
  }

  asLocator(): Locator {
    return this.locator;
  }

  dispose(): void {
    this.locator.dispose();
  }
}
