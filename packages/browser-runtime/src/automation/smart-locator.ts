import { CdpCommander } from "./cdp-commander";
import { debuggerManager } from "./debugger-manager";
import type { ElementHandle, Locator, TextSnapshotNode } from "./types";

type FrameTreeNode = {
  frame: { id: string };
  childFrames?: FrameTreeNode[];
};

type Rect = { x: number; y: number; width: number; height: number };

// Smart Locator implementation that uses node information to find elements
export class SmartLocator implements Locator {
  #cdpCommander: CdpCommander;
  #frameTreeInfo: {
    mainFrameId: string;
    parentByFrameId: Map<string, string | null>;
  } | null = null;
  #frameOwnerBackendNodeIdByFrameId = new Map<string, number>();
  constructor(
    private tabId: number,
    private node: TextSnapshotNode,
    private backendDOMNodeId: number,
  ) {
    this.#cdpCommander = new CdpCommander(tabId);
  }

  async fill(value: string): Promise<void> {
    const result = await this.executeInPage("fill", value);
    if (!result.success) {
      throw new Error(result.error || "Failed to fill element");
    }
  }

  async click(options: { count?: number } = {}): Promise<void> {
    const count = options.count || 1;
    const result = await this.executeInPage("click", count);
    if (!result.success) {
      throw new Error(result.error || "Failed to click element");
    }
  }

  async hover(): Promise<void> {
    const result = await this.executeInPage("hover");
    if (!result.success) {
      throw new Error(result.error || "Failed to hover element");
    }
  }

  /**
   * Get element bounding box (public method for external use)
   */
  async boundingBox(): Promise<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null> {
    try {
      const attached = await debuggerManager.safeAttachDebugger(this.tabId);
      if (!attached) return null;

      await this.ensureDOMEnabled();
      const box = await this.getElementBoundingBox();

      return box;
    } catch (_error) {
      return null;
    }
  }

  /**
   * Get editor value - supports Monaco Editor and standard inputs/textareas
   */
  async getEditorValue(): Promise<string | null> {
    try {
      const attached = await debuggerManager.safeAttachDebugger(this.tabId);
      if (!attached) return null;

      await this.ensureDOMEnabled();

      const remoteObject = await this.resolveNodeToRemoteObject(
        this.backendDOMNodeId,
      );
      if (!remoteObject?.object?.objectId) {
        return null;
      }

      const result = await this.#cdpCommander.sendCommand<{
        result?: { value?: string | null };
      }>("Runtime.callFunctionOn", {
        objectId: remoteObject.object.objectId,
        functionDeclaration: `function() {
          // Method 1: Try Monaco Editor
          const editorContainer = this.closest('.monaco-editor');
          if (editorContainer) {
            const editor = editorContainer.editor ||
                          editorContainer.__monaco_editor__ ||
                          editorContainer._editor;
            if (editor && typeof editor.getValue === 'function') {
              return editor.getValue();
            }
          }

          // Method 2: Try window.monaco.editor.getEditors()
          if (window.monaco && window.monaco.editor) {
            try {
              const editors = window.monaco.editor.getEditors();
              for (const editor of editors) {
                const domNode = editor.getDomNode();
                if (domNode && (domNode.contains(this) || domNode === this)) {
                  return editor.getValue();
                }
              }
            } catch (e) {
              // Ignore
            }
          }

          // Method 3: Try CodeMirror
          if (this.CodeMirror && typeof this.CodeMirror.getValue === 'function') {
            return this.CodeMirror.getValue();
          }

          const cmContainer = this.closest('.CodeMirror');
          if (cmContainer && cmContainer.CodeMirror) {
            return cmContainer.CodeMirror.getValue();
          }

          // Method 4: Try ACE Editor
          if (window.ace && this.closest('.ace_editor')) {
            try {
              const aceEditor = window.ace.edit(this);
              if (aceEditor) {
                return aceEditor.getValue();
              }
            } catch (e) {
              // Ignore
            }
          }

          // Method 5: Standard input/textarea
          if (this.value !== undefined) {
            return this.value;
          }

          // Method 6: contenteditable
          if (this.isContentEditable) {
            return this.textContent || this.innerText || '';
          }

          return null;
        }`,
        returnByValue: true,
      });

      return result?.result?.value || null;
    } catch (error) {
      console.error("❌ [SmartLocator] Failed to get editor value:", error);
      return null;
    }
  }

  dispose(): void {
    debuggerManager.safeDetachDebugger(this.tabId, true);
  }

  /**
   * Helper: Get element bounding box using CDP
   */
  private async getElementBoundingBox(): Promise<Rect | null> {
    try {
      const rect = await this.getTopLevelContentRectForBackendNode({
        backendNodeId: this.backendDOMNodeId,
        frameId: this.node.frameId,
      });

      if (!rect) {
        return null;
      }

      // Add temporary highlight on the element (in its own frame context)
      const isDev = Boolean(import.meta.env?.DEV);
      const remoteObject = await this.resolveNodeToRemoteObject(
        this.backendDOMNodeId,
      );
      const objectId = remoteObject?.object?.objectId;
      if (objectId) {
        await this.#cdpCommander
          .sendCommand("Runtime.callFunctionOn", {
            objectId,
            functionDeclaration: `function(isDev) {
              const el = this;
              if (!el || !el.style) return false;

              const originalStyles = {
                outline: el.style.outline,
                outlineOffset: el.style.outlineOffset,
                boxShadow: el.style.boxShadow,
                transition: el.style.transition,
              };

              if (!el.hasAttribute('data-aipex-highlighted')) {
                el.setAttribute('data-aipex-highlighted', 'true');
                el.style.outline = '3px solid #3b82f6';
                el.style.outlineOffset = '2px';
                el.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.2), 0 0 20px rgba(59, 130, 246, 0.4)';
                el.style.transition = 'all 0.2s ease-in-out';

                if (!isDev) {
                  setTimeout(() => {
                    el.removeAttribute('data-aipex-highlighted');
                    el.style.outline = originalStyles.outline;
                    el.style.outlineOffset = originalStyles.outlineOffset;
                    el.style.boxShadow = originalStyles.boxShadow;
                    el.style.transition = originalStyles.transition;
                  }, 10000);
                }
              }

              return true;
            }`,
            arguments: [{ value: isDev }],
            returnByValue: true,
          })
          .catch(() => {});

        await this.#cdpCommander
          .sendCommand("Runtime.releaseObject", { objectId })
          .catch(() => {});
      }

      return rect;
    } catch (_error) {
      return null;
    }
  }

  private async ensureFrameTreeInfo(): Promise<void> {
    if (this.#frameTreeInfo) {
      return;
    }

    const result = await this.#cdpCommander.sendCommand<{
      frameTree: FrameTreeNode;
    }>("Page.getFrameTree", {});

    const mainFrameId = result?.frameTree?.frame?.id;
    const parentByFrameId = new Map<string, string | null>();

    const walk = (node: FrameTreeNode, parentId: string | null): void => {
      const id = node.frame?.id;
      if (id) {
        parentByFrameId.set(id, parentId);
      }
      if (node.childFrames) {
        for (const child of node.childFrames) {
          walk(child, id ?? parentId);
        }
      }
    };

    if (result?.frameTree) {
      walk(result.frameTree, null);
    }

    this.#frameTreeInfo = {
      mainFrameId: mainFrameId || "",
      parentByFrameId,
    };
  }

  private async getFrameOwnerBackendNodeId(
    frameId: string,
  ): Promise<number | null> {
    const cached = this.#frameOwnerBackendNodeIdByFrameId.get(frameId);
    if (cached) {
      return cached;
    }

    try {
      const owner = await this.#cdpCommander.sendCommand<{
        backendNodeId?: number;
      }>("DOM.getFrameOwner", { frameId });
      if (owner?.backendNodeId) {
        this.#frameOwnerBackendNodeIdByFrameId.set(
          frameId,
          owner.backendNodeId,
        );
        return owner.backendNodeId;
      }
      return null;
    } catch {
      return null;
    }
  }

  private quadToRect(quad: number[]): Rect | null {
    if (!Array.isArray(quad) || quad.length < 8) {
      return null;
    }
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < 8; i += 2) {
      const x = quad[i];
      const y = quad[i + 1];
      if (typeof x !== "number" || typeof y !== "number") continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
      return null;
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  private unionRects(rects: Rect[]): Rect | null {
    if (rects.length === 0) {
      return null;
    }
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const r of rects) {
      minX = Math.min(minX, r.x);
      minY = Math.min(minY, r.y);
      maxX = Math.max(maxX, r.x + r.width);
      maxY = Math.max(maxY, r.y + r.height);
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  private async getBackendNodeContentRect(
    backendNodeId: number,
  ): Promise<Rect | null> {
    try {
      const quadsResult = await this.#cdpCommander.sendCommand<{
        quads?: number[][];
      }>("DOM.getContentQuads", { backendNodeId });

      const quads = quadsResult?.quads || [];
      const rects = quads
        .map((quad) => this.quadToRect(quad))
        .filter((r): r is Rect => Boolean(r));
      const quadRect = this.unionRects(rects);
      if (quadRect) {
        return quadRect;
      }
    } catch {
      // fall through to getBoxModel
    }

    try {
      const boxResult = await this.#cdpCommander.sendCommand<{
        model?: { content?: number[] };
      }>("DOM.getBoxModel", { backendNodeId });
      const contentQuad = boxResult?.model?.content;
      if (contentQuad) {
        return this.quadToRect(contentQuad);
      }
      return null;
    } catch {
      return null;
    }
  }

  private async getTopLevelContentRectForBackendNode(params: {
    backendNodeId: number;
    frameId?: string;
  }): Promise<Rect | null> {
    const base = await this.getBackendNodeContentRect(params.backendNodeId);
    if (!base) {
      return null;
    }

    const frameId = params.frameId;
    if (!frameId) {
      return base;
    }

    const baseCenter = {
      x: base.x + base.width / 2,
      y: base.y + base.height / 2,
    };
    const baseIsCovered = await this.isCoveredAtPoint(baseCenter);
    if (!baseIsCovered) {
      return base;
    }

    await this.ensureFrameTreeInfo();
    const mainFrameId = this.#frameTreeInfo?.mainFrameId;
    const parentByFrameId = this.#frameTreeInfo?.parentByFrameId;
    if (!mainFrameId || !parentByFrameId) {
      return base;
    }

    if (frameId === mainFrameId) {
      return base;
    }

    let offsetX = 0;
    let offsetY = 0;
    let currentFrameId: string | null = frameId;
    while (currentFrameId && currentFrameId !== mainFrameId) {
      const ownerBackendNodeId =
        await this.getFrameOwnerBackendNodeId(currentFrameId);
      if (!ownerBackendNodeId) {
        break;
      }

      const ownerRect =
        await this.getBackendNodeContentRect(ownerBackendNodeId);
      if (!ownerRect) {
        break;
      }

      offsetX += ownerRect.x;
      offsetY += ownerRect.y;
      currentFrameId = parentByFrameId.get(currentFrameId) ?? null;
    }

    if (offsetX === 0 && offsetY === 0) {
      return base;
    }

    return {
      x: base.x + offsetX,
      y: base.y + offsetY,
      width: base.width,
      height: base.height,
    };
  }

  /**
   * Helper: Ensure DOM domain is enabled
   */
  private async ensureDOMEnabled(): Promise<void> {
    await this.#cdpCommander.sendCommand("DOM.enable", {});
  }

  /**
   * Helper: Resolve backendDOMNodeId to RemoteObject
   */
  private async resolveNodeToRemoteObject(
    backendDOMNodeId: number,
  ): Promise<any> {
    return this.#cdpCommander.sendCommand("DOM.resolveNode", {
      backendNodeId: backendDOMNodeId,
    });
  }

  /**
   * Helper: Scroll to element
   */
  private async scrollToElement(backendNodeId: number): Promise<void> {
    await this.#cdpCommander.sendCommand("DOM.scrollIntoViewIfNeeded", {
      backendNodeId,
    });
  }

  /**
   * Execute action using CDP (Chrome DevTools Protocol) for realistic interactions
   * Includes a global timeout to prevent indefinite hanging
   */
  private async executeInPage(
    action: string,
    ...args: any[]
  ): Promise<{ success: boolean; error?: string }> {
    // Global timeout for the entire operation (30 seconds)
    const GLOBAL_TIMEOUT = 30000;

    const timeoutPromise = new Promise<{ success: boolean; error: string }>(
      (resolve) => {
        setTimeout(() => {
          resolve({
            success: false,
            error: `Operation '${action}' timed out after ${GLOBAL_TIMEOUT}ms`,
          });
        }, GLOBAL_TIMEOUT);
      },
    );

    const operationPromise = this.executeInPageInternal(action, ...args);

    // Race between operation and timeout
    return Promise.race([operationPromise, timeoutPromise]);
  }

  /**
   * Internal implementation of executeInPage without timeout
   */
  private async executeInPageInternal(
    action: string,
    ...args: any[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Attach debugger and enable necessary domains
      const attached = await debuggerManager.safeAttachDebugger(this.tabId);
      if (!attached) {
        return { success: false, error: "Failed to attach debugger" };
      }

      // Enable DOM domain (Input domain doesn't need explicit enable)
      await this.ensureDOMEnabled();

      await this.scrollToElement(this.backendDOMNodeId);

      // Execute action based on type
      switch (action) {
        case "click":
          return await this.executeClickViaCDP(args[0] || 1);
        case "fill":
          return await this.executeFillViaCDP(args[0]);
        case "hover":
          return await this.executeHoverViaCDP();
        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (error) {
      return {
        success: false,
        error: `CDP execution error: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Execute click action using CDP
   */
  private async executeClickViaCDP(
    count: number = 1,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const box = await this.getElementBoundingBox();
      if (!box) {
        // Degrade: still try to click via JS on the resolved node
        const jsClick = await this.clickViaJS(count);
        return jsClick;
      }
      if (box.width === 0 || box.height === 0) {
        return {
          success: false,
          error: "Element not visible or has zero size",
        };
      }

      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;

      for (let i = 0; i < count; i++) {
        const isCovered = await this.isCoveredAtPoint({ x, y });
        if (isCovered) {
          const jsClick = await this.clickViaJS(1);
          if (!jsClick.success) {
            return jsClick;
          }
          continue;
        }

        await this.#cdpCommander.sendCommand("Input.dispatchMouseEvent", {
          type: "mousePressed",
          x,
          y,
          button: "left",
          clickCount: 1,
        });
        await new Promise((resolve) => setTimeout(resolve, 50));
        await this.#cdpCommander.sendCommand("Input.dispatchMouseEvent", {
          type: "mouseReleased",
          x,
          y,
          button: "left",
          clickCount: 1,
        });

        if (i < count - 1) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Click failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  private async clickViaJS(
    count: number,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const remoteObject = await this.resolveNodeToRemoteObject(
        this.backendDOMNodeId,
      );
      const objectId = remoteObject?.object?.objectId;
      if (!objectId) {
        return { success: false, error: "Element not found" };
      }

      await this.#cdpCommander.sendCommand("Runtime.callFunctionOn", {
        objectId,
        functionDeclaration: `function(count) {
          const el = this;
          if (!el) return false;
          for (let i = 0; i < count; i++) {
            el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
            if (typeof el.click === 'function') {
              try { el.click(); } catch {}
            }
          }
          return true;
        }`,
        arguments: [{ value: count }],
        returnByValue: true,
      });

      await this.#cdpCommander
        .sendCommand("Runtime.releaseObject", { objectId })
        .catch(() => {});

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Click failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  private async isCoveredAtPoint(params: {
    x: number;
    y: number;
  }): Promise<boolean> {
    try {
      const expectedFrameId = this.node.frameId;

      const hit = await this.#cdpCommander.sendCommand<{
        backendNodeId: number;
        frameId: string;
      }>("DOM.getNodeForLocation", {
        x: Math.round(params.x),
        y: Math.round(params.y),
        includeUserAgentShadowDOM: true,
        ignorePointerEventsNone: true,
      });

      if (expectedFrameId && hit?.frameId && hit.frameId !== expectedFrameId) {
        return true;
      }

      // If we can resolve both nodes in the same frame, check containment
      const targetRemote = await this.resolveNodeToRemoteObject(
        this.backendDOMNodeId,
      );
      const targetObjectId = targetRemote?.object?.objectId;
      if (!targetObjectId) {
        return true;
      }

      const hitRemote = await this.resolveNodeToRemoteObject(hit.backendNodeId);
      const hitObjectId = hitRemote?.object?.objectId;
      if (!hitObjectId) {
        await this.#cdpCommander
          .sendCommand("Runtime.releaseObject", { objectId: targetObjectId })
          .catch(() => {});
        return false;
      }

      const contains = await this.#cdpCommander.sendCommand<{
        result?: { value?: boolean };
      }>("Runtime.callFunctionOn", {
        objectId: targetObjectId,
        functionDeclaration: `function(topEl) {
          if (!topEl) return false;
          if (this === topEl) return true;
          if (this && typeof this.contains === 'function') {
            return this.contains(topEl);
          }
          return false;
        }`,
        arguments: [{ objectId: hitObjectId }],
        returnByValue: true,
      });

      await this.#cdpCommander
        .sendCommand("Runtime.releaseObject", { objectId: hitObjectId })
        .catch(() => {});
      await this.#cdpCommander
        .sendCommand("Runtime.releaseObject", { objectId: targetObjectId })
        .catch(() => {});

      return contains?.result?.value !== true;
    } catch {
      // If we cannot reliably determine, prefer safety (covered => JS click fallback)
      return true;
    }
  }

  /**
   * Add highlight to element during operation
   */
  private async addHighlightToElement(objectId: string): Promise<void> {
    try {
      await this.#cdpCommander.sendCommand("Runtime.callFunctionOn", {
        objectId,
        functionDeclaration: `function() {
          // Find editor container (Monaco or the element itself)
          const container = this.closest('.monaco-editor') || this;

          // Store original styles
          if (!container._aipexOriginalStyles) {
            container._aipexOriginalStyles = {
              outline: container.style.outline,
              outlineOffset: container.style.outlineOffset,
              transition: container.style.transition
            };
          }

          // Add highlight effect
          container.style.transition = 'outline 0.2s ease';
          container.style.outline = '3px solid #3B82F6';
          container.style.outlineOffset = '2px';
        }`,
        returnByValue: false,
      });
    } catch (error) {
      console.warn("Failed to add highlight:", error);
    }
  }

  /**
   * Remove highlight from element
   */
  private async removeHighlightFromElement(objectId: string): Promise<void> {
    try {
      await this.#cdpCommander.sendCommand("Runtime.callFunctionOn", {
        objectId,
        functionDeclaration: `function() {
          const container = this.closest('.monaco-editor') || this;

          // Restore original styles
          if (container._aipexOriginalStyles) {
            container.style.outline = container._aipexOriginalStyles.outline;
            container.style.outlineOffset = container._aipexOriginalStyles.outlineOffset;
            container.style.transition = container._aipexOriginalStyles.transition;
            delete container._aipexOriginalStyles;
          }
        }`,
        returnByValue: false,
      });

      // Schedule cleanup after animation
      setTimeout(() => {
        this.#cdpCommander
          .sendCommand("Runtime.releaseObject", { objectId })
          .catch(() => {});
      }, 300);
    } catch (error) {
      console.warn("Failed to remove highlight:", error);
    }
  }

  /**
   * Try to fill Monaco Editor using native API
   */
  private async tryFillMonaco(
    objectId: string,
    value: string,
  ): Promise<boolean> {
    try {
      const result = await this.#cdpCommander.sendCommand<{
        result?: { value?: boolean };
      }>("Runtime.callFunctionOn", {
        objectId,
        functionDeclaration: `function(value) {
          // Method 1: Check if element or ancestor has monaco-editor class
          const editorContainer = this.closest('.monaco-editor');
          if (editorContainer) {
            // Try to get editor instance from various possible properties
            const editor = editorContainer.editor ||
                          editorContainer.__monaco_editor__ ||
                          editorContainer._editor;
            if (editor && typeof editor.setValue === 'function') {
              editor.setValue(value);
              return true;
            }
          }

          // Method 2: If window.monaco exists, try to find editor by DOM node
          if (window.monaco && window.monaco.editor) {
            try {
              const editors = window.monaco.editor.getEditors();
              for (const editor of editors) {
                const domNode = editor.getDomNode();
                if (domNode && (domNode.contains(this) || domNode === this)) {
                  editor.setValue(value);
                  return true;
                }
              }
            } catch (e) {
              // monaco.editor.getEditors() might not exist in all versions
            }
          }

          // Method 3: Try to find Monaco instance on the element itself
          if (this._editor && typeof this._editor.setValue === 'function') {
            this._editor.setValue(value);
            return true;
          }

          return false;
        }`,
        arguments: [{ value }],
        returnByValue: true,
      });

      return result?.result?.value === true;
    } catch (error) {
      console.warn("Monaco fill attempt failed:", error);
      return false;
    }
  }

  /**
   * Fill using select-all + replace strategy (universal fallback)
   */
  private async fillUsingSelectAll(value: string): Promise<void> {
    // Step 1: Focus the element
    console.log("📍 [SmartLocator] Focusing element...");
    await this.#cdpCommander.sendCommand("DOM.focus", {
      backendNodeId: this.backendDOMNodeId,
    });
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Step 2: Detect platform for modifier key
    const platformResult = await this.#cdpCommander.sendCommand<{
      result?: { value?: boolean };
    }>("Runtime.evaluate", {
      expression: 'navigator.platform.toUpperCase().indexOf("MAC") >= 0',
      returnByValue: true,
    });
    const isMac = platformResult?.result?.value === true;
    const modifiers = isMac ? 8 : 2; // Meta = 8 (Cmd), Control = 2 (Ctrl)

    // Step 3: Send Ctrl+A / Cmd+A to select all
    console.log(
      `⌨️  [SmartLocator] Pressing ${isMac ? "Cmd" : "Ctrl"}+A to select all...`,
    );

    // Press modifier key (Ctrl or Cmd)
    await this.#cdpCommander.sendCommand("Input.dispatchKeyEvent", {
      type: "keyDown",
      modifiers,
      key: isMac ? "Meta" : "Control",
      code: isMac ? "MetaLeft" : "ControlLeft",
      windowsVirtualKeyCode: isMac ? 91 : 17,
    });
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Press 'A' key
    await this.#cdpCommander.sendCommand("Input.dispatchKeyEvent", {
      type: "keyDown",
      modifiers,
      key: "a",
      code: "KeyA",
      windowsVirtualKeyCode: 65,
    });
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Release 'A' key
    await this.#cdpCommander.sendCommand("Input.dispatchKeyEvent", {
      type: "keyUp",
      modifiers,
      key: "a",
      code: "KeyA",
      windowsVirtualKeyCode: 65,
    });
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Release modifier key
    await this.#cdpCommander.sendCommand("Input.dispatchKeyEvent", {
      type: "keyUp",
      modifiers: 0,
      key: isMac ? "Meta" : "Control",
      code: isMac ? "MetaLeft" : "ControlLeft",
      windowsVirtualKeyCode: isMac ? 91 : 17,
    });

    // Step 4: Wait for selection to complete
    console.log("⏳ [SmartLocator] Waiting for selection...");
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Step 5: Insert text (will replace selected content)
    console.log("✍️  [SmartLocator] Inserting new text...");
    await this.#cdpCommander.sendCommand("Input.insertText", { text: value });
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Step 6: Trigger change and blur events
    console.log("🔔 [SmartLocator] Triggering events...");
    const remoteObject = await this.resolveNodeToRemoteObject(
      this.backendDOMNodeId,
    );
    if (remoteObject?.object?.objectId) {
      await this.#cdpCommander.sendCommand("Runtime.callFunctionOn", {
        objectId: remoteObject.object.objectId,
        functionDeclaration: `function() {
          this.dispatchEvent(new Event('input', { bubbles: true }));
              this.dispatchEvent(new Event('change', { bubbles: true }));
              this.dispatchEvent(new Event('blur', { bubbles: true }));
            }`,
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  /**
   * Execute fill action using CDP with Monaco detection and visual feedback
   */
  private async executeFillViaCDP(
    value: string,
  ): Promise<{ success: boolean; error?: string }> {
    let objectId: string | null = null;

    try {
      console.log("🔍 [SmartLocator] Starting fill operation...");
      console.log(
        `📝 [SmartLocator] Target value length: ${value.length} characters`,
      );

      // Step 1: Get element remote object
      const remoteObject = await this.resolveNodeToRemoteObject(
        this.backendDOMNodeId,
      );
      if (!remoteObject?.object?.objectId) {
        throw new Error("Failed to resolve element");
      }
      objectId = remoteObject.object.objectId;
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Step 2: Add visual highlight
      console.log("✨ [SmartLocator] Adding highlight effect...");
      await this.addHighlightToElement(objectId!);
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 3: Try Monaco Editor native API first
      console.log("🎯 [SmartLocator] Attempting Monaco native fill...");
      const monacoSuccess = await this.tryFillMonaco(objectId!, value);

      if (monacoSuccess) {
        console.log("✅ [SmartLocator] Monaco fill successful!");
        await new Promise((resolve) => setTimeout(resolve, 500));
        console.log("🧹 [SmartLocator] Removing highlight...");
        await this.removeHighlightFromElement(objectId!);
        return { success: true };
      }

      // Step 4: Fallback to universal select-all + replace strategy
      console.log(
        "🔄 [SmartLocator] Monaco not detected, using universal fill...",
      );
      await new Promise((resolve) => setTimeout(resolve, 300));
      await this.fillUsingSelectAll(value);

      console.log("✅ [SmartLocator] Universal fill successful!");
      await new Promise((resolve) => setTimeout(resolve, 500));
      console.log("🧹 [SmartLocator] Removing highlight...");
      await this.removeHighlightFromElement(objectId!);

      return { success: true };
    } catch (error) {
      console.error("❌ [SmartLocator] Fill failed:", error);

      // Try to remove highlight even on error
      if (objectId) {
        await this.removeHighlightFromElement(objectId).catch(() => {});
      }

      return {
        success: false,
        error: `Fill failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Execute hover action using CDP
   */
  private async executeHoverViaCDP(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const box = await this.getElementBoundingBox();
      if (!box) {
        // Degrade: dispatch hover-ish events via JS
        return await this.hoverViaJS();
      }
      if (box.width === 0 || box.height === 0) {
        return {
          success: false,
          error: "Element not visible or has zero size",
        };
      }

      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;

      await this.#cdpCommander.sendCommand("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x,
        y,
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Hover failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  private async hoverViaJS(): Promise<{ success: boolean; error?: string }> {
    try {
      const remoteObject = await this.resolveNodeToRemoteObject(
        this.backendDOMNodeId,
      );
      const objectId = remoteObject?.object?.objectId;
      if (!objectId) {
        return { success: false, error: "Element not found" };
      }

      await this.#cdpCommander.sendCommand("Runtime.callFunctionOn", {
        objectId,
        functionDeclaration: `function() {
          const el = this;
          if (!el) return false;
          try {
            el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true, view: window }));
            el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false, cancelable: true, view: window }));
            el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true, view: window }));
          } catch {}
          return true;
        }`,
        returnByValue: true,
      });

      await this.#cdpCommander
        .sendCommand("Runtime.releaseObject", { objectId })
        .catch(() => {});

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Hover failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }
}

// Smart ElementHandle implementation
export class SmartElementHandle implements ElementHandle {
  private locator: Locator;

  constructor(tabId: number, node: TextSnapshotNode, backendDOMNodeId: number) {
    this.locator = new SmartLocator(tabId, node, backendDOMNodeId);
  }

  asLocator(): Locator {
    return this.locator;
  }

  dispose(): void {
    this.locator.dispose();
  }
}
