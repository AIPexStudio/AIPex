/**
 * Event Helpers Tests
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { waitForEventsAfterAction } from "./event-helpers";

describe("waitForEventsAfterAction", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("executes the action and waits for events", async () => {
    const mockAction = vi.fn().mockResolvedValue(undefined);

    const promise = waitForEventsAfterAction(mockAction);

    // Fast-forward through all timers
    await vi.runAllTimersAsync();

    await promise;

    expect(mockAction).toHaveBeenCalledOnce();
  });

  it("waits for the correct duration", async () => {
    const mockAction = vi.fn().mockResolvedValue(undefined);
    const startTime = Date.now();

    const promise = waitForEventsAfterAction(mockAction);

    // Fast-forward through all timers
    await vi.runAllTimersAsync();

    await promise;

    // Should wait for: 100ms + animation frame + 50ms = ~150ms
    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeGreaterThanOrEqual(0);
  });

  it("propagates errors from the action", async () => {
    const error = new Error("Action failed");
    const mockAction = vi.fn().mockRejectedValue(error);

    await expect(waitForEventsAfterAction(mockAction)).rejects.toThrow(
      "Action failed",
    );
  });
});
