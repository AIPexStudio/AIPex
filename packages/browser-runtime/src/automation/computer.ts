/**
 * Claude-style Computer Tool Implementation
 *
 * Unified tool for visual/coordinate-based browser interaction.
 * Coordinates are in screenshot pixel space and mapped to viewport CSS pixels.
 *
 * Coordinate mapping:
 * - xCss = (x / imageWidth) * viewportWidth
 * - yCss = (y / imageHeight) * viewportHeight
 */

import { CdpCommander } from "./cdp-commander";
import { debuggerManager } from "./debugger-manager";

/**
 * Log CDP command details to console for debugging
 * Redacts sensitive data like typed text
 */
function logCdp(
  tabId: number,
  action: string,
  command: string,
  params: Record<string, unknown>,
  extra?: {
    screenshotCoords?: { x: number; y: number };
    cssCoords?: { xCss: number; yCss: number };
  },
): void {
  // Redact sensitive fields
  const safeParams = { ...params };
  if ("text" in safeParams && typeof safeParams.text === "string") {
    safeParams.text = `[REDACTED: ${(safeParams.text as string).length} chars]`;
  }

  const logData: Record<string, unknown> = {
    tabId,
    action,
    command,
    params: safeParams,
  };

  if (extra?.screenshotCoords) {
    logData.screenshotCoords = extra.screenshotCoords;
  }
  if (extra?.cssCoords) {
    logData.cssCoords = extra.cssCoords;
  }

  console.log(
    `🔧 [CDP] chrome.debugger.sendCommand:`,
    JSON.stringify(logData, null, 2),
  );
}

// Cache for screenshot metadata per tab
// Stores the relationship between screenshot image pixels and viewport CSS pixels
interface ScreenshotMetadata {
  imageWidth: number;
  imageHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  timestamp: number;
  tabId: number;
}

const screenshotCache = new Map<number, ScreenshotMetadata>();

/**
 * Cache screenshot metadata for a tab
 * Called by capture_screenshot/capture_tab_screenshot when sendToLLM=true
 * This allows the computer tool to map screenshot pixel coordinates to viewport CSS pixels
 */
export function cacheScreenshotMetadata(
  tabId: number,
  imageWidth: number,
  imageHeight: number,
  viewportWidth: number,
  viewportHeight: number,
): void {
  const metadata: ScreenshotMetadata = {
    imageWidth,
    imageHeight,
    viewportWidth,
    viewportHeight,
    timestamp: Date.now(),
    tabId,
  };
  screenshotCache.set(tabId, metadata);
  console.log(
    `📸 [Computer] Screenshot metadata cached for tab ${tabId}: ${imageWidth}x${imageHeight} image, ${viewportWidth}x${viewportHeight} viewport`,
  );
}

// Action types
type ComputerAction =
  | "left_click"
  | "right_click"
  | "type"
  | "wait"
  | "scroll"
  | "key"
  | "left_click_drag"
  | "double_click"
  | "triple_click"
  | "scroll_to"
  | "hover";

// Input parameters for computer action
export interface ComputerParams {
  action: ComputerAction;
  coordinate?: [number, number];
  text?: string;
  start_coordinate?: [number, number];
  scroll_direction?: "up" | "down" | "left" | "right";
  scroll_amount?: number;
  duration?: number;
  tabId?: number;
  uid?: string;
}

// Result type
interface ComputerResult {
  success: boolean;
  message?: string;
  error?: string;
  coordinates?: { xCss: number; yCss: number };
}

/**
 * Get the current active tab
 */
async function getCurrentTab(): Promise<chrome.tabs.Tab | null> {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    return tab || null;
  } catch {
    return null;
  }
}

/**
 * Resolve tab ID - use provided or get current active tab
 */
async function resolveTabId(tabId?: number): Promise<number | null> {
  if (tabId !== undefined) {
    return tabId;
  }
  const tab = await getCurrentTab();
  return tab?.id ?? null;
}

/**
 * Convert screenshot pixel coordinates to viewport CSS pixels
 */
