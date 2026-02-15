/**
 * User Manual Replay Controller
 *
 * Manages the execution of user manual replay steps,
 * including navigation and click events.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReplayStep {
  id?: number;
  event:
    | NavigationEvent
    | ClickEvent
    | { type: string; [key: string]: unknown };
  url: string | null;
  aiTitle: string | null;
  aiSummary: string | null;
}

export interface ClickEvent {
  type: "click";
  selector: string;
  textSnippet: string;
  rect: { x: number; y: number; width: number; height: number };
  value: {
    tagName: string;
    id: string;
    classes: string[];
    attributes: Record<string, string>;
    elementDescription: string;
  };
}

export interface NavigationEvent {
  type: "navigation";
  url: string;
}

export interface ExecutionResult {
  success: boolean;
  error?: string;
  details?: unknown;
}

export type ReplayStatus =
  | "idle"
  | "running"
  | "paused"
  | "completed"
  | "error";

export type ReplayEventCallback = (event: {
  type:
    | "progress"
    | "complete"
    | "error"
    | "step-start"
    | "step-complete"
    | "step-error";
  currentStep?: number;
  totalSteps?: number;
  error?: string;
  stepData?: ReplayStep;
  result?: ExecutionResult;
}) => void;

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export class ManualReplayController {
  private steps: ReplayStep[];
  private currentStepIndex = 0;
  private status: ReplayStatus = "idle";
  private eventCallback?: ReplayEventCallback;
  private targetTabId?: number;
  private abortController?: AbortController;

  constructor(steps: ReplayStep[], eventCallback?: ReplayEventCallback) {
    this.steps = steps;
    this.eventCallback = eventCallback;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /** Start replay from a specific step */
  async start(startFromStep = 0): Promise<void> {
    if (this.status === "running") return;

    this.currentStepIndex = startFromStep;
    this.status = "running";
    this.abortController = new AbortController();

    this.emitEvent({
      type: "progress",
      currentStep: this.currentStepIndex,
      totalSteps: this.steps.length,
    });

    try {
      await this.executeNextStep();
    } catch (error) {
      this.status = "error";
      this.emitEvent({
        type: "error",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /** Stop replay */
  stop(): void {
    this.status = "idle";
    this.abortController?.abort();
    this.hideSpotlight();
  }

  /** Pause replay */
  pause(): void {
    this.status = "paused";
  }

  /** Resume replay from paused state */
  async resume(): Promise<void> {
    if (this.status !== "paused") return;
    this.status = "running";
    await this.executeNextStep();
  }

  /** Retry current step */
  async retryCurrentStep(): Promise<void> {
    this.status = "running";
    await this.executeNextStep();
  }

  /** Skip current step and move to next */
  async skipCurrentStep(): Promise<void> {
    this.currentStepIndex++;
    this.status = "running";
    await this.executeNextStep();
  }

  getStatus(): ReplayStatus {
    return this.status;
  }

  getCurrentStepIndex(): number {
    return this.currentStepIndex;
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  private async executeNextStep(): Promise<void> {
    if (this.abortController?.signal.aborted) return;

    if (this.currentStepIndex >= this.steps.length) {
      this.status = "completed";
      this.emitEvent({ type: "complete" });
      this.hideSpotlight();
      return;
    }

    if (this.status === "paused") return;

    const step = this.steps[this.currentStepIndex]!;

    this.emitEvent({
      type: "step-start",
      currentStep: this.currentStepIndex,
      totalSteps: this.steps.length,
      stepData: step,
    });

    try {
      const result = await this.executeStep(step);

      if (result.success) {
        this.emitEvent({
          type: "step-complete",
          currentStep: this.currentStepIndex,
          totalSteps: this.steps.length,
          result,
        });
        this.currentStepIndex++;
        await new Promise((r) => setTimeout(r, 1500));
        await this.executeNextStep();
      } else {
        this.status = "paused";
        this.emitEvent({
          type: "step-error",
          currentStep: this.currentStepIndex,
          totalSteps: this.steps.length,
          error: result.error,
          result,
        });
      }
    } catch (error) {
      this.status = "paused";
      this.emitEvent({
        type: "step-error",
        currentStep: this.currentStepIndex,
        totalSteps: this.steps.length,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async executeStep(step: ReplayStep): Promise<ExecutionResult> {
    const event = step.event as { type: string; [key: string]: unknown };
    if (!event?.type) {
      return { success: false, error: "Invalid event data" };
    }

    switch (event.type) {
      case "navigation":
        return this.executeNavigation(event as NavigationEvent, step);
      case "click":
        return this.executeClick(event as ClickEvent, step);
      default:
        return { success: false, error: `Unknown event type: ${event.type}` };
    }
  }

  // --- Navigation ---

  private async executeNavigation(
    event: NavigationEvent,
    step: ReplayStep,
  ): Promise<ExecutionResult> {
    try {
      const url = event.url || step.url;
      if (!url)
        return { success: false, error: "No URL provided for navigation" };

      if (this.targetTabId) {
        await chrome.tabs.update(this.targetTabId, { url, active: true });
      } else {
        const tab = await chrome.tabs.create({ url, active: true });
        this.targetTabId = tab.id;
      }

      await this.waitForTabLoad();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // --- Click ---

  private async executeClick(
    event: ClickEvent,
    step: ReplayStep,
  ): Promise<ExecutionResult> {
    try {
      let tabId = this.targetTabId;
      if (!tabId) {
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (!tabs[0]?.id) {
          return { success: false, error: "No active tab found" };
        }
        tabId = tabs[0].id;
        this.targetTabId = tabId;
      }

      // Validate tab is accessible
      let tab: chrome.tabs.Tab;
      try {
        tab = await chrome.tabs.get(tabId);
      } catch {
        return {
          success: false,
          error: "Target tab no longer exists. Please ensure the tab is open.",
        };
      }

      if (
        tab.url &&
        !tab.url.startsWith("http://") &&
        !tab.url.startsWith("https://")
      ) {
        return {
          success: false,
          error:
            "Cannot execute on this page. Only http/https pages are supported.",
        };
      }

      // Navigate to correct URL if needed
      if (step.url && tab.url && !tab.url.startsWith(step.url)) {
        await chrome.tabs.update(tabId, { url: step.url });
        await this.waitForTabLoad();
      }

      // Send click to content script with retry
      const maxRetries = 3;
      const retryDelay = 1000;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const response = await chrome.tabs.sendMessage(tabId, {
            request: "REPLAY_EXECUTE_CLICK",
            eventData: event,
            explanation: step.aiSummary || step.aiTitle,
            stepUrl: step.url,
          });

          if (response?.success) {
            return { success: true, details: response };
          }
          return {
            success: false,
            error: response?.error || "Click execution failed",
            details: response,
          };
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);

          if (
            (msg.includes("Receiving end does not exist") ||
              msg.includes("Could not establish connection")) &&
            attempt < maxRetries
          ) {
            await new Promise((r) => setTimeout(r, retryDelay));
            continue;
          }

          if (attempt === maxRetries) {
            return {
              success: false,
              error:
                "Could not connect to the page. The page may have been closed or navigated away.",
            };
          }
          return { success: false, error: msg };
        }
      }

      return {
        success: false,
        error: "Failed to execute click after multiple attempts",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // --- Helpers ---

  private waitForTabLoad(): Promise<void> {
    return new Promise((resolve) => {
      const listener = (
        tabId: number,
        changeInfo: chrome.tabs.TabChangeInfo,
      ) => {
        if (tabId === this.targetTabId && changeInfo.status === "complete") {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
      // Timeout after 30 s
      setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }, 30_000);
    });
  }

  private hideSpotlight(): void {
    chrome.tabs
      .query({ active: true, currentWindow: true })
      .then((tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs
            .sendMessage(tabs[0].id, {
              request: "ui-guider-hide-spotlight",
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }

  private emitEvent(event: Parameters<ReplayEventCallback>[0]): void {
    try {
      this.eventCallback?.(event);
    } catch {
      // Prevent callback errors from breaking the controller
    }
  }
}
