// Page tools
export {
  clickElementTool,
  fillFormFieldTool,
  getPageContentTool,
  getPageInfoTool,
  navigateToUrlTool,
  scrollPageTool,
} from "./page-tools";

// Tab tools
export {
  closeTabTool,
  createTabTool,
  duplicateTabTool,
  listTabsTool,
  reloadTabTool,
  switchToTabTool,
} from "./tab-tools";

// Convenient array of all tools for easy registration
import {
  clickElementTool,
  fillFormFieldTool,
  getPageContentTool,
  getPageInfoTool,
  navigateToUrlTool,
  scrollPageTool,
} from "./page-tools";
import {
  closeTabTool,
  createTabTool,
  duplicateTabTool,
  listTabsTool,
  reloadTabTool,
  switchToTabTool,
} from "./tab-tools";

export const allBrowserTools = [
  // Page tools
  getPageInfoTool,
  scrollPageTool,
  navigateToUrlTool,
  getPageContentTool,
  clickElementTool,
  fillFormFieldTool,
  // Tab tools
  listTabsTool,
  switchToTabTool,
  closeTabTool,
  createTabTool,
  reloadTabTool,
  duplicateTabTool,
] as const;
