/**
 * Debugger Manager
 *
 * Manages Chrome DevTools debugger connections with auto-detach and locking
 */

import { rejectPendingCommands } from "./cdp-commander";

const AUTO_DETACH_TIMEOUT = 30 * 1000;

export class DebuggerManager {
  private debuggerAttachedTabs = new Set<number>();
  private debuggerLock = new Map<number, Promise<boolean>>();
  private autoDetachTimers = new Map<number, ReturnType<typeof setTimeout>>();
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    if (chrome.debugger?.onDetach) {
      chrome.debugger.onDetach.addListener((source, reason) => {
        const tabId = source.tabId;
        if (tabId !== undefined) {
          this.debuggerAttachedTabs.delete(tabId);
          this.cancelAutoDetach(tabId);
          rejectPendingCommands(tabId, `Debugger detached: ${reason}`);
        }
      });
    }

    if (chrome.tabs?.onRemoved) {
      chrome.tabs.onRemoved.addListener((tabId) => {
        this.debuggerAttachedTabs.delete(tabId);
        this.cancelAutoDetach(tabId);
        rejectPendingCommands(tabId, "Tab closed");
      });
    }
  }

  private async ensureNoExtensionFrame(tabId: number): Promise<boolean> {
    const result = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        function queryAllDeepShadow<T extends Element>(
          selector: string,
          root: Document | ShadowRoot = document,
        ): T[] {
          const results: T[] = [];
          const currentElements = root.querySelectorAll(selector);
          results.push(...(Array.from(currentElements) as T[]));

          const allElements = root.querySelectorAll("*");
          for (const el of allElements) {
            if (el.shadowRoot) {
              const shadowResults = queryAllDeepShadow(selector, el.shadowRoot);
              results.push(...(shadowResults as T[]));
            }
          }
          return results;
        }

        const frames = queryAllDeepShadow<HTMLIFrameElement>("iframe");
        const extensionFrames = frames?.filter((frame) =>
          frame.src.startsWith("chrome-extension://"),
        );
        if (extensionFrames && extensionFrames.length > 0) {
          for (const frame of extensionFrames) {
            frame.remove();
          }
          return true;
        }
        return false;
      },
    });
    return result[0]?.result ?? false;
  }

  private scheduleAutoDetach(tabId: number): void {
    if (this.autoDetachTimers.has(tabId)) {
      clearTimeout(this.autoDetachTimers.get(tabId)!);
    }

    const timer = setTimeout(() => {
      this.safeDetachDebugger(tabId, true);
      this.autoDetachTimers.delete(tabId);
    }, AUTO_DETACH_TIMEOUT);

    this.autoDetachTimers.set(tabId, timer);
  }

  private cancelAutoDetach(tabId: number): void {
    if (this.autoDetachTimers.has(tabId)) {
      clearTimeout(this.autoDetachTimers.get(tabId)!);
      this.autoDetachTimers.delete(tabId);
    }
  }

  async safeAttachDebugger(tabId: number): Promise<boolean> {
    this.cancelAutoDetach(tabId);

    if (this.debuggerLock.has(tabId)) {
      const result = await this.debuggerLock.get(tabId)!;
      if (result) {
        this.scheduleAutoDetach(tabId);
      }
      return result;
    }

    const removeExtensionFrame = await this.ensureNoExtensionFrame(tabId);
    if (removeExtensionFrame) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    const attachPromise = new Promise<boolean>((resolve) => {
      if (!chrome.debugger) {
        resolve(false);
        return;
      }

      if (this.debuggerAttachedTabs.has(tabId)) {
        resolve(true);
        return;
      }

      chrome.debugger.attach({ tabId }, "1.3", () => {
        if (chrome.runtime.lastError) {
          console.error(
            "❌ [DEBUG] Failed to attach debugger:",
            chrome.runtime.lastError.message,
          );
          resolve(false);
        } else {
          this.debuggerAttachedTabs.add(tabId);
          console.log("✅ [DEBUG] Debugger attached successfully");
          resolve(true);
        }
      });
    });

    this.debuggerLock.set(tabId, attachPromise);

    try {
      const result = await attachPromise;
      if (result) {
        this.scheduleAutoDetach(tabId);
      }
      return result;
    } finally {
      this.debuggerLock.delete(tabId);
    }
  }

  async safeDetachDebugger(
    tabId: number,
    immediately: boolean = false,
  ): Promise<void> {
    if (immediately) {
      this.cancelAutoDetach(tabId);
      rejectPendingCommands(tabId, "Debugger detaching");

      return new Promise((resolve) => {
        if (this.debuggerAttachedTabs.has(tabId)) {
          chrome.debugger.detach({ tabId }, () => {
            this.debuggerAttachedTabs.delete(tabId);
            resolve();
          });
        } else {
          resolve();
        }
      });
    } else {
      this.scheduleAutoDetach(tabId);
      return Promise.resolve();
    }
  }
}

export const debuggerManager = new DebuggerManager();
