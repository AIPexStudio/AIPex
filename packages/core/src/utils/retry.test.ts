import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { retry, sleep } from "./retry.js";

describe("retry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should succeed on first attempt", async () => {
    const fn = vi.fn().mockResolvedValue("success");

    const promise = retry(fn);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should retry on failure and eventually succeed", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail1"))
      .mockRejectedValueOnce(new Error("fail2"))
      .mockResolvedValue("success");

    const promise = retry(fn, { maxAttempts: 3, initialDelayMs: 100 });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("should throw after max attempts", async () => {
    const error = new Error("persistent failure");
    const fn = vi.fn().mockRejectedValue(error);

    const promise = retry(fn, { maxAttempts: 3 });

    await vi.runAllTimersAsync();
    await expect(promise).rejects.toThrow("persistent failure");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("should use exponential backoff", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("fail"));
    const sleepSpy = vi.spyOn(global, "setTimeout");

    const promise = retry(fn, {
      maxAttempts: 3,
      initialDelayMs: 1000,
      backoffMultiplier: 2,
    });

    await vi.runAllTimersAsync();
    await expect(promise).rejects.toThrow();

    // First retry: 1000ms, Second retry: 2000ms
    const calls = sleepSpy.mock.calls;
    expect(calls.some((call) => call[1] === 1000)).toBe(true);
    expect(calls.some((call) => call[1] === 2000)).toBe(true);
  });

  it("should respect max delay", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("fail"));
    const sleepSpy = vi.spyOn(global, "setTimeout");

    const promise = retry(fn, {
      maxAttempts: 5,
      initialDelayMs: 1000,
      backoffMultiplier: 10,
      maxDelayMs: 3000,
    });

    await vi.runAllTimersAsync();
    await expect(promise).rejects.toThrow();

    const delays = sleepSpy.mock.calls.map((call) => call[1]);
    expect(Math.max(...delays)).toBeLessThanOrEqual(3000);
  });

  it("should respect shouldRetry predicate", async () => {
    const error1 = new Error("retryable");
    const error2 = new Error("non-retryable");
    const fn = vi
      .fn()
      .mockRejectedValueOnce(error1)
      .mockRejectedValueOnce(error2);

    const promise = retry(fn, {
      maxAttempts: 5,
      shouldRetry: (error) =>
        error instanceof Error && error.message !== "non-retryable",
    });

    await vi.runAllTimersAsync();
    await expect(promise).rejects.toThrow("non-retryable");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("sleep", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should resolve after specified time", async () => {
    const promise = sleep(1000);
    const callback = vi.fn();

    await promise.then(callback);

    expect(callback).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);
    await promise;

    expect(callback).toHaveBeenCalled();
  });
});
