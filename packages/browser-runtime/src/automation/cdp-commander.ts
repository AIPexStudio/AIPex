/**
 * Chrome DevTools Protocol Commander
 *
 * Provides type-safe wrapper for chrome.debugger.sendCommand with timeout handling
 */

const DEFAULT_CDP_TIMEOUT = 10000;

const pendingCommands = new Map<
  number,
  Set<{ reject: (error: Error) => void; command: string }>
>();

export function rejectPendingCommands(tabId: number, reason: string): void {
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
  constructor(readonly tabId: number) {}

  async sendCommand<T = unknown>(
    command: string,
    params: Record<string, unknown>,
    timeout: number = DEFAULT_CDP_TIMEOUT,
  ): Promise<T> {
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
      pendingCommands.get(this.tabId)!.add(pendingEntry);

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
            resolve(result as T);
          }
        },
      );
    });
  }
}
