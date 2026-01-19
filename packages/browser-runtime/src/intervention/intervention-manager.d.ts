/**
 * Intervention Manager
 *
 * Core manager responsible for:
 * - Queue management (one intervention at a time)
 * - State tracking
 * - Timeout handling
 * - Page monitoring
 * - Mode checking
 * - Event notifications
 */
import type {
  InterventionEvent,
  InterventionEventType,
  InterventionMode,
  InterventionResult,
  InterventionState,
  InterventionType,
} from "./types.js";
type EventListener = (event: InterventionEvent) => void;
export declare class InterventionManager {
  private static instance;
  private currentIntervention;
  private requestQueue;
  private eventListeners;
  private abortController;
  private currentConversationMode;
  private initialized;
  private constructor();
  static getInstance(): InterventionManager;
  /**
   * Initialize the manager
   */
  initialize(): Promise<void>;
  /**
   * Set the intervention mode for the current conversation
   */
  setConversationMode(mode: InterventionMode): void;
  /**
   * Get the current conversation intervention mode
   */
  getConversationMode(): InterventionMode;
  /**
   * Request an intervention
   */
  requestIntervention(
    type: InterventionType,
    params?: unknown,
    timeout?: number,
    reason?: string,
  ): Promise<InterventionResult>;
  /**
   * Execute an intervention
   */
  private executeIntervention;
  /**
   * Cancel an intervention
   */
  cancelIntervention(id: string): boolean;
  /**
   * Handle timeout
   */
  private handleTimeout;
  /**
   * Process the next request in the queue
   */
  private processNextRequest;
  /**
   * Get the current intervention
   */
  getCurrentIntervention(): InterventionState | null;
  /**
   * Set up page monitoring
   */
  private setupPageMonitoring;
  /**
   * Add event listener
   */
  addEventListener(type: InterventionEventType, listener: EventListener): void;
  /**
   * Remove event listener
   */
  removeEventListener(
    type: InterventionEventType,
    listener: EventListener,
  ): void;
  /**
   * Emit event
   */
  private emitEvent;
  /**
   * Check if the manager is initialized
   */
  isInitialized(): boolean;
}
export declare const interventionManager: InterventionManager;
