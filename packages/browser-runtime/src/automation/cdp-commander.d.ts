/**
 * Chrome DevTools Protocol Commander
 *
 * Provides type-safe wrapper for chrome.debugger.sendCommand with timeout handling
 */
export declare function rejectPendingCommands(
  tabId: number,
  reason: string,
): void;
export declare class CdpCommander {
  readonly tabId: number;
  constructor(tabId: number);
  sendCommand<T = unknown>(
    command: string,
    params: Record<string, unknown>,
    timeout?: number,
  ): Promise<T>;
}
