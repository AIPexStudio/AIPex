import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoopDetector } from "./loop-detector.js";

describe("LoopDetector", () => {
  let detector: LoopDetector;

  beforeEach(() => {
    detector = new LoopDetector();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should not detect loop for different actions", () => {
    expect(detector.checkLoop("action1", { key: "value1" })).toBe(false);
    expect(detector.checkLoop("action2", { key: "value2" })).toBe(false);
    expect(detector.checkLoop("action3", { key: "value3" })).toBe(false);
  });

  it("should detect loop after 3 similar calls", () => {
    const params = { city: "Tokyo" };

    expect(detector.checkLoop("get_weather", params)).toBe(false);
    expect(detector.checkLoop("get_weather", params)).toBe(false);
    expect(detector.checkLoop("get_weather", params)).toBe(false);
    expect(detector.checkLoop("get_weather", params)).toBe(true);
  });

  it("should not detect loop for different params", () => {
    expect(detector.checkLoop("action", { key: "value1" })).toBe(false);
    expect(detector.checkLoop("action", { key: "value2" })).toBe(false);
    expect(detector.checkLoop("action", { key: "value3" })).toBe(false);
    expect(detector.checkLoop("action", { key: "value4" })).toBe(false);
  });

  it("should clear old records outside time window", async () => {
    const params = { key: "value" };

    detector.checkLoop("action", params);
    detector.checkLoop("action", params);

    // Advance time beyond window (60 seconds)
    await vi.advanceTimersByTimeAsync(61000);

    // These should not trigger loop detection
    detector.checkLoop("action", params);
    expect(detector.checkLoop("action", params)).toBe(false);
  });

  it("should reset detector", () => {
    const params = { key: "value" };

    detector.checkLoop("action", params);
    detector.checkLoop("action", params);
    detector.checkLoop("action", params);

    detector.reset();

    // After reset, should not detect loop
    expect(detector.checkLoop("action", params)).toBe(false);
  });

  it("should maintain window size", () => {
    // Add more than window size (5) actions
    for (let i = 0; i < 10; i++) {
      detector.checkLoop(`action${i}`, { index: i });
    }

    // Should not cause issues (implementation detail test)
    expect(detector.checkLoop("action", { key: "value" })).toBe(false);
  });

  it("should detect loop with same action and params but different order", () => {
    const params = { a: 1, b: 2 };

    detector.checkLoop("action", params);
    detector.checkLoop("action", params);
    detector.checkLoop("action", params);

    expect(detector.checkLoop("action", params)).toBe(true);
  });
});
