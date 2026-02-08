/**
 * QuickJS Manager
 * Manages QuickJS VM instances and code execution
 *
 * Note: Using RELEASE_SYNC variant instead of ASYNC to avoid CSP issues in Chrome extensions.
 * Chrome extensions don't allow 'wasm-eval' which is required by asyncify variants.
 */

import { default as RELEASE_SYNC } from "@jitl/quickjs-ng-wasmfile-release-sync";
// Import the WASM file as a URL so Vite/bundler handles it correctly
// This ensures the wasm is properly bundled and the URL is correct at runtime
import quickjsWasmUrl from "@jitl/quickjs-ng-wasmfile-release-sync/wasm?url";
import fs from "@zenfs/core";
import type {
  QuickJSContext,
  QuickJSHandle,
  QuickJSRuntime,
  QuickJSScope,
} from "quickjs-emscripten";
import { newQuickJSWASMModuleFromVariant, Scope } from "quickjs-emscripten";
import type { SkillAPIBridge } from "./skill-api";

interface ExecutionContext {
  skillId: string;
  workingDir: string;
  args?: any;
}

class QuickJSManager {
  private runtime: QuickJSRuntime | null = null;
  private quickjs: Awaited<
    ReturnType<typeof newQuickJSWASMModuleFromVariant>
  > | null = null;
  private initPromise: Promise<void> | null = null;
  private initialized = false;
  private moduleCache: Map<string, string> = new Map(); // Cache for CDN modules

