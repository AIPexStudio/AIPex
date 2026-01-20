/**
 * DOM Locator - Pure DOM-based element operations
 *
 * Uses chrome.scripting.executeScript to interact with elements by UID
 * No CDP/debugger required - suitable for background mode
 */

interface ClickOptions {
  count?: number;
  highlight?: boolean;
  scroll?: boolean;
}

interface FillOptions {
  value: string;
  commit?: boolean;
  highlight?: boolean;
  scroll?: boolean;
}

interface HoverOptions {
  highlight?: boolean;
  scroll?: boolean;
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DomActionResponse<T = void> {
  success: boolean;
  error?: string;
  data?: T;
}

type DomActionPayload =
  | ({ action: "click"; uid: string } & ClickOptions)
  | ({ action: "fill"; uid: string } & FillOptions)
  | ({ action: "hover"; uid: string } & HoverOptions)
  | { action: "bounding-box"; uid: string }
  | { action: "value"; uid: string }
  | { action: "editor-value"; uid: string };

export class DomLocator {
  constructor(private tabId: number) {}

  async click(uid: string, options?: ClickOptions): Promise<DomActionResponse> {
    return this.executeInPage({ action: "click", uid, ...options });
  }

  async fill(uid: string, options: FillOptions): Promise<DomActionResponse> {
    return this.executeInPage({ action: "fill", uid, ...options });
  }

  async hover(uid: string, options?: HoverOptions): Promise<DomActionResponse> {
    return this.executeInPage({ action: "hover", uid, ...options });
  }

  async boundingBox(
    uid: string,
  ): Promise<DomActionResponse<BoundingBox | null>> {
    return this.executeInPage({ action: "bounding-box", uid });
  }

  async value(uid: string): Promise<DomActionResponse<string | null>> {
    return this.executeInPage({ action: "value", uid });
  }

  async editorValue(uid: string): Promise<DomActionResponse<string | null>> {
    return this.executeInPage({ action: "editor-value", uid });
  }

  private async executeInPage<T = void>(
    payload: DomActionPayload,
  ): Promise<DomActionResponse<T>> {
    if (typeof chrome === "undefined" || !chrome.scripting?.executeScript) {
      return { success: false, error: "chrome.scripting API unavailable." };
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: this.tabId },
      func: runDomAction,
      args: [payload],
    });

    const [injectionResult] = results;
    const response =
      (injectionResult?.result as DomActionResponse<T> | undefined) ?? null;
    return response || { success: false, error: "No result from dom action." };
  }
}

/**
 * This function is injected into the user's page via chrome.scripting.executeScript.
 * All helper functions must be defined INSIDE this function to be available at runtime.
 */
