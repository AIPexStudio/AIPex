import { z } from "zod";
/**
 * Get all open tabs across all windows
 */
export declare const getAllTabsTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{}, z.core.$strip>, string>;
/**
 * Get information about the currently active tab
 */
export declare const getCurrentTabTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{}, z.core.$strip>, string>;
/**
 * Switch to a specific tab
 */
export declare const switchToTabTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    tabId: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    urlPattern: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>, string>;
/**
 * Close a tab
 */
export declare const closeTabTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    tabId: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, z.core.$strip>, string>;
/**
 * Create a new tab
 */
export declare const createNewTabTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    url: z.ZodString;
}, z.core.$strip>, string>;
/**
 * Get detailed information about a specific tab
 */
export declare const getTabInfoTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    tabId: z.ZodNumber;
}, z.core.$strip>, string>;
/**
 * Duplicate a tab
 */
export declare const duplicateTabTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    tabId: z.ZodNumber;
}, z.core.$strip>, string>;
/**
 * Use AI to automatically group tabs by topic/purpose
 */
export declare const organizeTabsTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{}, z.core.$strip>, string>;
/**
 * Remove all tab groups in the current window
 */
export declare const ungroupTabsTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{}, z.core.$strip>, string>;