  /**
   * Initialize QuickJS runtime
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initialize();
    return this.initPromise;
  }

  private async _initialize(): Promise<void> {
    try {
      console.log(
        "[QuickJS] Initializing runtime with RELEASE_SYNC variant...",
      );

      // Sanity check: ensure the WASM URL was properly resolved by Vite
      if (!quickjsWasmUrl) {
        throw new Error(
          "[QuickJS] WASM URL is not defined. Vite may not have bundled the wasm file correctly.",
        );
      }
      console.log(`[QuickJS] WASM URL resolved to: ${quickjsWasmUrl}`);

      // Use RELEASE_SYNC variant (required for Chrome extensions due to CSP restrictions)
      // Chrome extensions don't allow 'wasm-eval' which asyncify variants need
      // Wrap the variant to override locateFile so the Emscripten loader can find the wasm
      const variantWithLocateFile = {
        ...RELEASE_SYNC,
        importModuleLoader: async () => {
          // Get the original module loader
          const originalLoader = await RELEASE_SYNC.importModuleLoader();
          // Return a wrapped version that injects locateFile
          return (moduleOptions?: Record<string, unknown>) => {
            return originalLoader({
              ...moduleOptions,
              // Override locateFile to return the correct URL for the wasm file
              locateFile: (path: string, prefix: string) => {
                if (path.endsWith(".wasm")) {
                  console.log(
                    `[QuickJS] locateFile intercepted for ${path}, returning: ${quickjsWasmUrl}`,
                  );
                  return quickjsWasmUrl;
                }
                // For non-wasm files, use the default behavior
                return prefix + path;
              },
            });
          };
        },
      };

      this.quickjs = await newQuickJSWASMModuleFromVariant(
        variantWithLocateFile,
      );
      this.runtime = this.quickjs.newRuntime();

      // Set memory and stack limits
      this.runtime.setMemoryLimit(100 * 1024 * 1024); // 100MB
      this.runtime.setMaxStackSize(1024 * 1024); // 1MB

      // Set synchronous module loader
      // Note: Module loader must return synchronously, so modules are loaded from cache
      // IMPORTANT: Must return ES6 module code with export statements
      this.runtime.setModuleLoader((moduleName: string) => {
        console.log(`[QuickJS] Module loader called for: ${moduleName}`);

        // 1. Built-in modules (fs, etc.)
        if (moduleName === "fs") {
          console.log(`[QuickJS] Loading built-in module: ${moduleName}`);
          // Return as ES6 module with default export
          return `export default ${JSON.stringify(fs)}`;
        }

        // 2. Check cache for preloaded modules (by package name or URL)
        const cachedModule = this.moduleCache.get(moduleName);
        if (cachedModule) {
          console.log(`[QuickJS] Loading cached module: ${moduleName}`);
          // Cache should already contain module code with exports
          return cachedModule;
        }

        // 3. If moduleName is a URL path (e.g., /v135/lodash@4.17.21/es/lodash.js)
        //    try to resolve it with esm.sh origin
        if (moduleName.startsWith("/")) {
          const fullUrl = `https://esm.sh${moduleName}`;
          const cachedByUrl = this.moduleCache.get(fullUrl);
          if (cachedByUrl) {
            console.log(`[QuickJS] Loading cached module by URL: ${fullUrl}`);
            return cachedByUrl;
          }
        }

        // 4. Module not found - this shouldn't happen if preload worked correctly
        console.error(`[QuickJS] Module not found in cache: ${moduleName}`);
        return `throw new Error('Module not found: ${moduleName}. Module must be preloaded before execution.');`;
      });

      this.initialized = true;
      console.log("[QuickJS] Runtime initialized successfully");
    } catch (error) {
      console.error("[QuickJS] Failed to initialize:", error);
      this.initPromise = null;
      throw error;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Recursively fetch ESM module and its dependencies
   */
  private async fetchESM(
    url: string,
    visited = new Set<string>(),
  ): Promise<{ url: string; code: string; deps: string[] } | null> {
    if (visited.has(url)) return null;
    visited.add(url);

    const base = new URL(url);
    const origin = base.origin;

    console.log(`[QuickJS] Fetching ESM: ${url}`);

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

      const code = await res.text();

      // Match import/export from statements
      const importRegex =
        /(?:import|export)\s+(?:[^'"]+from\s+)?["']([^"']+)["']/g;

      const deps: string[] = [];
      let match: RegExpExecArray | null = importRegex.exec(code);

      while (match) {
        const rawPath = match[1];
        if (!rawPath) continue;
        let resolved: string;

        if (rawPath.startsWith("http://") || rawPath.startsWith("https://")) {
          // Absolute URL
          resolved = rawPath;
        } else if (rawPath.startsWith("/")) {
          // Root path reference (from esm.sh)
          resolved = origin + rawPath;
        } else {
          // Relative path
          resolved = new URL(rawPath, base).href;
        }

        deps.push(resolved);
        match = importRegex.exec(code);
      }

      // Recursively fetch child dependencies
      await Promise.all(
        deps.map(async (dep) => {
          const child = await this.fetchESM(dep, visited);
          if (child) {
            // Cache child dependencies by URL
            this.moduleCache.set(child.url, child.code);
            console.log(`[QuickJS] Cached dependency: ${child.url}`);
          }
        }),
      );

      return { url, code, deps };
    } catch (error) {
      console.error(`[QuickJS] Failed to fetch ${url}:`, error);
      throw error;
    }
  }

  /**
   * Load module from CDN (esm.sh) with recursive dependency resolution
   */
  private async loadFromCDN(packageName: string): Promise<string> {
    // Check cache first
    if (this.moduleCache.has(packageName)) {
      console.log(`[QuickJS] Loading from cache: ${packageName}`);
      return this.moduleCache.get(packageName)!;
    }

    console.log(`[QuickJS] Loading from CDN: ${packageName}`);

    try {
      // Use esm.sh as CDN
      const url = `https://esm.sh/${packageName}`;

      // Recursively fetch module and all dependencies
      const result = await this.fetchESM(url);

      if (!result) {
        throw new Error("Failed to fetch module");
      }

      // Cache the main module
      this.moduleCache.set(packageName, result.code);
      this.moduleCache.set(url, result.code); // Also cache by URL for dependency resolution

      console.log(
        `[QuickJS] Successfully loaded from CDN: ${packageName} (with ${result.deps.length} dependencies)`,
      );
      return result.code;
    } catch (error) {
      throw new Error(
        `Failed to load module ${packageName} from CDN: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Extract import statements from code (for CDN packages only)
   * Note: Local imports should be inlined, only third-party packages should use import
   */
  private extractImports(code: string): string[] {
    const imports: string[] = [];

    // Match ES6 import statements
    const importRegex = /import\s+(?:[\w\s{},*]*\s+from\s+)?['"]([^'"]+)['"]/g;
    let match: RegExpExecArray | null = importRegex.exec(code);

    while (match !== null) {
      if (match[1]) {
        imports.push(match[1]);
      }
      match = importRegex.exec(code);
    }

    // Match dynamic imports
    const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    match = dynamicImportRegex.exec(code);
    while (match !== null) {
      if (match[1]) {
        imports.push(match[1]);
      }
      match = dynamicImportRegex.exec(code);
    }

    return imports;
  }

  /**
   * Preload CDN modules before execution
   * Required because sync variant can't load modules asynchronously during execution
   * Note: Local modules should be inlined in the script, not imported
   */
  private async preloadModules(code: string): Promise<void> {
    const imports = this.extractImports(code);

    if (imports.length === 0) {
      console.log("[QuickJS] No imports detected");
      return;
    }

    console.log(
      `[QuickJS] Found ${imports.length} imports, preloading CDN packages:`,
      imports,
    );

    for (const moduleName of imports) {
      // Skip built-in modules
      if (moduleName === "fs") {
        continue;
      }

      // Skip if already cached
      if (this.moduleCache.has(moduleName)) {
        console.log(`[QuickJS] Module already cached: ${moduleName}`);
        continue;
      }

      try {
        // Only support CDN packages (no relative paths)
        if (moduleName.startsWith("./") || moduleName.startsWith("../")) {
          throw new Error(
            `Relative imports are not supported. Please inline local modules in your script. Found: ${moduleName}`,
          );
        }

        // Load third-party package from CDN
        await this.loadFromCDN(moduleName);
        console.log(`[QuickJS] Preloaded CDN module: ${moduleName}`);
      } catch (error) {
        console.error(
          `[QuickJS] Failed to preload module ${moduleName}:`,
          error,
        );
        throw error;
      }
    }

    console.log(`[QuickJS] Finished preloading ${imports.length} CDN modules`);
  }

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
  async execute(
    code: string,
    context: ExecutionContext,
    apiBridge: SkillAPIBridge,
  ): Promise<any> {
    await this.ensureInitialized();

    if (!this.runtime || !this.quickjs) {
      throw new Error("QuickJS runtime not initialized");
    }

    // Preload all CDN modules before execution (required for sync variant)
    // Note: Local modules should be inlined in the script, not imported
    await this.preloadModules(code);

    // Use Scope to automatically manage all disposable resources
    return await Scope.withScopeAsync(async (scope: QuickJSScope) => {
      // Create a new context for this execution and add it to the scope
      const vm = scope.manage(this.runtime!.newContext());

      console.log(`[QuickJS] Executing code for skill: ${context.skillId}`);

      // Inject SKILL_API into the VM
      this._injectGlobalAPI(vm, apiBridge, scope);

      // Inject args variable into the VM
      // Directly evaluate the args object as JavaScript literal
      const argsJson = JSON.stringify(context.args ?? {});
      const argsResult = scope.manage(vm.evalCode(`(${argsJson})`));

      if (argsResult.error) {
        const errorMsg = vm.dump(argsResult.error);
        throw new Error(`Failed to inject args: ${errorMsg}`);
      }

      vm.setProp(vm.global, "args", argsResult.value);

      // Wrap code to support main() pattern
      // Strategy: Return the Promise directly, handle resolution in host code
      const wrappedCode = `${code}
;
// IIFE that calls main() and registers promise handlers
(function() {
  let result;
  if (typeof main === 'function') {
    result = main(args);

    // Register .then() handler to store resolved value
    if (result && typeof result.then === 'function') {
      result.then((resolvedValue) => {
        // Store the resolved value globally with a wrapper to distinguish
        // "not resolved yet" from "resolved to undefined"
        globalThis.__SKILL_RESOLVED_VALUE__ = { __resolved: true, value: resolvedValue };
      }).catch((error) => {
        globalThis.__SKILL_RESOLVED_ERROR__ = { __rejected: true, error: error instanceof Error ? error.message : String(error) };
      });
    } else {
      // Not a promise, store the value immediately
      globalThis.__SKILL_RESOLVED_VALUE__ = { __resolved: true, value: result };
    }

    return result;
  } else if (module.exports) {
    if (typeof module.exports === 'function') {
      return module.exports(args);
    } else if (typeof module.exports === 'object' && 'main' in module.exports && typeof module.exports.main === 'function') {
      return module.exports.main(args);
    }
  } else {
    throw new Error('main function or module.exports not found')
  }
})()`;

      const resultHandle = scope.manage(
        vm.evalCode(wrappedCode, "index.js", {
          type: "module",
        }),
      );

      if (resultHandle.error) {
        const errorMessage = vm.dump(resultHandle.error);
        throw new Error(`Execution error: ${JSON.stringify({ errorMessage })}`);
      }

      // Handle promise results
      // Note: The wrapper IIFE returns a promise and registers a .then() handler
      // that stores the resolved value in globalThis.__SKILL_RESOLVED_VALUE__

      let finalResult: unknown;

      // Execute pending jobs until the .then() handler fires
      // and stores the resolved value in globalThis.__SKILL_RESOLVED_VALUE__
      const startTime = Date.now();
      const timeout = 60000; // 60 seconds
      const checkInterval = 16; // 16ms between checks (~60fps)

      while (Date.now() - startTime < timeout) {
        vm.runtime.executePendingJobs();

        // Check if the resolved value is available
        const checkCode = vm.evalCode(`globalThis.__SKILL_RESOLVED_VALUE__`);
        if (!checkCode.error) {
          const wrapper = vm.dump(checkCode.value);
          checkCode.value.dispose();

          // Check if it's the wrapper object with __resolved flag
          if (
            wrapper &&
            typeof wrapper === "object" &&
            wrapper.__resolved === true
          ) {
            finalResult = wrapper.value;
            break;
          }
        } else {
          checkCode.error.dispose();
        }

        // Check for errors
        const checkError = vm.evalCode(`globalThis.__SKILL_RESOLVED_ERROR__`);
        if (!checkError.error) {
          const errorWrapper = vm.dump(checkError.value);
          checkError.value.dispose();

          // Check if it's the error wrapper object with __rejected flag
          if (
            errorWrapper &&
            typeof errorWrapper === "object" &&
            errorWrapper.__rejected === true
          ) {
            throw new Error(
              `Promise rejected: ${JSON.stringify({ error: errorWrapper.error })}`,
            );
          }
        } else {
          checkError.error.dispose();
        }

        // Wait for the check interval before next iteration
        await new Promise((resolve) => setTimeout(resolve, checkInterval));

        // Log progress every 5 seconds
        const elapsed = Date.now() - startTime;
        if (elapsed > 0 && elapsed % 5000 < checkInterval) {
          console.log(
            `[QuickJS] Waiting for promise resolution... (${(elapsed / 1000).toFixed(1)}s elapsed)`,
          );
        }
      }

      const totalElapsed = Date.now() - startTime;
      if (totalElapsed >= timeout) {
        throw new Error(
          `Promise resolution timeout: Promise never resolved after ${timeout / 1000} seconds`,
        );
      }

      console.log(
        `[QuickJS] Execution completed successfully in ${(totalElapsed / 1000).toFixed(2)}s`,
      );
      return finalResult as any;
    });
  }

  /**
   * Check if a handle is a built-in constant that should not be disposed
   */
  private isBuiltInConstant(
    vm: QuickJSContext,
    handle: QuickJSHandle,
  ): boolean {
    return (
      handle === vm.undefined ||
      handle === vm.null ||
      handle === vm.true ||
      handle === vm.false
    );
  }

  /**
   * Safely dispose a handle if it's not a built-in constant
   */
  private safeDispose(vm: QuickJSContext, handle: QuickJSHandle): void {
    if (!this.isBuiltInConstant(vm, handle)) {
      handle.dispose();
    }
  }

  private bindObject(
    vm: QuickJSContext,
    target: any,
    name: string | null = null,
  ): QuickJSHandle {
    // Built-in constants - return directly without creating new handles
    if (target === undefined) return vm.undefined;
    if (target === null) return vm.null;
    if (typeof target === "boolean") return target ? vm.true : vm.false;

    // Primitive types - create new handles
    if (typeof target === "number") return vm.newNumber(target);
    if (typeof target === "string") return vm.newString(target);

    if (typeof target === "function") {
      return vm.newFunction(name || "fn", (...args: QuickJSHandle[]) => {
        const jsArgs = args.map(vm.dump);
        const result = target(...jsArgs);

        // Handle async functions (functions that return a Promise)
        if (result && typeof result.then === "function") {
          const deferred = vm.newPromise();

          // Set up promise.settled handler to ensure pending jobs are executed
          // This is crucial: when the promise is settled (resolved or rejected),
          // we MUST call executePendingJobs() to allow QuickJS to process
          // any pending callbacks or microtasks
          deferred.settled.then(() => {
            vm.runtime.executePendingJobs();
          });

          result
            .then((val: any) => {
              const resolvedHandle = this.bindObject(vm, val);
              deferred.resolve(resolvedHandle);
              this.safeDispose(vm, resolvedHandle);
              // Note: executePendingJobs() is called via deferred.settled handler
            })
            .catch((err: any) => {
              const errorHandle = vm.newString(err?.message || String(err));
              deferred.reject(errorHandle);
              errorHandle.dispose();
              // Note: executePendingJobs() is called via deferred.settled handler
            });

          return deferred.handle;
        }

        // Handle sync functions
        return this.bindObject(vm, result);
      });
    }

    // Handle Uint8Array specially (must come before Array.isArray check)
    if (target instanceof Uint8Array) {
      const arr = vm.newArray();
      // Set length property
      const lengthHandle = vm.newNumber(target.length);
      vm.setProp(arr, "length", lengthHandle);
      lengthHandle.dispose();

      // Copy each byte
      for (let i = 0; i < target.length; i++) {
        const byteValue = target[i];
        if (byteValue !== undefined) {
          const valueHandle = vm.newNumber(byteValue);
          vm.setProp(arr, i, valueHandle);
          valueHandle.dispose();
        }
      }
      return arr;
    }

    if (Array.isArray(target)) {
      const arr = vm.newArray();
      target.forEach((v, i) => {
        const valueHandle = this.bindObject(vm, v);
        vm.setProp(arr, i, valueHandle);
        this.safeDispose(vm, valueHandle);
      });
      return arr;
    }

    if (typeof target === "object") {
      const obj = vm.newObject();
      for (const [k, v] of Object.entries(target)) {
        const valueHandle = this.bindObject(vm, v, k);
        vm.setProp(obj, k, valueHandle);
        this.safeDispose(vm, valueHandle);
      }
      return obj;
    }

    return vm.undefined;
  }

  /**
   * Inject SKILL_API into the QuickJS VM
   * Note: We use synchronous versions because newAsyncifiedFunction is not available
   * in the standard API. Async operations will need to be handled differently.
   */
  private _injectGlobalAPI(
    vm: QuickJSContext,
    apiBridge: SkillAPIBridge,
    scope: QuickJSScope,
  ): void {
    const consoleHandle = scope.manage(
      this.bindObject(vm, apiBridge.console, "console"),
    );
    vm.setProp(vm.global, "console", consoleHandle);

    // TODO: Add other global APIs here
    // For now, we'll inject a simple API
    // Async operations (like fetch, fs operations) will need to be handled
    // by the user code using native Promises or callbacks
    // Full async API bridging requires more complex implementation

    // File System API
    const fsHandle = scope.manage(this.bindObject(vm, apiBridge.fs, "fs"));
    vm.setProp(vm.global, "fs", fsHandle);

    const downloadFileHandle = scope.manage(
      this.bindObject(vm, apiBridge.downloadFile, "downloadFile"),
    );
    vm.setProp(vm.global, "downloadFile", downloadFileHandle);

    console.log("[QuickJS] Global API injected successfully");
  }

  /**
   * Dispose the runtime
   */
  dispose(): void {
    if (this.runtime) {
      this.runtime.dispose();
      this.runtime = null;
    }
    this.quickjs = null;
    this.initialized = false;
    this.initPromise = null;
    console.log("[QuickJS] Runtime disposed");
  }
}

// Singleton instance
export const quickjs = new QuickJSManager();
