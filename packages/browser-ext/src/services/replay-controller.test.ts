import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ManualReplayController,
  type ReplayEventCallback,
  type ReplayStep,
} from "./replay-controller";

// Enhance chrome mock for tabs used by replay controller
beforeEach(() => {
  vi.useFakeTimers();

  // Reset chrome.tabs mocks
  const mockTabs = globalThis.chrome.tabs as any;
  mockTabs.create = vi.fn().mockResolvedValue({ id: 100 });
  mockTabs.update = vi.fn().mockResolvedValue({});
  mockTabs.get = vi.fn().mockResolvedValue({
    id: 100,
    url: "https://example.com",
  });
  mockTabs.query = vi
    .fn()
    .mockResolvedValue([{ id: 100, url: "https://example.com" }]);
  mockTabs.sendMessage = vi.fn().mockResolvedValue({ success: true });
  mockTabs.onUpdated = {
    addListener: vi.fn((cb: Function) => {
      // Immediately call with 'complete' to simulate page load
      setTimeout(() => cb(100, { status: "complete" }), 0);
    }),
    removeListener: vi.fn(),
  };
});

afterEach(() => {
  vi.useRealTimers();
});

function makeNavigationStep(url: string): ReplayStep {
  return {
    event: { type: "navigation", url },
    url,
    aiTitle: "Navigate",
    aiSummary: `Navigate to ${url}`,
  };
}

function makeClickStep(): ReplayStep {
  return {
    event: {
      type: "click",
      selector: "#btn",
      textSnippet: "Click me",
      rect: { x: 10, y: 20, width: 100, height: 40 },
      value: {
        tagName: "BUTTON",
        id: "btn",
        classes: [],
        attributes: {},
        elementDescription: "A button",
      },
    },
    url: "https://example.com",
    aiTitle: "Click button",
    aiSummary: "Click the button",
  };
}

describe("ManualReplayController", () => {
  it("initializes with idle status", () => {
    const controller = new ManualReplayController([
      makeNavigationStep("https://example.com"),
    ]);
    expect(controller.getStatus()).toBe("idle");
    expect(controller.getCurrentStepIndex()).toBe(0);
  });

  it("emits progress event on start", async () => {
    const callback: ReplayEventCallback = vi.fn();
    const steps = [makeNavigationStep("https://example.com")];
    const controller = new ManualReplayController(steps, callback);

    const startPromise = controller.start();
    await vi.advanceTimersByTimeAsync(2000);
    await startPromise;

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "progress",
        currentStep: 0,
        totalSteps: 1,
      }),
    );
  });

  it("can be stopped", () => {
    const steps = [makeNavigationStep("https://example.com")];
    const controller = new ManualReplayController(steps);

    controller.stop();
    expect(controller.getStatus()).toBe("idle");
  });

  it("can be paused", () => {
    const steps = [makeNavigationStep("https://example.com"), makeClickStep()];
    const controller = new ManualReplayController(steps);

    controller.pause();
    expect(controller.getStatus()).toBe("paused");
  });

  it("resume does nothing when not paused", async () => {
    const steps = [makeNavigationStep("https://example.com")];
    const controller = new ManualReplayController(steps);

    // Status is "idle", resume should be a no-op
    await controller.resume();
    expect(controller.getStatus()).toBe("idle");
  });

  it("skip current step increments index", async () => {
    const steps = [makeNavigationStep("https://a.com"), makeClickStep()];
    const controller = new ManualReplayController(steps);

    expect(controller.getCurrentStepIndex()).toBe(0);

    const skipPromise = controller.skipCurrentStep();
    await vi.advanceTimersByTimeAsync(5000);
    await skipPromise;

    // Should have advanced past step 0
    expect(controller.getCurrentStepIndex()).toBeGreaterThanOrEqual(1);
  });
});
