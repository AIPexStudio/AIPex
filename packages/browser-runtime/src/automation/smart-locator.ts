/**
 * Smart Locator
 *
 * Element interaction using CDP for reliable browser automation
 */

import { CdpCommander } from "./cdp-commander";
import { debuggerManager } from "./debugger-manager";
import type { ElementHandle, Locator, TextSnapshotNode } from "./types";

export class SmartLocator implements Locator {
  #cdpCommander: CdpCommander;

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
      const box = await this.getElementBoundingBox(this.node.id);

      return box;
    } catch {
      return null;
    }
  }

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
        result?: { value?: string };
      }>("Runtime.callFunctionOn", {
        objectId: remoteObject.object.objectId,
        functionDeclaration: `function() {
          const editorContainer = this.closest('.monaco-editor');
          if (editorContainer) {
            const editor = editorContainer.editor ||
                          editorContainer.__monaco_editor__ ||
                          editorContainer._editor;
            if (editor && typeof editor.getValue === 'function') {
              return editor.getValue();
            }
          }

          if (window.monaco && window.monaco.editor) {
            try {
              const editors = window.monaco.editor.getEditors();
              for (const editor of editors) {
                const domNode = editor.getDomNode();
                if (domNode && (domNode.contains(this) || domNode === this)) {
                  return editor.getValue();
                }
              }
            } catch (e) {}
          }

          if (this.CodeMirror && typeof this.CodeMirror.getValue === 'function') {
            return this.CodeMirror.getValue();
          }

          const cmContainer = this.closest('.CodeMirror');
          if (cmContainer && cmContainer.CodeMirror) {
            return cmContainer.CodeMirror.getValue();
          }

          if (window.ace && this.closest('.ace_editor')) {
            try {
              const aceEditor = window.ace.edit(this);
              if (aceEditor) {
                return aceEditor.getValue();
              }
            } catch (e) {}
          }

          if (this.value !== undefined) {
            return this.value;
          }

          if (this.isContentEditable) {
            return this.textContent || this.innerText || '';
          }

          return null;
        }`,
        returnByValue: true,
      });

      return result?.result?.value || null;
    } catch {
      return null;
    }
  }

  dispose(): void {
    debuggerManager.safeDetachDebugger(this.tabId, true);
  }

  private async getElementBoundingBox(nodeId: string): Promise<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null> {
    try {
      const boxResult = await this.#cdpCommander.sendCommand<{
        result: {
          value: { x: number; y: number; width: number; height: number };
        };
      }>("Runtime.evaluate", {
        expression: `
        (function() {
          const el = document.querySelector("[data-aipex-nodeid='${nodeId}']");
          if (!el) return null;

          const rect = el.getBoundingClientRect();

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

            setTimeout(() => {
              el.removeAttribute('data-aipex-highlighted');
              el.style.outline = originalStyles.outline;
              el.style.outlineOffset = originalStyles.outlineOffset;
              el.style.boxShadow = originalStyles.boxShadow;
              el.style.transition = originalStyles.transition;
            }, 10000);
          }

          return {
              x: rect.left,
              y: rect.top,
              width: rect.width,
              height: rect.height,
              left: rect.left,
              top: rect.top
            };
        })()
      `,
        returnByValue: true,
      });

      if (boxResult?.result?.value) {
        return boxResult.result.value;
      }

      return null;
    } catch {
      return null;
    }
  }

  private async ensureDOMEnabled(): Promise<void> {
    await this.#cdpCommander.sendCommand("DOM.enable", {});
  }

  private async resolveNodeToRemoteObject(
    backendDOMNodeId: number,
  ): Promise<{ object?: { objectId?: string } } | null> {
    return this.#cdpCommander.sendCommand("DOM.resolveNode", {
      backendNodeId: backendDOMNodeId,
    });
  }

  private async scrollToElement(backendNodeId: number): Promise<void> {
    await this.#cdpCommander.sendCommand("DOM.scrollIntoViewIfNeeded", {
      backendNodeId,
    });
  }

  private async executeInPage(
    action: string,
    ...args: unknown[]
  ): Promise<{ success: boolean; error?: string }> {
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

    return Promise.race([operationPromise, timeoutPromise]);
  }

  private async executeInPageInternal(
    action: string,
    ...args: unknown[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const attached = await debuggerManager.safeAttachDebugger(this.tabId);
      if (!attached) {
        return { success: false, error: "Failed to attach debugger" };
      }

      await this.ensureDOMEnabled();
      await this.scrollToElement(this.backendDOMNodeId);

      switch (action) {
        case "click":
          return await this.executeClickViaCDP((args[0] as number) || 1);
        case "fill":
          return await this.executeFillViaCDP(args[0] as string);
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

  private async executeClickViaCDP(
    count: number = 1,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const elementId = this.node.id;
      const box = await this.getElementBoundingBox(elementId);
      if (!box || box.width === 0 || box.height === 0) {
        return {
          success: false,
          error: "Element not visible or has zero size",
        };
      }

      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;

      for (let i = 0; i < count; i++) {
        const { result } = await this.#cdpCommander.sendCommand<{
          result: {
            value: {
              found: boolean;
              isCovered: boolean;
              topTag: string | null;
            };
          };
        }>("Runtime.evaluate", {
          expression: `
      (function() {
        const el = document.querySelector("[data-aipex-nodeid='${elementId}']");
        if (!el) return { found: false };
        const topEl = document.elementFromPoint(${x}, ${y});
        return {
          found: true,
          isCovered: topEl !== el && !el.contains(topEl),
          topTag: topEl ? topEl.tagName : null
        };
      })()
    `,
          returnByValue: true,
        });

        const info = result.value;
        if (!info?.found) {
          return { success: false, error: "Element not found" };
        }

        if (info.isCovered) {
          await this.#cdpCommander.sendCommand("Runtime.evaluate", {
            expression: `
        (function() {
          const el = document.querySelector("[data-aipex-nodeid='${elementId}']");
          if (!el) return false;
          el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
          return true;
        })()
      `,
            returnByValue: true,
          });
          return { success: true };
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
          const editorContainer = this.closest('.monaco-editor');
          if (editorContainer) {
            const editor = editorContainer.editor ||
                          editorContainer.__monaco_editor__ ||
                          editorContainer._editor;
            if (editor && typeof editor.setValue === 'function') {
              editor.setValue(value);
              return true;
            }
          }

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
            } catch (e) {}
          }

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
    } catch {
      return false;
    }
  }

  private async fillUsingSelectAll(value: string): Promise<void> {
    await this.#cdpCommander.sendCommand("DOM.focus", {
      backendNodeId: this.backendDOMNodeId,
    });
    await new Promise((resolve) => setTimeout(resolve, 300));

    const platformResult = await this.#cdpCommander.sendCommand<{
      result?: { value?: boolean };
    }>("Runtime.evaluate", {
      expression: 'navigator.platform.toUpperCase().indexOf("MAC") >= 0',
      returnByValue: true,
    });
    const isMac = platformResult?.result?.value === true;
    const modifiers = isMac ? 8 : 2;

    await this.#cdpCommander.sendCommand("Input.dispatchKeyEvent", {
      type: "keyDown",
      modifiers,
      key: isMac ? "Meta" : "Control",
      code: isMac ? "MetaLeft" : "ControlLeft",
      windowsVirtualKeyCode: isMac ? 91 : 17,
    });
    await new Promise((resolve) => setTimeout(resolve, 100));

    await this.#cdpCommander.sendCommand("Input.dispatchKeyEvent", {
      type: "keyDown",
      modifiers,
      key: "a",
      code: "KeyA",
      windowsVirtualKeyCode: 65,
    });
    await new Promise((resolve) => setTimeout(resolve, 100));

    await this.#cdpCommander.sendCommand("Input.dispatchKeyEvent", {
      type: "keyUp",
      modifiers,
      key: "a",
      code: "KeyA",
      windowsVirtualKeyCode: 65,
    });
    await new Promise((resolve) => setTimeout(resolve, 100));

    await this.#cdpCommander.sendCommand("Input.dispatchKeyEvent", {
      type: "keyUp",
      modifiers: 0,
      key: isMac ? "Meta" : "Control",
      code: isMac ? "MetaLeft" : "ControlLeft",
      windowsVirtualKeyCode: isMac ? 91 : 17,
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    await this.#cdpCommander.sendCommand("Input.insertText", { text: value });
    await new Promise((resolve) => setTimeout(resolve, 300));

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

  private async executeFillViaCDP(
    value: string,
  ): Promise<{ success: boolean; error?: string }> {
    let objectId: string | null = null;

    try {
      const remoteObject = await this.resolveNodeToRemoteObject(
        this.backendDOMNodeId,
      );
      if (!remoteObject?.object?.objectId) {
        throw new Error("Failed to resolve element");
      }
      objectId = remoteObject.object.objectId;
      await new Promise((resolve) => setTimeout(resolve, 200));

      const monacoSuccess = await this.tryFillMonaco(objectId!, value);

      if (monacoSuccess) {
        return { success: true };
      }

      await new Promise((resolve) => setTimeout(resolve, 300));
      await this.fillUsingSelectAll(value);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Fill failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  private async executeHoverViaCDP(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const box = await this.getElementBoundingBox(this.node.id);
      if (!box || box.width === 0 || box.height === 0) {
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
}

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
