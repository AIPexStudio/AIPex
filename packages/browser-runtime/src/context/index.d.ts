/**
 * Browser Context Providers Registry
 * Exports all available browser context providers
 */
import type { ContextManager } from "@aipexstudio/aipex-core";
export { BookmarksProvider } from "./bookmarks-provider";
export { CurrentPageProvider } from "./current-page-provider";
export { HistoryProvider } from "./history-provider";
export { ScreenshotProvider } from "./screenshot-provider";
export { TabsProvider } from "./tabs-provider";
import { BookmarksProvider } from "./bookmarks-provider";
import { CurrentPageProvider } from "./current-page-provider";
import { HistoryProvider } from "./history-provider";
import { ScreenshotProvider } from "./screenshot-provider";
import { TabsProvider } from "./tabs-provider";
/**
 * All available browser context providers
 * Can be registered with ContextManager for full browser integration
 */
export declare const allBrowserProviders: (BookmarksProvider | CurrentPageProvider | HistoryProvider | ScreenshotProvider | TabsProvider)[];
/**
 * Register all default browser context providers with a ContextManager
 * @param manager - The ContextManager instance to register providers with
 * @returns The same manager for chaining
 */
export declare function registerDefaultBrowserContextProviders<T extends ContextManager>(manager: T): T;
