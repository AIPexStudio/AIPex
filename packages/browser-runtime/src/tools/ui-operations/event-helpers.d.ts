/**
 * Event Helpers
 * Utilities for waiting for DOM events after actions
 */
/**
 * Wait for events after an action to ensure proper event handling
 * This helps with pages that have complex event listeners
 */
export declare function waitForEventsAfterAction(
  action: () => Promise<void>,
): Promise<void>;
