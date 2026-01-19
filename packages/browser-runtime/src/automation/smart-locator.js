import { CdpCommander } from "./cdp-commander";
import { debuggerManager } from "./debugger-manager";
// Smart Locator implementation that uses node information to find elements
export class SmartLocator {
    tabId;
    node;
    backendDOMNodeId;
    #cdpCommander;
    constructor(tabId, node, backendDOMNodeId) {
        this.tabId = tabId;
        this.node = node;
        this.backendDOMNodeId = backendDOMNodeId;
        this.#cdpCommander = new CdpCommander(tabId);
    }
    async fill(value) {
        const result = await this.executeInPage("fill", value);
        if (!result.success) {
            throw new Error(result.error || "Failed to fill element");
        }
    }
    async click(options = {}) {
        const count = options.count || 1;
        const result = await this.executeInPage("click", count);
        if (!result.success) {
            throw new Error(result.error || "Failed to click element");
        }
    }
    async hover() {
        const result = await this.executeInPage("hover");
        if (!result.success) {
            throw new Error(result.error || "Failed to hover element");
        }
    }
    /**
     * Get element bounding box (public method for external use)
     */
    async boundingBox() {
        try {
            const attached = await debuggerManager.safeAttachDebugger(this.tabId);
            if (!attached)
                return null;
            await this.ensureDOMEnabled();
            const box = await this.getElementBoundingBox(this.node.id);
            return box;
        }
        catch (_error) {
            return null;
        }
    }
    /**
     * Get editor value - supports Monaco Editor and standard inputs/textareas
     */
    async getEditorValue() {
        try {
            const attached = await debuggerManager.safeAttachDebugger(this.tabId);
            if (!attached)
                return null;
            await this.ensureDOMEnabled();
            const remoteObject = await this.resolveNodeToRemoteObject(this.backendDOMNodeId);
            if (!remoteObject?.object?.objectId) {
                return null;
            }
            const result = await this.#cdpCommander.sendCommand("Runtime.callFunctionOn", {
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
        }
        catch (error) {
            console.error("❌ [SmartLocator] Failed to get editor value:", error);
            return null;
        }
    }
    dispose() {
        debuggerManager.safeDetachDebugger(this.tabId, true);
    }
    /**
     * Helper: Get element bounding box using CDP
     */
    async getElementBoundingBox(nodeId) {
        try {
            // 获取元素位置并添加临时高亮样式
            const isDev = import.meta.env?.DEV;
            const boxResult = await this.#cdpCommander.sendCommand("Runtime.evaluate", {
                expression: `
        (function() {
          const el = document.querySelector("[data-aipex-nodeid='${nodeId}']");
          if (!el) return null;

          // Get bounding box
          const rect = el.getBoundingClientRect();

          // Store original styles
          const originalStyles = {
            outline: el.style.outline,
            outlineOffset: el.style.outlineOffset,
            boxShadow: el.style.boxShadow,
            transition: el.style.transition,
          };

          // Apply beautiful highlight styles (only if not already highlighted)
          if (!el.hasAttribute('data-aipex-highlighted')) {
            el.setAttribute('data-aipex-highlighted', 'true');
            el.style.outline = '3px solid #3b82f6';
            el.style.outlineOffset = '2px';
            el.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.2), 0 0 20px rgba(59, 130, 246, 0.4)';
            el.style.transition = 'all 0.2s ease-in-out';

            // Schedule removal of highlight after 10 seconds (longer duration)
            // if dev, keep highlight indefinitely
            ${isDev
                    ? "// Dev mode: keep highlight forever"
                    : `
              setTimeout(() => {
                el.removeAttribute('data-aipex-highlighted');
                el.style.outline = originalStyles.outline;
                el.style.outlineOffset = originalStyles.outlineOffset;
                el.style.boxShadow = originalStyles.boxShadow;
                el.style.transition = originalStyles.transition;
              }, 10000);
            `};
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
        }
        catch (_error) {
            return null;
        }
    }
    /**
     * Helper: Ensure DOM domain is enabled
     */
    async ensureDOMEnabled() {
        await this.#cdpCommander.sendCommand("DOM.enable", {});
    }
    /**
     * Helper: Resolve backendDOMNodeId to RemoteObject
     */
    async resolveNodeToRemoteObject(backendDOMNodeId) {
        return this.#cdpCommander.sendCommand("DOM.resolveNode", {
            backendNodeId: backendDOMNodeId,
        });
    }
    /**
     * Helper: Scroll to element
     */
    async scrollToElement(backendNodeId) {
        await this.#cdpCommander.sendCommand("DOM.scrollIntoViewIfNeeded", {
            backendNodeId,
        });
    }
    /**
     * Execute action using CDP (Chrome DevTools Protocol) for realistic interactions
     * Includes a global timeout to prevent indefinite hanging
     */
    async executeInPage(action, ...args) {
        // Global timeout for the entire operation (30 seconds)
        const GLOBAL_TIMEOUT = 30000;
        const timeoutPromise = new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: false,
                    error: `Operation '${action}' timed out after ${GLOBAL_TIMEOUT}ms`,
                });
            }, GLOBAL_TIMEOUT);
        });
        const operationPromise = this.executeInPageInternal(action, ...args);
        // Race between operation and timeout
        return Promise.race([operationPromise, timeoutPromise]);
    }
    /**
     * Internal implementation of executeInPage without timeout
     */
    async executeInPageInternal(action, ...args) {
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
        }
        catch (error) {
            return {
                success: false,
                error: `CDP execution error: ${error instanceof Error ? error.message : "Unknown error"}`,
            };
        }
    }
    /**
     * Execute click action using CDP
     */
    async executeClickViaCDP(count = 1) {
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
                const evalResult = await this.#cdpCommander.sendCommand("Runtime.evaluate", {
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
                const info = evalResult?.result?.value;
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
        }
        catch (error) {
            return {
                success: false,
                error: `Click failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            };
        }
    }
    /**
     * Add highlight to element during operation
     */
    async addHighlightToElement(objectId) {
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
        }
        catch (error) {
            console.warn("Failed to add highlight:", error);
        }
    }
    /**
     * Remove highlight from element
     */
    async removeHighlightFromElement(objectId) {
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
                    .catch(() => { });
            }, 300);
        }
        catch (error) {
            console.warn("Failed to remove highlight:", error);
        }
    }
    /**
     * Try to fill Monaco Editor using native API
     */
    async tryFillMonaco(objectId, value) {
        try {
            const result = await this.#cdpCommander.sendCommand("Runtime.callFunctionOn", {
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
        }
        catch (error) {
            console.warn("Monaco fill attempt failed:", error);
            return false;
        }
    }
    /**
     * Fill using select-all + replace strategy (universal fallback)
     */
    async fillUsingSelectAll(value) {
        // Step 1: Focus the element
        console.log("📍 [SmartLocator] Focusing element...");
        await this.#cdpCommander.sendCommand("DOM.focus", {
            backendNodeId: this.backendDOMNodeId,
        });
        await new Promise((resolve) => setTimeout(resolve, 300));
        // Step 2: Detect platform for modifier key
        const platformResult = await this.#cdpCommander.sendCommand("Runtime.evaluate", {
            expression: 'navigator.platform.toUpperCase().indexOf("MAC") >= 0',
            returnByValue: true,
        });
        const isMac = platformResult?.result?.value === true;
        const modifiers = isMac ? 8 : 2; // Meta = 8 (Cmd), Control = 2 (Ctrl)
        // Step 3: Send Ctrl+A / Cmd+A to select all
        console.log(`⌨️  [SmartLocator] Pressing ${isMac ? "Cmd" : "Ctrl"}+A to select all...`);
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
        const remoteObject = await this.resolveNodeToRemoteObject(this.backendDOMNodeId);
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
    async executeFillViaCDP(value) {
        let objectId = null;
        try {
            console.log("🔍 [SmartLocator] Starting fill operation...");
            console.log(`📝 [SmartLocator] Target value length: ${value.length} characters`);
            // Step 1: Get element remote object
            const remoteObject = await this.resolveNodeToRemoteObject(this.backendDOMNodeId);
            if (!remoteObject?.object?.objectId) {
                throw new Error("Failed to resolve element");
            }
            objectId = remoteObject.object.objectId;
            await new Promise((resolve) => setTimeout(resolve, 200));
            // Step 2: Add visual highlight
            console.log("✨ [SmartLocator] Adding highlight effect...");
            await this.addHighlightToElement(objectId);
            await new Promise((resolve) => setTimeout(resolve, 500));
            // Step 3: Try Monaco Editor native API first
            console.log("🎯 [SmartLocator] Attempting Monaco native fill...");
            const monacoSuccess = await this.tryFillMonaco(objectId, value);
            if (monacoSuccess) {
                console.log("✅ [SmartLocator] Monaco fill successful!");
                await new Promise((resolve) => setTimeout(resolve, 500));
                console.log("🧹 [SmartLocator] Removing highlight...");
                await this.removeHighlightFromElement(objectId);
                return { success: true };
            }
            // Step 4: Fallback to universal select-all + replace strategy
            console.log("🔄 [SmartLocator] Monaco not detected, using universal fill...");
            await new Promise((resolve) => setTimeout(resolve, 300));
            await this.fillUsingSelectAll(value);
            console.log("✅ [SmartLocator] Universal fill successful!");
            await new Promise((resolve) => setTimeout(resolve, 500));
            console.log("🧹 [SmartLocator] Removing highlight...");
            await this.removeHighlightFromElement(objectId);
            return { success: true };
        }
        catch (error) {
            console.error("❌ [SmartLocator] Fill failed:", error);
            // Try to remove highlight even on error
            if (objectId) {
                await this.removeHighlightFromElement(objectId).catch(() => { });
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
    async executeHoverViaCDP() {
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
        }
        catch (error) {
            return {
                success: false,
                error: `Hover failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            };
        }
    }
}
// Smart ElementHandle implementation
export class SmartElementHandle {
    locator;
    constructor(tabId, node, backendDOMNodeId) {
        this.locator = new SmartLocator(tabId, node, backendDOMNodeId);
    }
    asLocator() {
        return this.locator;
    }
    dispose() {
        this.locator.dispose();
    }
}
