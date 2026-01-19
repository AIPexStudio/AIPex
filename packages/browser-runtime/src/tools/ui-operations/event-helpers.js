/**
 * Event Helpers
 * Utilities for waiting for DOM events after actions
 */
/**
 * Wait for events after an action to ensure proper event handling
 * This helps with pages that have complex event listeners
 */
export async function waitForEventsAfterAction(action) {
    await action();
    // Wait for any pending events to be processed
    await new Promise((resolve) => setTimeout(resolve, 100));
    // Wait for next animation frame to ensure DOM updates
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
    // Additional small delay for event propagation
    await new Promise((resolve) => setTimeout(resolve, 50));
}
