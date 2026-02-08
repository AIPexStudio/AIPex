/**
 * TypeScript declaration for Vite's ?url import suffix.
 * When importing a file with ?url, Vite returns the public URL of the asset
 * after bundling, rather than the file contents.
 *
 * This is used for importing WASM files and other assets that need to be
 * fetched at runtime with their correct bundled URL.
 *
 * @example
 * import wasmUrl from "@some-package/file.wasm?url";
 * // wasmUrl is a string containing the URL to the wasm file
 */
declare module "*?url" {
  const url: string;
  export default url;
}
