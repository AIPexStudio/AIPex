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

import { interventionRegistry } from "./intervention-registry.js";
import type {
  InterventionEvent,
  InterventionEventType,
  InterventionMode,
  InterventionRequest,
  InterventionResult,
  InterventionState,
  InterventionType,
} from "./types.js";

type EventListener = (event: InterventionEvent) => void;

export class InterventionManager {
  private static instance: InterventionManager;
  private currentIntervention: InterventionState | null = null;
  private requestQueue: InterventionRequest[] = [];
  private eventListeners: Map<InterventionEventType, Set<EventListener>> =
    new Map();
  private abortController: AbortController | null = null;
  private currentConversationMode: InterventionMode = "passive";
  private initialized = false;

  private constructor() {
    this.setupPageMonitoring();
  }

  static getInstance(): InterventionManager {
    if (!InterventionManager.instance) {
      InterventionManager.instance = new InterventionManager();
    }
    return InterventionManager.instance;
  }

  /**
   * Initialize the manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log("🔧 [InterventionManager] Initializing...");

    // Initialize registry
    await interventionRegistry.initialize();

    this.initialized = true;
    console.log("✅ [InterventionManager] Initialized successfully");
  }

  /**
   * Set the intervention mode for the current conversation
   */
  setConversationMode(mode: InterventionMode): void {
    this.currentConversationMode = mode;

    // If switching to disabled, cancel all ongoing interventions
    if (mode === "disabled" && this.currentIntervention) {
      this.cancelIntervention(this.currentIntervention.request.id);
    }
  }

  /**
   * Get the current conversation intervention mode
   */
  getConversationMode(): InterventionMode {
    return this.currentConversationMode;
  }

