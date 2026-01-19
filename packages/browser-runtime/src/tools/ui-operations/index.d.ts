/**
 * UI Operations Module
 * High-level helpers for UI automation with visual feedback
 */
export { waitForEventsAfterAction } from "./event-helpers";
export {
  type FakeMouseMoveOptions,
  type FakeMouseScrollOptions,
  playClickAnimationAndReturn,
  scrollAndMoveFakeMouseToElement,
} from "./fake-mouse";