function screenshotToCssPixels(
  x: number,
  y: number,
  metadata: ScreenshotMetadata,
): { xCss: number; yCss: number } {
  const { imageWidth, imageHeight, viewportWidth, viewportHeight } = metadata;

  // Map from screenshot pixels to viewport CSS pixels
  const xCss = Math.round((x / imageWidth) * viewportWidth);
  const yCss = Math.round((y / imageHeight) * viewportHeight);

  // Clamp to viewport bounds
  return {
    xCss: Math.max(0, Math.min(xCss, viewportWidth - 1)),
    yCss: Math.max(0, Math.min(yCss, viewportHeight - 1)),
  };
}

/**
 * Perform a click action
 */
async function performClick(
  tabId: number,
  x: number,
  y: number,
  button: "left" | "right",
  clickCount: number = 1,
): Promise<ComputerResult> {
  const metadata = screenshotCache.get(tabId);
  if (!metadata) {
    return {
      success: false,
      error:
        'No screenshot metadata found. Please take a screenshot first using capture_screenshot(sendToLLM=true).',
    };
  }

  if (Date.now() - metadata.timestamp > 5 * 60 * 1000) {
    console.warn(
      "⚠️ [Computer] Screenshot metadata is stale, coordinates may be inaccurate",
    );
  }

  const { xCss, yCss } = screenshotToCssPixels(x, y, metadata);

  console.log(
    `🖱️ [Computer] ${button}_click at screenshot (${x},${y}) -> CSS (${xCss},${yCss})`,
  );

  try {
    const attached = await debuggerManager.safeAttachDebugger(tabId);
    if (!attached) {
      return { success: false, error: "Failed to attach debugger" };
    }

    const cdpCommander = new CdpCommander(tabId);
    const buttonType = button === "right" ? "right" : "left";

    // First, move mouse to the target position (hover) before clicking
    const hoverParams = {
      type: "mouseMoved",
      x: xCss,
      y: yCss,
    };
    logCdp(tabId, `${button}_click`, "Input.dispatchMouseEvent", hoverParams, {
      screenshotCoords: { x, y },
      cssCoords: { xCss, yCss },
    });
    await cdpCommander.sendCommand("Input.dispatchMouseEvent", hoverParams);

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Perform click sequence
    for (let i = 0; i < clickCount; i++) {
      const pressedParams = {
        type: "mousePressed",
        x: xCss,
        y: yCss,
        button: buttonType,
        clickCount: 1,
      };
      logCdp(
        tabId,
        `${button}_click`,
        "Input.dispatchMouseEvent",
        pressedParams,
        {
          screenshotCoords: { x, y },
          cssCoords: { xCss, yCss },
        },
      );
      await cdpCommander.sendCommand("Input.dispatchMouseEvent", pressedParams);

      await new Promise((resolve) => setTimeout(resolve, 50));

      const releasedParams = {
        type: "mouseReleased",
        x: xCss,
        y: yCss,
        button: buttonType,
        clickCount: 1,
      };
      logCdp(
        tabId,
        `${button}_click`,
        "Input.dispatchMouseEvent",
        releasedParams,
        {
          screenshotCoords: { x, y },
          cssCoords: { xCss, yCss },
        },
      );
      await cdpCommander.sendCommand(
        "Input.dispatchMouseEvent",
        releasedParams,
      );

      if (i < clickCount - 1) {
        await new Promise((resolve) => setTimeout(resolve, 80));
      }
    }

    await debuggerManager.safeDetachDebugger(tabId);

    const clickType =
      clickCount === 1
        ? "click"
        : clickCount === 2
          ? "double-click"
          : "triple-click";
    return {
      success: true,
      message: `Successfully performed ${button} ${clickType} at (${xCss}, ${yCss})`,
      coordinates: { xCss, yCss },
    };
  } catch (error) {
    await debuggerManager.safeDetachDebugger(tabId, true);
    return {
      success: false,
      error: `Click failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Perform hover action
 */
async function performHover(
  tabId: number,
  x: number,
  y: number,
): Promise<ComputerResult> {
  const metadata = screenshotCache.get(tabId);
  if (!metadata) {
    return {
      success: false,
      error:
        'No screenshot metadata found. Please take a screenshot first using capture_screenshot(sendToLLM=true).',
    };
  }

  const { xCss, yCss } = screenshotToCssPixels(x, y, metadata);

  console.log(
    `🖱️ [Computer] Hover at screenshot (${x},${y}) -> CSS (${xCss},${yCss})`,
  );

  try {
    const attached = await debuggerManager.safeAttachDebugger(tabId);
    if (!attached) {
      return { success: false, error: "Failed to attach debugger" };
    }

    const cdpCommander = new CdpCommander(tabId);

    const hoverParams = {
      type: "mouseMoved",
      x: xCss,
      y: yCss,
    };
    logCdp(tabId, "hover", "Input.dispatchMouseEvent", hoverParams, {
      screenshotCoords: { x, y },
      cssCoords: { xCss, yCss },
    });
    await cdpCommander.sendCommand("Input.dispatchMouseEvent", hoverParams);

    await debuggerManager.safeDetachDebugger(tabId);

    return {
      success: true,
      message: `Successfully hovered at (${xCss}, ${yCss})`,
      coordinates: { xCss, yCss },
    };
  } catch (error) {
    await debuggerManager.safeDetachDebugger(tabId, true);
    return {
      success: false,
      error: `Hover failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Perform drag action
 */
async function performDrag(
  tabId: number,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): Promise<ComputerResult> {
  const metadata = screenshotCache.get(tabId);
  if (!metadata) {
    return {
      success: false,
      error:
        'No screenshot metadata found. Please take a screenshot first using capture_screenshot(sendToLLM=true).',
    };
  }

  const start = screenshotToCssPixels(startX, startY, metadata);
  const end = screenshotToCssPixels(endX, endY, metadata);

  console.log(
    `🖱️ [Computer] Drag from (${start.xCss},${start.yCss}) to (${end.xCss},${end.yCss})`,
  );

  try {
    const attached = await debuggerManager.safeAttachDebugger(tabId);
    if (!attached) {
      return { success: false, error: "Failed to attach debugger" };
    }

    const cdpCommander = new CdpCommander(tabId);

    // Mouse down at start
    const pressedParams = {
      type: "mousePressed",
      x: start.xCss,
      y: start.yCss,
      button: "left",
      clickCount: 1,
    };
    logCdp(
      tabId,
      "left_click_drag",
      "Input.dispatchMouseEvent",
      pressedParams,
      {
        screenshotCoords: { x: startX, y: startY },
        cssCoords: { xCss: start.xCss, yCss: start.yCss },
      },
    );
    await cdpCommander.sendCommand("Input.dispatchMouseEvent", pressedParams);

    // Move to end (with intermediate steps for smooth drag)
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const stepX = Math.round(start.xCss + (end.xCss - start.xCss) * t);
      const stepY = Math.round(start.yCss + (end.yCss - start.yCss) * t);

      const moveParams = {
        type: "mouseMoved",
        x: stepX,
        y: stepY,
        button: "left",
      };
      logCdp(tabId, "left_click_drag", "Input.dispatchMouseEvent", moveParams, {
        cssCoords: { xCss: stepX, yCss: stepY },
      });
      await cdpCommander.sendCommand("Input.dispatchMouseEvent", moveParams);
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    // Mouse up at end
    const releasedParams = {
      type: "mouseReleased",
      x: end.xCss,
      y: end.yCss,
      button: "left",
      clickCount: 1,
    };
    logCdp(
      tabId,
      "left_click_drag",
      "Input.dispatchMouseEvent",
      releasedParams,
      {
        screenshotCoords: { x: endX, y: endY },
        cssCoords: { xCss: end.xCss, yCss: end.yCss },
      },
    );
    await cdpCommander.sendCommand("Input.dispatchMouseEvent", releasedParams);

    await debuggerManager.safeDetachDebugger(tabId);

    return {
      success: true,
      message: `Successfully dragged from (${start.xCss}, ${start.yCss}) to (${end.xCss}, ${end.yCss})`,
    };
  } catch (error) {
    await debuggerManager.safeDetachDebugger(tabId, true);
    return {
      success: false,
      error: `Drag failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Perform scroll action
 */
async function performScroll(
  tabId: number,
  x: number,
  y: number,
  direction: "up" | "down" | "left" | "right",
  amount?: number,
): Promise<ComputerResult> {
  const metadata = screenshotCache.get(tabId);
  if (!metadata) {
    return {
      success: false,
      error:
        'No screenshot metadata found. Please take a screenshot first using capture_screenshot(sendToLLM=true).',
    };
  }

  const { xCss, yCss } = screenshotToCssPixels(x, y, metadata);

  // Default scroll amount: ~2 viewport heights
  const scrollAmount = amount || metadata.viewportHeight * 2;

  // Calculate delta based on direction
  let deltaX = 0;
  let deltaY = 0;
  switch (direction) {
    case "up":
      deltaY = -scrollAmount;
      break;
    case "down":
      deltaY = scrollAmount;
      break;
    case "left":
      deltaX = -scrollAmount;
      break;
    case "right":
      deltaX = scrollAmount;
      break;
  }

  console.log(
    `📜 [Computer] Scroll ${direction} by ${scrollAmount} at (${xCss},${yCss})`,
  );

  try {
    const attached = await debuggerManager.safeAttachDebugger(tabId);
    if (!attached) {
      return { success: false, error: "Failed to attach debugger" };
    }

    const cdpCommander = new CdpCommander(tabId);

    // Use wheel event for scrolling
    const scrollParams = {
      type: "mouseWheel",
      x: xCss,
      y: yCss,
      deltaX,
      deltaY,
    };
    logCdp(tabId, "scroll", "Input.dispatchMouseEvent", scrollParams, {
      screenshotCoords: { x, y },
      cssCoords: { xCss, yCss },
    });
    await cdpCommander.sendCommand("Input.dispatchMouseEvent", scrollParams);

    await debuggerManager.safeDetachDebugger(tabId);

    return {
      success: true,
      message: `Successfully scrolled ${direction} by ${scrollAmount}px at (${xCss}, ${yCss})`,
    };
  } catch (error) {
    await debuggerManager.safeDetachDebugger(tabId, true);
    return {
      success: false,
      error: `Scroll failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Type text
 */
async function performType(
  tabId: number,
  text: string,
): Promise<ComputerResult> {
  console.log(`⌨️ [Computer] Typing: [REDACTED: ${text.length} chars]`);

  try {
    const attached = await debuggerManager.safeAttachDebugger(tabId);
    if (!attached) {
      return { success: false, error: "Failed to attach debugger" };
    }

    const cdpCommander = new CdpCommander(tabId);

    // Use insertText for reliable text input
    const typeParams = { text };
    logCdp(tabId, "type", "Input.insertText", typeParams);
    await cdpCommander.sendCommand("Input.insertText", typeParams);

    await debuggerManager.safeDetachDebugger(tabId);

    return {
      success: true,
      message: `Successfully typed [${text.length} chars]`,
    };
  } catch (error) {
    await debuggerManager.safeDetachDebugger(tabId, true);
    return {
      success: false,
      error: `Type failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Press key(s)
 */
async function performKey(
  tabId: number,
  keySequence: string,
): Promise<ComputerResult> {
  console.log(`⌨️ [Computer] Key press: "${keySequence}"`);

  try {
    const attached = await debuggerManager.safeAttachDebugger(tabId);
    if (!attached) {
      return { success: false, error: "Failed to attach debugger" };
    }

    const cdpCommander = new CdpCommander(tabId);

    // Detect platform for modifier key mapping
    const platformResult = await cdpCommander.sendCommand("Runtime.evaluate", {
      expression: 'navigator.platform.toUpperCase().indexOf("MAC") >= 0',
      returnByValue: true,
    });
    const isMac =
      (platformResult as { result?: { value?: boolean } })?.result?.value ===
      true;

    // Parse and execute key sequence (space-separated)
    const keys = keySequence.split(" ").filter((k) => k.length > 0);

    for (const keySpec of keys) {
      // Handle modifier+key combinations (e.g., "cmd+a", "ctrl+c")
      const parts = keySpec.split("+");
      let modifiers = 0;
      const key = parts[parts.length - 1];
      
      if (!key) {
        console.warn(`[Computer] Empty key in keySpec: "${keySpec}"`);
        continue;
      }

      // Build modifiers
      for (let i = 0; i < parts.length - 1; i++) {
        const mod = parts[i]?.toLowerCase();
        if (!mod) continue;
        switch (mod) {
          case "ctrl":
          case "control":
            modifiers |= 2; // Control
            break;
          case "cmd":
          case "meta":
            modifiers |= isMac ? 8 : 2; // Meta on Mac, Control on Windows
            break;
          case "alt":
            modifiers |= 1; // Alt
            break;
          case "shift":
            modifiers |= 4; // Shift
            break;
        }
      }

      // Map key names to CDP key values
      const keyMap: Record<
        string,
        { key: string; code: string; keyCode: number }
      > = {
        enter: { key: "Enter", code: "Enter", keyCode: 13 },
        tab: { key: "Tab", code: "Tab", keyCode: 9 },
        escape: { key: "Escape", code: "Escape", keyCode: 27 },
        esc: { key: "Escape", code: "Escape", keyCode: 27 },
        backspace: { key: "Backspace", code: "Backspace", keyCode: 8 },
        delete: { key: "Delete", code: "Delete", keyCode: 46 },
        arrowup: { key: "ArrowUp", code: "ArrowUp", keyCode: 38 },
        arrowdown: { key: "ArrowDown", code: "ArrowDown", keyCode: 40 },
        arrowleft: { key: "ArrowLeft", code: "ArrowLeft", keyCode: 37 },
        arrowright: { key: "ArrowRight", code: "ArrowRight", keyCode: 39 },
        home: { key: "Home", code: "Home", keyCode: 36 },
        end: { key: "End", code: "End", keyCode: 35 },
        pageup: { key: "PageUp", code: "PageUp", keyCode: 33 },
        pagedown: { key: "PageDown", code: "PageDown", keyCode: 34 },
        space: { key: " ", code: "Space", keyCode: 32 },
      };

      const keyLower = key.toLowerCase();
      let keyInfo = keyMap[keyLower];

      if (!keyInfo) {
        // Single character key
        if (key.length === 1) {
          const charCode = key.toUpperCase().charCodeAt(0);
          keyInfo = {
            key: key,
            code: `Key${key.toUpperCase()}`,
            keyCode: charCode,
          };
        } else {
          // Use key as-is
          keyInfo = { key: key, code: key, keyCode: 0 };
        }
      }

      // Send key down
      const keyDownParams = {
        type: "keyDown",
        modifiers,
        key: keyInfo.key,
        code: keyInfo.code,
        windowsVirtualKeyCode: keyInfo.keyCode,
      };
      logCdp(tabId, "key", "Input.dispatchKeyEvent", keyDownParams);
      await cdpCommander.sendCommand("Input.dispatchKeyEvent", keyDownParams);

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Send key up
      const keyUpParams = {
        type: "keyUp",
        modifiers: 0,
        key: keyInfo.key,
        code: keyInfo.code,
        windowsVirtualKeyCode: keyInfo.keyCode,
      };
      logCdp(tabId, "key", "Input.dispatchKeyEvent", keyUpParams);
      await cdpCommander.sendCommand("Input.dispatchKeyEvent", keyUpParams);

      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    await debuggerManager.safeDetachDebugger(tabId);

    return {
      success: true,
      message: `Successfully pressed key(s): "${keySequence}"`,
    };
  } catch (error) {
    await debuggerManager.safeDetachDebugger(tabId, true);
    return {
      success: false,
      error: `Key press failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Wait for specified duration
 */
async function performWait(duration: number): Promise<ComputerResult> {
  const waitMs = Math.min(Math.max(duration * 1000, 0), 60000); // Clamp to 0-60 seconds

  console.log(`⏳ [Computer] Waiting for ${waitMs}ms`);

  await new Promise((resolve) => setTimeout(resolve, waitMs));

  return {
    success: true,
    message: `Waited for ${duration} seconds`,
  };
}

/**
 * Scroll element into view using UID from snapshot
 */
async function performScrollTo(
  tabId: number,
  uid: string,
): Promise<ComputerResult> {
  console.log(`📜 [Computer] Scrolling to element with UID: ${uid}`);

  try {
    const result = await chrome.scripting.executeScript({
      target: { tabId },
      func: (uid: string) => {
        const element = document.querySelector(`[data-aipex-uid="${uid}"]`);
        if (!element) {
          return {
            success: false,
            error: `Element with UID "${uid}" not found`,
          };
        }
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        return { success: true };
      },
      args: [uid],
    });

    const scriptResult = result[0]?.result as
      | { success: boolean; error?: string }
      | undefined;
    if (scriptResult?.success) {
      return { success: true, message: `Scrolled to element with UID: ${uid}` };
    }
    return {
      success: false,
      error: scriptResult?.error || "Failed to scroll to element",
    };
  } catch (error) {
    return {
      success: false,
      error: `Scroll to failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Main computer action dispatcher
 */
export async function executeComputerAction(
  params: ComputerParams,
): Promise<ComputerResult> {
  const { action, tabId: providedTabId } = params;

  // Resolve tab ID
  const tabId = await resolveTabId(providedTabId);
  if (!tabId && action !== "wait") {
    return {
      success: false,
      error:
        "No accessible tab found. Please specify a valid tabId or ensure there is an active tab.",
    };
  }

  switch (action) {
    case "left_click":
      if (!params.coordinate || params.coordinate.length !== 2) {
        return {
          success: false,
          error: "coordinate parameter required for left_click action",
        };
      }
      return performClick(
        tabId!,
        params.coordinate[0],
        params.coordinate[1],
        "left",
        1,
      );

    case "right_click":
      if (!params.coordinate || params.coordinate.length !== 2) {
        return {
          success: false,
          error: "coordinate parameter required for right_click action",
        };
      }
      return performClick(
        tabId!,
        params.coordinate[0],
        params.coordinate[1],
        "right",
        1,
      );

    case "double_click":
      if (!params.coordinate || params.coordinate.length !== 2) {
        return {
          success: false,
          error: "coordinate parameter required for double_click action",
        };
      }
      return performClick(
        tabId!,
        params.coordinate[0],
        params.coordinate[1],
        "left",
        2,
      );

    case "triple_click":
      if (!params.coordinate || params.coordinate.length !== 2) {
        return {
          success: false,
          error: "coordinate parameter required for triple_click action",
        };
      }
      return performClick(
        tabId!,
        params.coordinate[0],
        params.coordinate[1],
        "left",
        3,
      );

    case "hover":
      if (!params.coordinate || params.coordinate.length !== 2) {
        return {
          success: false,
          error: "coordinate parameter required for hover action",
        };
      }
      return performHover(tabId!, params.coordinate[0], params.coordinate[1]);

    case "left_click_drag":
      if (!params.start_coordinate || params.start_coordinate.length !== 2) {
        return {
          success: false,
          error:
            "start_coordinate parameter required for left_click_drag action",
        };
      }
      if (!params.coordinate || params.coordinate.length !== 2) {
        return {
          success: false,
          error:
            "coordinate parameter required for left_click_drag action (end position)",
        };
      }
      return performDrag(
        tabId!,
        params.start_coordinate[0],
        params.start_coordinate[1],
        params.coordinate[0],
        params.coordinate[1],
      );

    case "scroll":
      if (!params.coordinate || params.coordinate.length !== 2) {
        return {
          success: false,
          error: "coordinate parameter required for scroll action",
        };
      }
      if (!params.scroll_direction) {
        return {
          success: false,
          error: "scroll_direction parameter required for scroll action",
        };
      }
      return performScroll(
        tabId!,
        params.coordinate[0],
        params.coordinate[1],
        params.scroll_direction,
        params.scroll_amount,
      );

    case "scroll_to":
      if (!params.uid) {
        return {
          success: false,
          error: "uid parameter required for scroll_to action",
        };
      }
      return performScrollTo(tabId!, params.uid);

    case "type":
      if (!params.text) {
        return {
          success: false,
          error: "text parameter required for type action",
        };
      }
      return performType(tabId!, params.text);

    case "key":
      if (!params.text) {
        return {
          success: false,
          error: "text parameter required for key action (the key(s) to press)",
        };
      }
      return performKey(tabId!, params.text);

    case "wait":
      return performWait(params.duration || 1);

    default:
      return {
        success: false,
        error: `Unknown action: ${action}`,
      };
  }
}

/**
 * Clear screenshot cache for a tab
 */
export function clearScreenshotCache(tabId?: number): void {
  if (tabId !== undefined) {
    screenshotCache.delete(tabId);
  } else {
    screenshotCache.clear();
  }
}

/**
 * Get cached screenshot metadata for a tab
 */
export function getScreenshotMetadata(
  tabId: number,
): ScreenshotMetadata | undefined {
  return screenshotCache.get(tabId);
}
