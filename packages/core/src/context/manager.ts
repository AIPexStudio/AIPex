/**
 * Context Manager
 * Central orchestrator for context providers
 */

import type {
  Context,
  ContextManagerOptions,
  ContextProvider,
  ContextQuery,
} from "./types";

/**
 * ContextManager orchestrates multiple context providers
 * Handles provider registration, querying, and lifecycle management
 */
export class ContextManager {
  private providers = new Map<string, ContextProvider>();
  private watchCallbacks = new Map<
    string,
    Set<(contexts: Context[]) => void>
  >();
  private watchUnsubscribers = new Map<string, () => void>();
  private autoInitialize: boolean;

  constructor(options: ContextManagerOptions = {}) {
    this.autoInitialize = options.autoInitialize ?? false;

    if (options.providers) {
      for (const provider of options.providers) {
        void this.registerProvider(provider);
      }
    }
  }

  /**
   * Register a context provider
   */
  async registerProvider(provider: ContextProvider): Promise<void> {
    if (this.providers.has(provider.id)) {
      throw new Error(
        `Provider with id "${provider.id}" is already registered`,
      );
    }

    this.providers.set(provider.id, provider);

    if (this.autoInitialize && provider.initialize) {
      await provider.initialize();
    }
  }

  /**
   * Unregister a context provider
   */
  async unregisterProvider(id: string): Promise<void> {
    const provider = this.providers.get(id);
    if (!provider) return;

    // Unsubscribe from watch callbacks
    const unsubscribe = this.watchUnsubscribers.get(id);
    if (unsubscribe) {
      unsubscribe();
      this.watchUnsubscribers.delete(id);
    }

    // Clear callbacks for this provider
    this.watchCallbacks.delete(id);

    // Dispose provider
    if (provider.dispose) {
      await provider.dispose();
    }

    this.providers.delete(id);
  }

  /**
   * Get all registered providers
   */
  getProviders(): ContextProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get a specific provider by ID
   */
  getProvider(id: string): ContextProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * Get contexts from all providers matching the query
   */
  async getContexts(query?: ContextQuery): Promise<Context[]> {
    const providers = query?.providerId
      ? ([this.providers.get(query.providerId)].filter(
          Boolean,
        ) as ContextProvider[])
      : Array.from(this.providers.values());

    const results = await Promise.allSettled(
      providers.map((provider) => provider.getContexts(query)),
    );

    const contexts = results
      .filter((result) => result.status === "fulfilled")
      .flatMap((result) => (result as PromiseFulfilledResult<Context[]>).value);

    let filtered = contexts;

    // Apply type filter
    if (query?.types && query.types.length > 0) {
      filtered = filtered.filter((ctx) => query.types!.includes(ctx.type));
    }

    // Apply search filter
    if (query?.search) {
      const searchLower = query.search.toLowerCase();
      filtered = filtered.filter(
        (ctx) =>
          ctx.label.toLowerCase().includes(searchLower) ||
          (typeof ctx.value === "string" &&
            ctx.value.toLowerCase().includes(searchLower)),
      );
    }

    // Apply limit
    if (query?.limit && query.limit > 0) {
      filtered = filtered.slice(0, query.limit);
    }

    return filtered;
  }

  /**
   * Get a specific context by ID
   * Tries all providers until the context is found
   */
  async getContext(id: string): Promise<Context | null> {
    for (const provider of this.providers.values()) {
      const context = await provider.getContext(id);
      if (context) return context;
    }
    return null;
  }

  /**
   * Watch a specific provider for context changes
   */
  watchProvider(
    providerId: string,
    callback: (contexts: Context[]) => void,
  ): () => void {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider "${providerId}" not found`);
    }

    if (!provider.watch) {
      throw new Error(`Provider "${providerId}" does not support watching`);
    }

    // Add callback to set
    if (!this.watchCallbacks.has(providerId)) {
      this.watchCallbacks.set(providerId, new Set());
    }
    this.watchCallbacks.get(providerId)!.add(callback);

    // If this is the first callback, start watching
    if (this.watchCallbacks.get(providerId)!.size === 1) {
      const unsubscribe = provider.watch((contexts) => {
        const callbacks = this.watchCallbacks.get(providerId);
        if (callbacks) {
          for (const cb of callbacks) {
            cb(contexts);
          }
        }
      });
      this.watchUnsubscribers.set(providerId, unsubscribe);
    }

    // Return unsubscribe function
    return () => {
      const callbacks = this.watchCallbacks.get(providerId);
      if (callbacks) {
        callbacks.delete(callback);

        // If no more callbacks, stop watching
        if (callbacks.size === 0) {
          const unsubscribe = this.watchUnsubscribers.get(providerId);
          if (unsubscribe) {
            unsubscribe();
            this.watchUnsubscribers.delete(providerId);
          }
          this.watchCallbacks.delete(providerId);
        }
      }
    };
  }

  /**
   * Initialize all providers
   */
  async initialize(): Promise<void> {
    const providers = Array.from(this.providers.values());
    await Promise.allSettled(
      providers.filter((p) => p.initialize).map((p) => p.initialize!()),
    );
  }

  /**
   * Dispose all providers and clean up
   */
  async dispose(): Promise<void> {
    // Unsubscribe from all watches
    for (const unsubscribe of this.watchUnsubscribers.values()) {
      unsubscribe();
    }
    this.watchUnsubscribers.clear();
    this.watchCallbacks.clear();

    // Dispose all providers
    const providers = Array.from(this.providers.values());
    await Promise.allSettled(
      providers.filter((p) => p.dispose).map((p) => p.dispose!()),
    );

    this.providers.clear();
  }
}
