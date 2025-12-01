/**
 * Context Provider Types
 * Framework-agnostic interfaces for context providers
 */

/**
 * Types of contexts that can be provided
 */
export type ContextType =
  | "page"
  | "tab"
  | "file"
  | "screenshot"
  | "bookmark"
  | "database"
  | "custom";

/**
 * A context item that provides additional information to the agent
 */
export interface Context {
  /**
   * Unique identifier for this context
   */
  id: string;

  /**
   * Type of context
   */
  type: ContextType;

  /**
   * ID of the provider that created this context
   */
  providerId: string;

  /**
   * Human-readable label for this context
   */
  label: string;

  /**
   * The actual context data
   * Can be string, File, or Blob depending on the context type
   */
  value: string | File | Blob;

  /**
   * Additional metadata about this context
   */
  metadata?: Record<string, unknown>;

  /**
   * Timestamp when this context was created
   */
  timestamp?: number;
}

/**
 * Query parameters for filtering contexts
 */
export interface ContextQuery {
  /**
   * Filter by context types
   */
  types?: ContextType[];

  /**
   * Filter by provider ID
   */
  providerId?: string;

  /**
   * Search query for filtering contexts
   */
  search?: string;

  /**
   * Maximum number of results to return
   */
  limit?: number;
}

/**
 * Capabilities of a context provider
 */
export interface ContextProviderCapabilities {
  /**
   * Whether the provider can list all available contexts
   */
  canList: boolean;

  /**
   * Whether the provider supports search functionality
   */
  canSearch: boolean;

  /**
   * Whether the provider can watch for context changes
   */
  canWatch: boolean;

  /**
   * Types of contexts this provider can produce
   */
  types: ContextType[];
}

/**
 * Context provider interface
 * All context providers must implement this interface
 */
export interface ContextProvider {
  /**
   * Unique identifier for this provider
   */
  id: string;

  /**
   * Human-readable name for this provider
   */
  name: string;

  /**
   * Optional description of what this provider does
   */
  description?: string;

  /**
   * Capabilities of this provider
   */
  capabilities: ContextProviderCapabilities;

  /**
   * Initialize the provider
   * Called when the provider is registered with a ContextManager
   */
  initialize?(): Promise<void>;

  /**
   * Dispose of the provider and clean up resources
   * Called when the provider is unregistered
   */
  dispose?(): Promise<void>;

  /**
   * Get all contexts matching the query
   * @param query - Optional query parameters for filtering
   * @returns Promise resolving to array of contexts
   */
  getContexts(query?: ContextQuery): Promise<Context[]>;

  /**
   * Get a specific context by ID
   * @param id - Context ID
   * @returns Promise resolving to context or null if not found
   */
  getContext(id: string): Promise<Context | null>;

  /**
   * Watch for context changes
   * @param callback - Function to call when contexts change
   * @returns Function to unsubscribe from changes
   */
  watch?(callback: (contexts: Context[]) => void): () => void;
}

/**
 * Configuration options for ContextManager
 */
export interface ContextManagerOptions {
  /**
   * Initial providers to register
   */
  providers?: ContextProvider[];

  /**
   * Whether to automatically initialize providers on registration
   */
  autoInitialize?: boolean;
}
