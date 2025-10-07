/**
 * CancellationToken - A unified cancellation mechanism for async operations
 * Inspired by C#'s CancellationToken pattern
 */

type CancellationCallback = () => void;

export class CancellationToken {
  private _isCancelled = false;
  private _callbacks: Set<CancellationCallback> = new Set();
  private _abortController: AbortController | null = null;

  constructor() {
    this._abortController = new AbortController();
  }

  /**
   * Check if cancellation has been requested
   */
  get isCancelled(): boolean {
    return this._isCancelled;
  }

  /**
   * Get the underlying AbortSignal for fetch requests
   */
  get signal(): AbortSignal | undefined {
    return this._abortController?.signal;
  }

  /**
   * Request cancellation
   */
  cancel(): void {
    if (this._isCancelled) return;

    this._isCancelled = true;

    // Abort any fetch requests
    if (this._abortController) {
      this._abortController.abort();
      this._abortController = null;
    }

    // Execute all registered callbacks
    this._callbacks.forEach((callback) => {
      try {
        callback();
      } catch (e) {
        console.error("[CancellationToken] Error in cancellation callback:", e);
      }
    });

    this._callbacks.clear();
  }

  /**
   * Throw an error if cancellation has been requested
   */
  throwIfCancelled(): void {
    if (this._isCancelled) {
      throw new CancellationError("Operation was cancelled");
    }
  }

  /**
   * Register a callback to be called when cancellation is requested
   * Returns an unregister function
   */
  onCancelled(callback: CancellationCallback): () => void {
    if (this._isCancelled) {
      // Already cancelled, execute immediately
      callback();
      return () => {
        // No-op cleanup function
      };
    }

    this._callbacks.add(callback);
    return () => this._callbacks.delete(callback);
  }

  /**
   * Create a new child token that will be cancelled when this token is cancelled
   */
  createChild(): CancellationToken {
    const child = new CancellationToken();
    this.onCancelled(() => child.cancel());
    return child;
  }
}

export class CancellationError extends Error {
  constructor(message = "Operation was cancelled") {
    super(message);
    this.name = "CancellationError";
  }
}
