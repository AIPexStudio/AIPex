import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StreamBuffer } from "./stream-buffer.js";

describe("StreamBuffer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should buffer text and emit after delay", async () => {
    const buffer = new StreamBuffer(50, 1024);
    const emit = vi.fn();

    buffer.add("Hello", emit);
    expect(emit).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(50);
    expect(emit).toHaveBeenCalledWith("Hello");
    expect(emit).toHaveBeenCalledTimes(1);
  });

  it("should accumulate multiple additions", async () => {
    const buffer = new StreamBuffer(50, 1024);
    const emit = vi.fn();

    buffer.add("Hello ", emit);
    buffer.add("World", emit);

    await vi.advanceTimersByTimeAsync(50);
    expect(emit).toHaveBeenCalledWith("Hello World");
    expect(emit).toHaveBeenCalledTimes(1);
  });

  it("should flush immediately when buffer size exceeds limit", () => {
    const buffer = new StreamBuffer(50, 10);
    const emit = vi.fn();

    buffer.add("This is a very long text", emit);

    expect(emit).toHaveBeenCalledWith("This is a very long text");
    expect(emit).toHaveBeenCalledTimes(1);
  });

  it("should clear buffer after flush", async () => {
    const buffer = new StreamBuffer(50, 1024);
    const emit = vi.fn();

    buffer.add("Hello", emit);
    await vi.advanceTimersByTimeAsync(50);

    expect(buffer.pending).toBe("");
  });

  it("should support manual flush", () => {
    const buffer = new StreamBuffer(50, 1024);
    const emit = vi.fn();

    buffer.add("Hello", emit);
    buffer.flush(emit);

    expect(emit).toHaveBeenCalledWith("Hello");
    expect(buffer.pending).toBe("");
  });

  it("should dispose and clear timer", async () => {
    const buffer = new StreamBuffer(50, 1024);
    const emit = vi.fn();

    buffer.add("Hello", emit);
    buffer.dispose();

    await vi.advanceTimersByTimeAsync(50);
    expect(emit).not.toHaveBeenCalled();
    expect(buffer.pending).toBe("");
  });

  it("should not emit if buffer is empty", () => {
    const buffer = new StreamBuffer(50, 1024);
    const emit = vi.fn();

    buffer.flush(emit);
    expect(emit).not.toHaveBeenCalled();
  });

  it("should reset timer on each flush", async () => {
    const buffer = new StreamBuffer(50, 1024);
    const emit = vi.fn();

    buffer.add("First", emit);
    await vi.advanceTimersByTimeAsync(50);

    buffer.add("Second", emit);
    await vi.advanceTimersByTimeAsync(50);

    expect(emit).toHaveBeenCalledTimes(2);
    expect(emit).toHaveBeenNthCalledWith(1, "First");
    expect(emit).toHaveBeenNthCalledWith(2, "Second");
  });
});
