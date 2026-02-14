/**
 * Environment type definitions for aipex-react
 * These are build-time environment variables when bundled with Vite.
 */

interface ImportMetaEnv {
  /** Base URL for the website (e.g., "https://www.claudechrome.com") */
  readonly VITE_WEBSITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
