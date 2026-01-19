/**
 * Bundled Modules for QuickJS VM
 * 
 * This module provides pre-bundled third-party libraries for use within the QuickJS VM.
 * All modules are bundled at build time to comply with Chrome Web Store Manifest V3 policy,
 * which prohibits loading and executing remote/CDN code.
 * 
 * To add a new module:
 * 1. Copy the ESM source code to this directory (e.g., from node_modules/package/esm/)
 * 2. Import the ESM source code using Vite's ?raw import
 * 3. Add an entry to the bundledModules object below
 */

// Import fflate ESM browser bundle as raw string
// Source: node_modules/fflate/esm/browser.js (version 0.8.2)
// Copied locally to comply with Chrome Web Store Manifest V3 policy
import fflateCode from './fflate.esm.js?raw'

/**
 * Map of module names to their ESM source code
 * The source code should be valid ES6 module code with export statements
 */
export const bundledModules: Record<string, string> = {
  // fflate - High performance (de)compression library
  // Used by skill-creator-browser for ZIP file creation
  'fflate': fflateCode,
}

/**
 * Check if a module is available as a bundled module
 */
export function isBundledModule(moduleName: string): boolean {
  return moduleName in bundledModules
}

/**
 * Get the list of available bundled modules
 */
export function getAvailableBundledModules(): string[] {
  return Object.keys(bundledModules)
}
