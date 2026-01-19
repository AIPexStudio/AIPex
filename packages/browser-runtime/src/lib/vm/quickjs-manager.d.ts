/**
 * QuickJS Manager
 * Manages QuickJS VM instances and code execution
 *
 * Note: Using RELEASE_SYNC variant instead of ASYNC to avoid CSP issues in Chrome extensions.
 * Chrome extensions don't allow 'wasm-eval' which is required by asyncify variants.
 */
import type { SkillAPIBridge } from "./skill-api";
interface ExecutionContext {
    skillId: string;
    workingDir: string;
    args?: any;
}
declare class QuickJSManager {
    private runtime;
    private quickjs;
    private initPromise;
    private initialized;
    private moduleCache;
    /**
     * Initialize QuickJS runtime
     */
    initialize(): Promise<void>;
    private _initialize;
    private ensureInitialized;
    /**
     * Recursively fetch ESM module and its dependencies
     */
    private fetchESM;
    /**
     * Load module from CDN (esm.sh) with recursive dependency resolution
     */
    private loadFromCDN;
    /**
     * Extract import statements from code (for CDN packages only)
     * Note: Local imports should be inlined, only third-party packages should use import
     */
    private extractImports;
    /**
     * Preload CDN modules before execution
     * Required because sync variant can't load modules asynchronously during execution
     * Note: Local modules should be inlined in the script, not imported
     */
    private preloadModules;
    /**
     * Execute code in a new QuickJS context
     *
     * Handles async functions correctly by:
     * 1. Wrapping code to call main() and register a .then() handler
     * 2. The .then() handler stores the resolved value in a global variable
     * 3. Host code calls executePendingJobs() in a loop to process microtasks
     * 4. Once the promise resolves, extract the value from the global variable
     *
     * This avoids the deadlock that occurs when using await inside VM code,
     * since await would block execution and prevent executePendingJobs() from being called.
     *
     * @param code - The skill code to execute (must define a main function or module.exports)
     * @param context - Execution context including skillId, workingDir, and args
     * @param apiBridge - Bridge to host APIs (fs, console, fetch, etc.)
     * @returns The return value from main() or module.exports
     */
    execute(code: string, context: ExecutionContext, apiBridge: SkillAPIBridge): Promise<any>;
    /**
     * Check if a handle is a built-in constant that should not be disposed
     */
    private isBuiltInConstant;
    /**
     * Safely dispose a handle if it's not a built-in constant
     */
    private safeDispose;
    private bindObject;
    /**
     * Inject SKILL_API into the QuickJS VM
     * Note: We use synchronous versions because newAsyncifiedFunction is not available
     * in the standard API. Async operations will need to be handled differently.
     */
    private _injectGlobalAPI;
    /**
     * Dispose the runtime
     */
    dispose(): void;
}
export declare const quickjs: QuickJSManager;
export {};
