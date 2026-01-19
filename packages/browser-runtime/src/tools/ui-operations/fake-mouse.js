/**
 * Fake Mouse Helpers
 * Integration helpers for fake mouse visual feedback
 */
/**
 * Scroll element into view and move fake mouse to it
 * Returns the final bounding box of the element
 */
export async function scrollAndMoveFakeMouseToElement(options) {
  const { tabId, handle } = options;
  try {
    // Get element position before scroll
    const rectBeforeScroll = await handle.asLocator().boundingBox();
    if (!rectBeforeScroll) {
      return null;
    }
    const scrollTargetX = rectBeforeScroll.x + rectBeforeScroll.width / 2;
    const scrollTargetY = rectBeforeScroll.y + rectBeforeScroll.height / 2;
    // Start smooth scroll to element coordinates
    await chrome.tabs
      .sendMessage(tabId, {
        request: "scroll-to-coordinates",
        x: scrollTargetX,
        y: scrollTargetY,
      })
      .catch(() => {
        // Ignore errors if content script not ready
      });
    // Wait for scroll to complete
    await new Promise((resolve) => setTimeout(resolve, 350));
    // Get element position after scroll
    const finalRect = await handle.asLocator().boundingBox();
    if (!finalRect) {
      return null;
    }
    const elementCenterX = finalRect.x + finalRect.width / 2;
    const elementCenterY = finalRect.y + finalRect.height / 2;
    // Adjust for cursor arrow tip position
    const cursorTipOffsetX = 14;
    const cursorTipOffsetY = 18;
    const targetX = elementCenterX + cursorTipOffsetX;
    const targetY = elementCenterY + cursorTipOffsetY;
    // Move fake mouse to target
    const mouseDuration = 350;
    await chrome.tabs
      .sendMessage(tabId, {
        request: "fake-mouse-move",
        x: targetX,
        y: targetY,
        duration: mouseDuration,
      })
      .catch(() => {
        // Ignore errors if content script not ready
      });
    // Wait for mouse movement
    await new Promise((resolve) => setTimeout(resolve, mouseDuration + 50));
    return finalRect;
  } catch (_error) {
    // Ignore fake mouse errors
    return null;
  }
}
/**
 * Play click animation and return fake mouse to center
 */
export async function playClickAnimationAndReturn(tabId) {
  try {
    await chrome.tabs
      .sendMessage(tabId, {
        request: "fake-mouse-play-click-animation",
      })
      .catch(() => {
        // Ignore errors if content script not ready
      });
  } catch (_error) {
    // Ignore animation errors
  }
}
