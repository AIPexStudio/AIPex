/**
 * Chrome DevTools Protocol Accessibility API Implementation
 *
 * This implementation EXACTLY mimics Puppeteer's page.accessibility.snapshot():
 * 1. Uses CDP's Accessibility.getFullAXTree (same as Puppeteer under the hood)
 * 2. Filters to "interesting only" nodes (interestingOnly: true, Puppeteer's default)
 * 3. Builds a clean tree structure (not flat array)
 * 4. Returns formatted text representation (like DevTools MCP)
 *
 * The key insight: Puppeteer already filters heavily, we should match that exactly.
 */

import { SmartElementHandle } from "./smart-locator";
import * as snapshotProvider from "./snapshot-provider";
import type { ElementHandle } from "./types";

/**
 * Helper function to get current tab
 */
async function getCurrentTab(): Promise<chrome.tabs.Tab | null> {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      return tabs[0] ?? null;
    }

    // Fallback: get any tab
    const allTabs = await chrome.tabs.query({});
    return allTabs[0] ?? null;
  } catch (error) {
    console.error("Error getting current tab:", error);
    return null;
  }
}

/**
 * Take accessibility snapshot (exactly like DevTools MCP's take_snapshot)
 * Returns formatted text representation of the page structure
 */
export async function takeSnapshot(): Promise<{
  success: boolean;
  snapshotId: number;
  snapshot: string;
  title: string;
  url: string;
  message?: string;
}> {
  const tab = await getCurrentTab();

  if (!tab || typeof tab.id !== "number") {
    return {
      success: false,
      snapshotId: 0,
      snapshot: "",
      title: "",
      url: "",
      message: "No accessible tab found",
    };
  }

  try {
    const mode = await snapshotProvider.getSnapshotMode();
    console.log(`🔍 [DEBUG] Taking ${mode === 'dom' ? 'DOM' : 'CDP'} snapshot for tab:`, tab.id);

    const result = await snapshotProvider.createSnapshot(tab.id);
    if (!result?.root) {
      return {
        success: false,
        snapshotId: tab.id,
        snapshot: "",
        title: tab.title || "",
        url: tab.url || "",
        message: "Failed to create snapshot",
      };
    }

    // Format as text (like DevTools MCP)
    const snapshotText = snapshotProvider.formatSnapshot(result);

    console.log(
      `✅ [DEBUG] Snapshot preview:\n${snapshotText.split("\n").slice(0, 20).join("\n")}`,
    );

    return {
      success: true,
      snapshotId: tab.id,
      snapshot: snapshotText,
      title: tab.title || "",
      url: tab.url || "",
      message: `Snapshot ${tab.id} created (${mode} mode)`,
    };
  } catch (error) {
    console.error("❌ [DEBUG] Error in takeSnapshot:", error);
    return {
      success: false,
      snapshotId: 0,
      snapshot: "",
      title: tab?.title || "",
      url: tab?.url || "",
      message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

async function checkTabValid(tabId: number): Promise<boolean> {
  if (!tabId || typeof tabId !== "number") {
    return false;
  }
  const tabs = await chrome.tabs.query({});
  if (!tabs || tabs.length === 0) {
    return false;
  }
  const tab = tabs.find((tab) => tab.id === tabId);
  if (!tab) {
    return false;
  }
  return true;
}

/**
 * Get element by UID following DevTools MCP pattern - NO DEBUGGER DEPENDENCY!
 */
export async function getElementByUid(
  tabId: number,
  uid: string,
): Promise<ElementHandle | null> {
  if (!(await checkTabValid(tabId))) {
    throw new Error("No accessible tab found");
  }
  const node = snapshotProvider.getNodeByUid(tabId, uid);
  if (!node) {
    throw new Error(
      "No such element found in the snapshot, the page content may have changed, please call search_elements again to get a fresh snapshot",
    );
  }

  console.log("🔍 [DEBUG] Found node in snapshot for uid:", uid, {
    role: node.role,
    name: node.name,
    description: node.description,
    backendDOMNodeId: node.backendDOMNodeId,
    value: node.value,
  });

  // Return ElementHandle if we have backendDOMNodeId
  if (node.backendDOMNodeId) {
    console.log(
      "✅ [DEBUG] Creating SmartElementHandle with backendDOMNodeId:",
      node.backendDOMNodeId,
    );
    return new SmartElementHandle(tabId, node, node.backendDOMNodeId);
  }

  return null;
}

/**
 * Wait for events after action - similar to DevTools MCP pattern
 */
async function waitForEventsAfterAction(
  action: () => Promise<void>,
): Promise<void> {
  // Execute the action
  await action();

  // Wait a bit for DOM to stabilize
  await new Promise((resolve) => setTimeout(resolve, 100));
}

/**
 * Click element by UID following DevTools MCP pattern
 * This implementation is completely based on snapshot UID mapping with retry mechanism
 *
 * 🖱️ With Fake Mouse Guidance: Before clicking, a virtual mouse cursor will appear
 * and move to the target element, showing the user where the AI is about to click.
 */
export async function clickElementByUid(params: {
  tabId: number;
  uid: string;
  dblClick: boolean;
}): Promise<{
  success: boolean;
  message: string;
}> {
  const { tabId, uid, dblClick } = params;
  const isValidTab = await checkTabValid(tabId);

  if (!isValidTab) {
    return {
      success: false,
      message: "No accessible tab found",
    };
  }

  let handle: ElementHandle | null = null;

  try {
    handle = await getElementByUid(tabId, uid);
    if (!handle) {
      return {
        success: false,
        message:
          "Element not found in current snapshot. Call search_elements first to get fresh element UIDs.",
      };
    }

    // Step 1: Scroll to element and move fake mouse
    try {
      const rectBeforeScroll = await handle.asLocator().boundingBox();

      if (rectBeforeScroll) {
        const scrollTargetX = rectBeforeScroll.x + rectBeforeScroll.width / 2;
        const scrollTargetY = rectBeforeScroll.y + rectBeforeScroll.height / 2;

        // Start smooth scroll to element coordinates
        await chrome.tabs
          .sendMessage(tabId, {
            request: "scroll-to-coordinates",
            x: scrollTargetX,
            y: scrollTargetY,
          })
          .catch(() => {});

        // Wait for scroll to complete (reduced from 1000ms + 200ms + 100ms)
        await new Promise((resolve) => setTimeout(resolve, 350));

        // Get element position after scroll
        const finalRect = await handle.asLocator().boundingBox();

        if (finalRect) {
          const elementCenterX = finalRect.x + finalRect.width / 2;
          const elementCenterY = finalRect.y + finalRect.height / 2;

          // Adjust for cursor arrow tip position
          const cursorTipOffsetX = 14;
          const cursorTipOffsetY = 18;

          const targetX = elementCenterX + cursorTipOffsetX;
          const targetY = elementCenterY + cursorTipOffsetY;

          // Move fake mouse to target (reduced from 800ms to 350ms)
          const mouseDuration = 350;
          await chrome.tabs
            .sendMessage(tabId, {
              request: "fake-mouse-move",
              x: targetX,
              y: targetY,
              duration: mouseDuration,
            })
            .catch(() => {});

          // Wait for mouse movement (reduced from 900ms)
          await new Promise((resolve) =>
            setTimeout(resolve, mouseDuration + 50),
          );
        }
      }
    } catch (_fakeMouseError) {
      // Ignore fake mouse errors
    }

    await waitForEventsAfterAction(async () => {
      await handle!.asLocator().click({ count: dblClick ? 2 : 1 });
    });

    // Play click animation after actual click (fire and forget, no waiting)
    chrome.tabs
      .sendMessage(tabId, {
        request: "fake-mouse-play-click-animation",
      })
      .catch(() => {});

    return {
      success: true,
      message: `Element ${dblClick ? "double " : ""}clicked successfully`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Error clicking element: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  } finally {
    if (handle) {
      handle.dispose();
    }
  }
}

/**
 * Fill element by UID following DevTools MCP pattern
 * This implementation uses the new Locator system - NO debugger dependency!
 *
 * ✨ With Fake Mouse Guidance: Before filling, a virtual mouse cursor will appear
 * and move to the target element, showing the user where the AI is about to type.
 */
export async function fillElementByUid(params: {
  tabId: number;
  uid: string;
  value: string;
}): Promise<{
  success: boolean;
  message: string;
}> {
  const { tabId, uid, value } = params;
  const isValidTab = await checkTabValid(tabId);

  if (!isValidTab) {
    return {
      success: false,
      message: "No accessible tab found",
    };
  }

  let handle: ElementHandle | null = null;

  try {
    console.log(
      "🔍 [DEBUG] Starting fillElementByUid using new Locator system for uid:",
      uid,
    );

    // Step 1: Get element handle using snapshot UID mapping
    handle = await getElementByUid(tabId, uid);
    if (!handle) {
      return {
        success: false,
        message:
          "Element not found in current snapshot, the page content may have changed, please call search_elements again to get a fresh snapshot.",
      };
    }

    console.log("✅ [DEBUG] Found element handle via snapshot UID mapping");

    // Step 2: Scroll to element and move fake mouse (same as click)
    try {
      // Get element current position for scrolling
      const rectBeforeScroll = await handle.asLocator().boundingBox();

      if (rectBeforeScroll) {
        const scrollTargetX = rectBeforeScroll.x + rectBeforeScroll.width / 2;
        const scrollTargetY = rectBeforeScroll.y + rectBeforeScroll.height / 2;

        // Start smooth scroll to element coordinates
        await chrome.tabs
          .sendMessage(tabId, {
            request: "scroll-to-coordinates",
            x: scrollTargetX,
            y: scrollTargetY,
          })
          .catch(() => {});

        // Wait for scroll to complete
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Wait a bit for any layout shifts
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Re-get element position (it changed after scroll!)
        const rectAfterScroll = await handle.asLocator().boundingBox();

        if (rectAfterScroll) {
          // Wait another frame to ensure blue border is rendered and layout is stable
          await new Promise((resolve) => setTimeout(resolve, 100));

          // Get position one more time to be absolutely sure
          const finalRect = await handle.asLocator().boundingBox();

          if (finalRect) {
            const elementCenterX = finalRect.x + finalRect.width / 2;
            const elementCenterY = finalRect.y + finalRect.height / 2;

            // Adjust for cursor arrow tip position
            // Arrow tip is at (10, 6) in 48x48 SVG, center at (24, 24)
            // Offset cursor center by (14, 18) to make tip point at element center
            const cursorTipOffsetX = 14;
            const cursorTipOffsetY = 18;

            const targetX = elementCenterX + cursorTipOffsetX;
            const targetY = elementCenterY + cursorTipOffsetY;

            console.log("[UI Operations] Moving fake mouse to fill target:", {
              element: {
                x: finalRect.x,
                y: finalRect.y,
                width: finalRect.width,
                height: finalRect.height,
              },
              center: { x: elementCenterX, y: elementCenterY },
              target: { x: targetX, y: targetY },
            });

            // Move fake mouse from center to target (using FINAL position)
            await chrome.tabs
              .sendMessage(tabId, {
                request: "fake-mouse-move",
                x: targetX,
                y: targetY,
                duration: 800,
              })
              .catch(() => {});

            // Wait for mouse movement to complete
            await new Promise((resolve) => setTimeout(resolve, 900));
          }
        }
      }
    } catch (fakeMouseError) {
      // Ignore fake mouse errors
      console.warn("⚠️ [DEBUG] Fake mouse error (ignored):", fakeMouseError);
    }

    // Step 3: Use Locator system to fill the element
    await waitForEventsAfterAction(async () => {
      await handle!.asLocator().fill(value);
    });

    // Play animation after filling (same as click - returns fake mouse to center)
    // Use a timeout to prevent hanging
    try {
      const animationPromise = chrome.tabs
        .sendMessage(tabId, {
          request: "fake-mouse-play-click-animation",
        })
        .catch(() => {});

      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 500));

      // Race between animation and timeout - don't wait more than 500ms
      await Promise.race([animationPromise, timeoutPromise]);
    } catch (_animError) {
      // Ignore animation errors
    }

    return {
      success: true,
      message: "Element filled successfully using new Locator system",
    };
  } catch (error) {
    console.error("❌ [DEBUG] Error in fillElementByUid:", error);
    return {
      success: false,
      message: `Error filling element: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  } finally {
    // Clean up resources
    if (handle) {
      handle.dispose();
    }
  }
}

/**
 * Fill multiple form elements at once using new Locator system
 *
 * ✨ With Fake Mouse Guidance: Before filling each element, a virtual mouse cursor
 * will move to the target, showing the user where the AI is typing.
 */
export async function fillForm(params: {
  tabId: number;
  elements: Array<{ uid: string; value: string }>;
}): Promise<{
  success: boolean;
  message: string;
}> {
  const { tabId, elements } = params;
  const isValidTab = await checkTabValid(tabId);

  if (!isValidTab) {
    return {
      success: false,
      message: "No accessible tab found",
    };
  }

  try {
    console.log(
      "🔍 [DEBUG] Starting fillForm using new Locator system for",
      elements.length,
      "elements",
    );

    let successCount = 0;
    const errors: string[] = [];

    for (const element of elements) {
      let handle: ElementHandle | null = null;
      try {
        console.log(
          `🔍 [DEBUG] Processing element UID: ${element.uid} with value: "${element.value}"`,
        );

        handle = await getElementByUid(tabId, element.uid);
        if (!handle) {
          const errorMsg = `UID ${element.uid}: Element not found in snapshot, the page content may have changed, please call search_elements again to get a fresh snapshot.`;
          console.error(`❌ [DEBUG] ${errorMsg}`);
          errors.push(errorMsg);
          continue;
        }

        console.log(`✅ [DEBUG] Found element handle for UID: ${element.uid}`);

        // Scroll to element and move fake mouse (same as fillElementByUid)
        try {
          const rectBeforeScroll = await handle.asLocator().boundingBox();

          if (rectBeforeScroll) {
            const scrollTargetX =
              rectBeforeScroll.x + rectBeforeScroll.width / 2;
            const scrollTargetY =
              rectBeforeScroll.y + rectBeforeScroll.height / 2;

            await chrome.tabs
              .sendMessage(tabId, {
                request: "scroll-to-coordinates",
                x: scrollTargetX,
                y: scrollTargetY,
              })
              .catch(() => {});

            await new Promise((resolve) => setTimeout(resolve, 1000));
            await new Promise((resolve) => setTimeout(resolve, 200));

            const rectAfterScroll = await handle.asLocator().boundingBox();

            if (rectAfterScroll) {
              await new Promise((resolve) => setTimeout(resolve, 100));

              const finalRect = await handle.asLocator().boundingBox();

              if (finalRect) {
                const elementCenterX = finalRect.x + finalRect.width / 2;
                const elementCenterY = finalRect.y + finalRect.height / 2;

                const cursorTipOffsetX = 14;
                const cursorTipOffsetY = 18;

                const targetX = elementCenterX + cursorTipOffsetX;
                const targetY = elementCenterY + cursorTipOffsetY;

                console.log(
                  `[UI Operations] Moving fake mouse to form field ${element.uid}:`,
                  {
                    center: { x: elementCenterX, y: elementCenterY },
                    target: { x: targetX, y: targetY },
                  },
                );

                await chrome.tabs
                  .sendMessage(tabId, {
                    request: "fake-mouse-move",
                    x: targetX,
                    y: targetY,
                    duration: 800,
                  })
                  .catch(() => {});

                await new Promise((resolve) => setTimeout(resolve, 900));
              }
            }
          }
        } catch (fakeMouseError) {
          console.warn("⚠️ [DEBUG] Fake mouse error (ignored):", fakeMouseError);
        }

        await waitForEventsAfterAction(async () => {
          await handle!.asLocator().fill(element.value);
        });

        // Play animation after filling (same as click - returns fake mouse to center)
        // Use a timeout to prevent hanging
        try {
          const animationPromise = chrome.tabs
            .sendMessage(tabId, {
              request: "fake-mouse-play-click-animation",
            })
            .catch(() => {});

          const timeoutPromise = new Promise((resolve) =>
            setTimeout(resolve, 500),
          );

          // Race between animation and timeout - don't wait more than 500ms
          await Promise.race([animationPromise, timeoutPromise]);
        } catch (_animError) {
          // Ignore animation errors
        }

        console.log(
          `✅ [DEBUG] Successfully filled element UID: ${element.uid}`,
        );
        successCount++;
      } catch (error) {
        const errorMsg = `UID ${element.uid}: ${error instanceof Error ? error.message : "Unknown error"}`;
        console.error(`❌ [DEBUG] ${errorMsg}`);
        errors.push(errorMsg);
      } finally {
        if (handle) {
          handle.dispose();
        }
      }
    }

    const message = `Filled ${successCount}/${elements.length} elements successfully using new Locator system${errors.length > 0 ? `. Errors: ${errors.join(", ")}` : ""}`;

    return {
      success: successCount > 0,
      message,
    };
  } catch (error) {
    console.error("❌ [DEBUG] Error in fillForm:", error);
    return {
      success: false,
      message: `Error filling form: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Hover element by UID following DevTools MCP pattern
 * This implementation is completely based on snapshot UID mapping - NO debugger dependency!
 */
export async function hoverElementByUid(params: {
  tabId: number;
  uid: string;
}): Promise<{
  success: boolean;
  message: string;
}> {
  const { tabId, uid } = params;
  const isValidTab = await checkTabValid(tabId);

  if (!isValidTab) {
    return {
      success: false,
      message: "No accessible tab found",
    };
  }

  let handle: ElementHandle | null = null;

  try {
    console.log(
      "🔍 [DEBUG] Starting hoverElementByUid using new Locator system for uid:",
      uid,
    );

    // Step 1: Get element handle using snapshot UID mapping
    handle = await getElementByUid(tabId, uid);
    if (!handle) {
      return {
        success: false,
        message:
          "Element not found in current snapshot, the page content may have changed, please call search_elements again to get a fresh snapshot.",
      };
    }

    console.log("✅ [DEBUG] Found element handle via snapshot UID mapping");

    // Step 2: Use Locator system to hover over the element
    await waitForEventsAfterAction(async () => {
      await handle!.asLocator().hover();
    });

    return {
      success: true,
      message: "Element hovered successfully using new Locator system",
    };
  } catch (error) {
    console.error("❌ [DEBUG] Error in hoverElementByUid:", error);
    return {
      success: false,
      message: `Error hovering element: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  } finally {
    // Clean up resources
    if (handle) {
      handle.dispose();
    }
  }
}

export async function searchSnapshotText(params: {
  tabId: number;
  query: string;
  contextLevels: number;
}): Promise<{
  success: boolean;
  message: string;
  data: string;
}> {
  const { tabId, query, contextLevels } = params;
  const isValidTab = await checkTabValid(tabId);
  if (!isValidTab) {
    return { success: false, message: "No accessible tab found", data: "" };
  }
  const result = await snapshotProvider.searchAndFormat(
    tabId,
    query,
    contextLevels,
  );
  if (!result) {
    return {
      success: false,
      message: "Failed to search snapshot text",
      data: "",
    };
  }
  return {
    success: true,
    message: "Search snapshot text successfully",
    data: result,
  };
}

/**
 * Get editor content by UID
 * Supports Monaco Editor, CodeMirror, ACE, and standard inputs/textareas
 */
export async function getEditorValueByUid(params: {
  tabId: number;
  uid: string;
}): Promise<{
  success: boolean;
  message: string;
  value?: string;
}> {
  const { tabId, uid } = params;
  const isValidTab = await checkTabValid(tabId);

  if (!isValidTab) {
    return {
      success: false,
      message: "No accessible tab found",
    };
  }

  let handle: ElementHandle | null = null;

  try {
    console.log("🔍 [DEBUG] Starting getEditorValueByUid for uid:", uid);

    // Step 1: Get element handle using snapshot UID mapping
    handle = await getElementByUid(tabId, uid);
    if (!handle) {
      return {
        success: false,
        message:
          "Element not found in current snapshot, the page content may have changed, please call search_elements again to get a fresh snapshot.",
      };
    }

    console.log("✅ [DEBUG] Found element handle via snapshot UID mapping");

    // Step 2: Use Locator system to get editor value
    const value = await handle.asLocator().getEditorValue();

    if (value === null) {
      return {
        success: false,
        message:
          "Failed to get editor value - element may not be an input/textarea/editor",
      };
    }

    console.log(
      `✅ [DEBUG] Successfully retrieved editor value (${value.length} characters)`,
    );

    return {
      success: true,
      message: `Successfully retrieved editor value (${value.length} characters)`,
      value,
    };
  } catch (error) {
    console.error("❌ [DEBUG] Error in getEditorValueByUid:", error);
    return {
      success: false,
      message: `Error getting editor value: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  } finally {
    // Clean up resources
    if (handle) {
      handle.dispose();
    }
  }
}