function runDomAction(payload: DomActionPayload): DomActionResponse<any> {
  // Helper: escape CSS selector values
  const cssEscape = (value: string): string => {
    if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
      return CSS.escape(value);
    }
    return value.replace(/"/g, '\\"');
  };

  // Helper: query element by uid attribute
  const queryByUid = (uid: string): Element | null => {
    const selector = `[data-aipex-nodeid="${cssEscape(uid)}"]`;
    return document.querySelector(selector);
  };

  // Helper: highlight element temporarily
  const highlight = (element: HTMLElement): void => {
    const originalOutline = element.style.outline;
    const originalOffset = element.style.outlineOffset;
    element.style.outline = "3px solid #3b82f6";
    element.style.outlineOffset = "2px";
    setTimeout(() => {
      element.style.outline = originalOutline;
      element.style.outlineOffset = originalOffset;
    }, 1500);
  };

  // Helper: prepare element (scroll into view, highlight)
  const prepareElement = (
    element: Element,
    options?: { highlight?: boolean; scroll?: boolean },
  ): void => {
    if (!(element instanceof HTMLElement)) return;
    if (options?.scroll !== false) {
      element.scrollIntoView({
        block: "center",
        inline: "center",
        behavior: "smooth",
      });
    }
    if (options?.highlight) {
      highlight(element);
    }
  };

  // Action: click element
  const clickElement = (
    element: Element,
    options: ClickOptions & { uid?: string },
  ): DomActionResponse => {
    if (!(element instanceof HTMLElement)) {
      return { success: false, error: "Target is not an HTMLElement." };
    }

    prepareElement(element, options);

    const count = options.count ?? 1;
    for (let i = 0; i < count; i++) {
      element.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
      );
      element.dispatchEvent(
        new MouseEvent("mouseup", { bubbles: true, cancelable: true }),
      );
      element.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
    }

    return { success: true };
  };

  // Action: fill element with value
  const fillElement = (
    element: Element,
    options: FillOptions,
  ): DomActionResponse => {
    if (
      !(element instanceof HTMLInputElement) &&
      !(element instanceof HTMLTextAreaElement)
    ) {
      return { success: false, error: "Element is not an input or textarea." };
    }

    prepareElement(element, options);

    // Clear existing value
    element.value = "";

    // Dispatch input events to trigger listeners
    element.dispatchEvent(new Event("focus", { bubbles: true }));
    element.value = options.value;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));

    if (options.commit !== false) {
      element.dispatchEvent(new Event("blur", { bubbles: true }));
    }

    return { success: true };
  };

  // Action: hover over element
  const hoverElement = (
    element: Element,
    options: HoverOptions,
  ): DomActionResponse => {
    if (!(element instanceof HTMLElement)) {
      return { success: false, error: "Target is not an HTMLElement." };
    }

    prepareElement(element, options);

    element.dispatchEvent(
      new MouseEvent("mouseover", { bubbles: true, cancelable: true }),
    );
    element.dispatchEvent(
      new MouseEvent("mouseenter", { bubbles: true, cancelable: true }),
    );

    return { success: true };
  };

  // Action: get bounding box
  const getBoundingBox = (element: Element): DomActionResponse<BoundingBox> => {
    if (!(element instanceof HTMLElement)) {
      return { success: false, error: "Target is not an HTMLElement." };
    }

    const rect = element.getBoundingClientRect();
    return {
      success: true,
      data: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      },
    };
  };

  // Action: get value
  const getValue = (element: Element): DomActionResponse<string> => {
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement
    ) {
      return { success: true, data: element.value };
    }
    return { success: false, error: "Element does not have a value property." };
  };

  // Action: get editor value (Monaco, CodeMirror, ACE, or standard inputs)
  const getEditorValue = (element: Element): DomActionResponse<string> => {
    // First try standard input/textarea
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement
    ) {
      return { success: true, data: element.value };
    }

    // Try Monaco Editor
    try {
      const monacoEditor = (element as any).__MONACO_EDITOR__;
      if (monacoEditor && typeof monacoEditor.getValue === "function") {
        return { success: true, data: monacoEditor.getValue() };
      }
    } catch (_e) {
      // Ignore
    }

    // Try CodeMirror
    try {
      const codeMirror = (element as any).CodeMirror;
      if (codeMirror && typeof codeMirror.getValue === "function") {
        return { success: true, data: codeMirror.getValue() };
      }
    } catch (_e) {
      // Ignore
    }

    // Try ACE Editor
    try {
      const aceEditor = (window as any).ace?.edit(element);
      if (aceEditor && typeof aceEditor.getValue === "function") {
        return { success: true, data: aceEditor.getValue() };
      }
    } catch (_e) {
      // Ignore
    }

    return {
      success: false,
      error: "Element is not a recognized editor or input.",
    };
  };

  // Main dispatcher
  try {
    const element = queryByUid(payload.uid);
    if (!element) {
      return {
        success: false,
        error: `Element with UID "${payload.uid}" not found. The page may have changed.`,
      };
    }

    switch (payload.action) {
      case "click":
        return clickElement(element, payload);
      case "fill":
        return fillElement(element, payload);
      case "hover":
        return hoverElement(element, payload);
      case "bounding-box":
        return getBoundingBox(element);
      case "value":
        return getValue(element);
      case "editor-value":
        return getEditorValue(element);
      default:
        return {
          success: false,
          error: `Unknown action: ${(payload as any).action}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown error in DOM action",
    };
  }
}
