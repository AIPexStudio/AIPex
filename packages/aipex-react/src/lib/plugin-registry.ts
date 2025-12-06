/**
 * Plugin Registry
 * Manages content script plugins and their lifecycle
 */

import type {
  ContentScriptContext,
  ContentScriptPlugin,
} from "../types/plugin";

export class PluginRegistry {
  private plugins: Map<string, ContentScriptPlugin> = new Map();
  private context: ContentScriptContext | null = null;

  /**
   * Register a plugin
   */
  register(plugin: ContentScriptPlugin): void {
    if (this.plugins.has(plugin.name)) {
      console.warn(`Plugin "${plugin.name}" is already registered`);
      return;
    }

    this.plugins.set(plugin.name, plugin);

    // If context is already initialized, setup the plugin immediately
    if (this.context) {
      plugin.setup?.(this.context);
    }
  }

  /**
   * Unregister a plugin
   */
  async unregister(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      return;
    }

    await plugin.cleanup?.();
    this.plugins.delete(name);
  }

  /**
   * Get a plugin by name
   */
  get(name: string): ContentScriptPlugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Get all registered plugins
   */
  getAll(): ContentScriptPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Setup all plugins with context
   */
  async setup(context: ContentScriptContext): Promise<void> {
    this.context = context;

    for (const plugin of this.plugins.values()) {
      try {
        await plugin.setup?.(context);
      } catch (error) {
        console.error(`Failed to setup plugin "${plugin.name}":`, error);
      }
    }
  }

  /**
   * Cleanup all plugins
   */
  async cleanup(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      try {
        await plugin.cleanup?.();
      } catch (error) {
        console.error(`Failed to cleanup plugin "${plugin.name}":`, error);
      }
    }

    this.plugins.clear();
    this.context = null;
  }

  /**
   * Handle runtime message with all plugins
   */
  async handleMessage(message: any): Promise<void> {
    if (!this.context) {
      return;
    }

    for (const plugin of this.plugins.values()) {
      try {
        await plugin.onMessage?.(message, this.context);
      } catch (error) {
        console.error(
          `Plugin "${plugin.name}" failed to handle message:`,
          error,
        );
      }
    }
  }

  /**
   * Emit custom event to all plugins
   */
  emitEvent(event: string, data: any): void {
    if (!this.context) {
      return;
    }

    for (const plugin of this.plugins.values()) {
      try {
        plugin.onEvent?.(event, data, this.context);
      } catch (error) {
        console.error(
          `Plugin "${plugin.name}" failed to handle event "${event}":`,
          error,
        );
      }
    }
  }
}

/**
 * Default global plugin registry
 */
export const globalPluginRegistry = new PluginRegistry();
