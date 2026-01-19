/**
 * Fake Mouse Helpers
 * Integration helpers for fake mouse visual feedback
 */
import type { ElementHandle } from "../../automation";
export interface FakeMouseScrollOptions {
  tabId: number;
  handle: ElementHandle;
}
export interface FakeMouseMoveOptions {
  tabId: number;
  x: number;
  y: number;
  duration?: number;
}
/**
 * Scroll element into view and move fake mouse to it
 * Returns the final bounding box of the element
 */
export declare function scrollAndMoveFakeMouseToElement(
  options: FakeMouseScrollOptions,
): Promise<{
  x: number;
  y: number;
  width: number;
  height: number;
} | null>;
/**
 * Play click animation and return fake mouse to center
 */
export declare function playClickAnimationAndReturn(
  tabId: number,
): Promise<void>;
