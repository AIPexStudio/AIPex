/**
 * Chrome DevTools Protocol Commander
 *
 * Provides type-safe wrapper for chrome.debugger.sendCommand with timeout handling
 */
const DEFAULT_CDP_TIMEOUT = 10000;
const pendingCommands = new Map();
export function rejectPendingCommands(tabId, reason) {
  const pending = pendingCommands.get(tabId);
  if (pending) {
    for (const { reject, command } of pending) {
      reject(new Error(`CDP command '${command}' aborted: ${reason}`));
    }
    pending.clear();
    pendingCommands.delete(tabId);
  }
}
export class CdpCommander {
  tabId;
  constructor(tabId) {
    this.tabId = tabId;
  }
  async sendCommand(command, params, timeout = DEFAULT_CDP_TIMEOUT) {
    return new Promise((resolve, reject) => {
      const pendingEntry = { reject, command };
      const timeoutId = setTimeout(() => {
        const pending = pendingCommands.get(this.tabId);
        if (pending) {
          pending.delete(pendingEntry);
        }
        reject(
          new Error(`CDP command '${command}' timed out after ${timeout}ms`),
        );
      }, timeout);
      if (!pendingCommands.has(this.tabId)) {
        pendingCommands.set(this.tabId, new Set());
      }
      pendingCommands.get(this.tabId).add(pendingEntry);
      chrome.debugger.sendCommand(
        { tabId: this.tabId },
        command,
        params,
        (result) => {
          clearTimeout(timeoutId);
          const pending = pendingCommands.get(this.tabId);
          if (pending) {
            pending.delete(pendingEntry);
          }
          if (chrome.runtime.lastError) {
            reject(
              new Error(
                `Failed to send CDP command '${command}': ${chrome.runtime.lastError.message}`,
              ),
            );
          } else {
            resolve(result);
          }
        },
      );
    });
  }
}
