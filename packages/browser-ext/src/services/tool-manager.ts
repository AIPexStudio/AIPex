/**
 * Tool Manager Service
 * Provides a unified interface for tool management in the browser extension
 *
 * This is a simplified adapter that wraps the browser-runtime tools
 * for use in the browser extension context.
 */

import type { FunctionTool } from "@aipexstudio/aipex-core";
import { allBrowserTools } from "@aipexstudio/browser-runtime";

export interface ToolMetadata {
  name: string;
  description: string;
  category: string;
  inputSchema: unknown;
  examples?: string[];
}

export interface AITool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: unknown;
  };
}

export type ToolEventType = "tool_registered" | "tool_unregistered";
type ToolSubscriber = (data: unknown) => void;

/**
 * Tool categories for organization
 */
export const ToolCategory = {
  BROWSER: "browser",
  UI: "ui",
  PAGE: "page",
  SCREENSHOT: "screenshot",
  DOWNLOAD: "download",
  INTERVENTION: "intervention",
  SKILL: "skill",
} as const;

export type ToolCategoryType = (typeof ToolCategory)[keyof typeof ToolCategory];

/**
 * Unified Tool Manager Service
 * Provides simplified tool management interface for the browser extension
 */
export class ToolManager {
  private static instance: ToolManager;
  private dynamicTools: Map<string, FunctionTool> = new Map();
  private subscribers: Map<ToolEventType, Set<ToolSubscriber>> = new Map();

  private constructor() {}

  public static getInstance(): ToolManager {
    if (!ToolManager.instance) {
      ToolManager.instance = new ToolManager();
    }
    return ToolManager.instance;
  }

  /**
   * Get all available tools (including dynamic tools)
   */
  public getAllTools(): FunctionTool[] {
    const staticTools = allBrowserTools;
    const dynamicToolsArray = Array.from(this.dynamicTools.values());
    return [...staticTools, ...dynamicToolsArray];
  }

  /**
   * Get tool by name
   */
  public getTool(name: string): FunctionTool | undefined {
    // Check static tools first
    const staticTool = allBrowserTools.find((t) => t.name === name);
    if (staticTool) {
      return staticTool;
    }
    // Check dynamic tools
    return this.dynamicTools.get(name);
  }

  /**
   * Check if a tool exists
   */
  public hasTool(name: string): boolean {
    return this.getTool(name) !== undefined;
  }

  /**
   * Get tool count
   */
  public getToolCount(): number {
    return allBrowserTools.length + this.dynamicTools.size;
  }

  /**
   * Get tool description
   */
  public getToolDescription(name: string): string | undefined {
    const tool = this.getTool(name);
    return tool?.description;
  }

  /**
   * Search tools by query (name or description match)
   */
  public searchTools(query: string): FunctionTool[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllTools().filter(
      (tool) =>
        tool.name.toLowerCase().includes(lowerQuery) ||
        tool.description.toLowerCase().includes(lowerQuery),
    );
  }

  /**
   * Get tools formatted for OpenAI-compatible APIs
   */
  public getToolsForOpenAI(): AITool[] {
    return this.getAllTools().map((tool) => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  /**
   * Get tool statistics
   */
  public getToolStats(): {
    total: number;
    static: number;
    dynamic: number;
  } {
    return {
      total: this.getToolCount(),
      static: allBrowserTools.length,
      dynamic: this.dynamicTools.size,
    };
  }

  /**
   * Register a dynamic tool (e.g., from skills system)
   */
  public registerDynamicTool(tool: FunctionTool): void {
    this.dynamicTools.set(tool.name, tool);
    console.log(`[ToolManager] Dynamic tool registered: ${tool.name}`);
    this._emit("tool_registered", { name: tool.name });
  }

  /**
   * Unregister a dynamic tool
   */
  public unregisterDynamicTool(name: string): boolean {
    const existed = this.dynamicTools.delete(name);
    if (existed) {
      console.log(`[ToolManager] Dynamic tool unregistered: ${name}`);
      this._emit("tool_unregistered", { name });
    }
    return existed;
  }

  /**
   * Clear all dynamic tools
   */
  public clearDynamicTools(): void {
    const names = Array.from(this.dynamicTools.keys());
    this.dynamicTools.clear();
    for (const name of names) {
      this._emit("tool_unregistered", { name });
    }
    console.log(`[ToolManager] Cleared ${names.length} dynamic tools`);
  }

  // ===== Event Subscription Methods =====

  /**
   * Subscribe to tool events
   */
  public subscribe(event: ToolEventType, callback: ToolSubscriber): () => void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    const eventSubscribers = this.subscribers.get(event);
    if (eventSubscribers) {
      eventSubscribers.add(callback);
    }

    // Return an unsubscribe function
    return () => this.unsubscribe(event, callback);
  }

  /**
   * Unsubscribe from tool events
   */
  public unsubscribe(event: ToolEventType, callback: ToolSubscriber): void {
    const eventSubscribers = this.subscribers.get(event);
    if (eventSubscribers) {
      eventSubscribers.delete(callback);
    }
  }

  /**
   * Emit an event
   */
  private _emit(event: ToolEventType, data: unknown): void {
    const eventSubscribers = this.subscribers.get(event);
    if (eventSubscribers) {
      eventSubscribers.forEach((callback) => {
        try {
          callback(data);
        } catch (e) {
          console.error(
            `[ToolManager] Error in subscriber for event "${event}":`,
            e,
          );
        }
      });
    }
  }
}

// Export singleton instance
export const toolManager = ToolManager.getInstance();

// Export convenience functions
export const getAllTools = () => toolManager.getAllTools();
export const getTool = (name: string) => toolManager.getTool(name);
export const hasTool = (name: string) => toolManager.hasTool(name);
export const getToolCount = () => toolManager.getToolCount();
export const getToolDescription = (name: string) =>
  toolManager.getToolDescription(name);
export const searchTools = (query: string) => toolManager.searchTools(query);
export const getToolsForOpenAI = () => toolManager.getToolsForOpenAI();
export const getToolStats = () => toolManager.getToolStats();
export const registerDynamicTool = (tool: FunctionTool) =>
  toolManager.registerDynamicTool(tool);
export const unregisterDynamicTool = (name: string) =>
  toolManager.unregisterDynamicTool(name);
export const clearDynamicTools = () => toolManager.clearDynamicTools();
