declare module "@jitl/quickjs-ng-wasmfile-release-sync" {
  const releaseSyncVariant: unknown;
  export default releaseSyncVariant;
}

// Declaration for the wasm subpath export with Vite's ?url suffix
declare module "@jitl/quickjs-ng-wasmfile-release-sync/wasm?url" {
  const wasmUrl: string;
  export default wasmUrl;
}

declare module "@zenfs/core" {
  export const configure: (...args: any[]) => Promise<void>;
  export const fs: {
    promises: Record<string, (...args: any[]) => Promise<any>>;
    [key: string]: any;
  };
  const defaultExport: typeof fs;
  export default defaultExport;
}

declare module "@zenfs/dom" {
  export const IndexedDB: unknown;
}

declare module "quickjs-emscripten" {
  export type QuickJSRuntime = any;
  export type QuickJSContext = any;
  export type QuickJSHandle = any;
  export interface QuickJSScope {
    manage<T>(value: T): T;
  }
  export const Scope: {
    withScopeAsync<T>(fn: (scope: QuickJSScope) => T | Promise<T>): Promise<T>;
    withScope<T>(fn: (scope: QuickJSScope) => T): T;
  };
  export function newQuickJSWASMModuleFromVariant(
    variant: unknown,
  ): Promise<any>;
}

declare module "fflate" {
  export function unzipSync(data: Uint8Array): Record<string, Uint8Array>;
  export function strFromU8(data: Uint8Array): string;
}
