/**
 * Debugger Manager
 *
 * Manages Chrome DevTools debugger connections with auto-detach and locking
 */
export declare class DebuggerManager {
    private debuggerAttachedTabs;
    private debuggerLock;
    private autoDetachTimers;
    private initialized;
    constructor();
    private initialize;
    private ensureNoExtensionFrame;
    private scheduleAutoDetach;
    private cancelAutoDetach;
    safeAttachDebugger(tabId: number): Promise<boolean>;
    safeDetachDebugger(tabId: number, immediately?: boolean): Promise<void>;
}
export declare const debuggerManager: DebuggerManager;