  /**
   * Request an intervention
   */
  async requestIntervention(
    type: InterventionType,
    params?: unknown,
    timeout = 300,
    reason?: string,
  ): Promise<InterventionResult> {
    // Check mode
    if (this.currentConversationMode === "disabled") {
      console.warn(
        "[InterventionManager] Intervention request rejected: mode is disabled",
      );
      return {
        success: false,
        error: "Intervention is disabled for this conversation",
        status: "cancelled",
        timestamp: Date.now(),
      };
    }

    // Check if intervention is available
    if (!interventionRegistry.isAvailable(type)) {
      return {
        success: false,
        error: `Intervention '${type}' is not available`,
        status: "error",
        timestamp: Date.now(),
      };
    }

    // Create request
    const request: InterventionRequest = {
      id: `intervention_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      params,
      timeout,
      reason,
      timestamp: Date.now(),
    };

    console.log(
      `[InterventionManager] New intervention request:`,
      request.id,
      type,
    );

    // If there's an ongoing intervention, queue this one
    if (this.currentIntervention) {
      console.log(
        "[InterventionManager] Queue intervention request (another is active)",
      );
      this.requestQueue.push(request);

      // Trigger event
      this.emitEvent("request", request.id, { request });

      // Wait for this request to be processed
      return new Promise((resolve) => {
        const checkQueue = setInterval(() => {
          if (
            !this.currentIntervention ||
            this.currentIntervention.request.id === request.id
          ) {
            clearInterval(checkQueue);
            this.executeIntervention(request).then(resolve);
          }
        }, 100);
      });
    }

    // Execute immediately
    return this.executeIntervention(request);
  }

  /**
   * Execute an intervention
   */
  private async executeIntervention(
    request: InterventionRequest,
  ): Promise<InterventionResult> {
    const startTime = Date.now();

    // Create state
    const state: InterventionState = {
      request,
      status: "pending",
      startTime,
    };

    this.currentIntervention = state;

    // Create AbortController
    this.abortController = new AbortController();

    // Set timeout
    const timeoutMs = (request.timeout || 300) * 1000;
    const timeoutHandle = setTimeout(() => {
      console.warn(`[InterventionManager] Intervention timeout: ${request.id}`);
      this.handleTimeout(request.id);
    }, timeoutMs);

    state.timeoutHandle = timeoutHandle;

    // Trigger start event with complete state
    this.emitEvent("start", request.id, { state });

    try {
      // Update status to active
      state.status = "active";

      // Execute intervention
      console.log(
        `[InterventionManager] Executing intervention: ${request.type}`,
      );
      const data = await interventionRegistry.execute(
        request.type,
        request.params,
        this.abortController.signal,
      );

      // Clear timeout
      clearTimeout(timeoutHandle);

      // Check if it was cancelled
      if (this.abortController.signal.aborted) {
        const result: InterventionResult = {
          success: false,
          error: "Intervention was cancelled",
          status: "cancelled",
          timestamp: Date.now(),
          duration: Date.now() - startTime,
        };

        state.status = "cancelled";
        state.result = result;
        state.endTime = Date.now();

        this.emitEvent("cancel", request.id, { result });
        this.processNextRequest();

        return result;
      }

      // Successfully completed
      const result: InterventionResult = {
        success: true,
        data,
        status: "completed",
        timestamp: Date.now(),
        duration: Date.now() - startTime,
      };

      state.status = "completed";
      state.result = result;
      state.endTime = Date.now();

      console.log(
        `✅ [InterventionManager] Intervention completed: ${request.id}`,
      );
      this.emitEvent("complete", request.id, { result });

      this.processNextRequest();

      return result;
    } catch (error) {
      // Clear timeout
      clearTimeout(timeoutHandle);

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `❌ [InterventionManager] Intervention error:`,
        errorMessage,
      );

      const result: InterventionResult = {
        success: false,
        error: errorMessage,
        status: "error",
        timestamp: Date.now(),
        duration: Date.now() - startTime,
      };

      state.status = "error";
      state.result = result;
      state.endTime = Date.now();

      this.emitEvent("error", request.id, { error: errorMessage, result });
      this.processNextRequest();

      return result;
    }
  }

  /**
   * Cancel an intervention
   */
  cancelIntervention(id: string): boolean {
    if (
      !this.currentIntervention ||
      this.currentIntervention.request.id !== id
    ) {
      console.warn(
        `[InterventionManager] Cannot cancel intervention ${id}: not current`,
      );
      return false;
    }

    console.log(`[InterventionManager] Cancelling intervention: ${id}`);

    // Cancel operation
    if (this.abortController) {
      this.abortController.abort();
    }

    // Clear timeout
    if (this.currentIntervention.timeoutHandle) {
      clearTimeout(this.currentIntervention.timeoutHandle);
    }

    const result: InterventionResult = {
      success: false,
      error: "Cancelled by user",
      status: "cancelled",
      timestamp: Date.now(),
      duration: Date.now() - this.currentIntervention.startTime,
    };

    this.currentIntervention.status = "cancelled";
    this.currentIntervention.result = result;
    this.currentIntervention.endTime = Date.now();

    this.emitEvent("cancel", id, { result });
    this.processNextRequest();

    return true;
  }

  /**
   * Handle timeout
   */
  private handleTimeout(id: string): void {
    if (
      !this.currentIntervention ||
      this.currentIntervention.request.id !== id
    ) {
      return;
    }

    console.warn(`[InterventionManager] Handling timeout for: ${id}`);

    // Cancel operation
    if (this.abortController) {
      this.abortController.abort();
    }

    const result: InterventionResult = {
      success: false,
      error: "Intervention timeout",
      status: "timeout",
      timestamp: Date.now(),
      duration: Date.now() - this.currentIntervention.startTime,
    };

    this.currentIntervention.status = "timeout";
    this.currentIntervention.result = result;
    this.currentIntervention.endTime = Date.now();

    this.emitEvent("timeout", id, { result });
    this.processNextRequest();
  }

  /**
   * Process the next request in the queue
   */
  private processNextRequest(): void {
    this.currentIntervention = null;
    this.abortController = null;

    // Process next request in queue
    if (this.requestQueue.length > 0) {
      const nextRequest = this.requestQueue.shift()!;
      console.log(
        `[InterventionManager] Processing next request from queue: ${nextRequest.id}`,
      );
      this.executeIntervention(nextRequest);
    }
  }

  /**
   * Get the current intervention
   */
  getCurrentIntervention(): InterventionState | null {
    return this.currentIntervention;
  }

  /**
   * Set up page monitoring
   */
  private setupPageMonitoring(): void {
    // Monitor tab switching
    chrome.tabs.onActivated?.addListener((activeInfo) => {
      if (this.currentIntervention?.tabId) {
        if (activeInfo.tabId !== this.currentIntervention.tabId) {
          console.log(
            "[InterventionManager] Tab switched, cancelling intervention",
          );
          this.cancelIntervention(this.currentIntervention.request.id);
        }
      }
    });

    // Monitor page updates
    chrome.tabs.onUpdated?.addListener((tabId, changeInfo) => {
      if (
        this.currentIntervention &&
        this.currentIntervention.tabId === tabId
      ) {
        // If URL changes, cancel intervention
        if (changeInfo.url) {
          console.log(
            "[InterventionManager] Page navigated, cancelling intervention",
          );
          this.cancelIntervention(this.currentIntervention.request.id);
        }
      }
    });
  }

  /**
   * Add event listener
   */
  addEventListener(type: InterventionEventType, listener: EventListener): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(
    type: InterventionEventType,
    listener: EventListener,
  ): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Emit event
   */
  private emitEvent(
    type: InterventionEventType,
    interventionId: string,
    data?: unknown,
  ): void {
    const event: InterventionEvent = {
      type,
      interventionId,
      data,
      timestamp: Date.now(),
    };

    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error(
            `[InterventionManager] Error in event listener for ${type}:`,
            error,
          );
        }
      });
    }
  }

  /**
   * Check if the manager is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const interventionManager = InterventionManager.getInstance();
