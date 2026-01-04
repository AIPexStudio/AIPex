/**
 * Fake Mouse Helpers Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ElementHandle } from "../../automation";
import {
  playClickAnimationAndReturn,
  scrollAndMoveFakeMouseToElement,
} from "./fake-mouse";

// Mock chrome.tabs API
const mockSendMessage = vi.fn();
global.chrome = {
  tabs: {
    sendMessage: mockSendMessage,
  },
} as any;

describe("scrollAndMoveFakeMouseToElement", () => {
  let mockHandle: ElementHandle;

  beforeEach(() => {
    vi.useFakeTimers();
    mockSendMessage.mockClear();

    // Mock element handle
    mockHandle = {
      asLocator: vi.fn().mockReturnValue({
        boundingBox: vi.fn().mockResolvedValue({
          x: 100,
          y: 200,
          width: 50,
          height: 30,
        }),
      }),
      dispose: vi.fn(),
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("scrolls to element and moves fake mouse", async () => {
    mockSendMessage.mockResolvedValue({ success: true });

    const promise = scrollAndMoveFakeMouseToElement({
      tabId: 1,
      handle: mockHandle,
    });

    await vi.runAllTimersAsync();
    const result = await promise;

    // Should return the bounding box
    expect(result).toEqual({
      x: 100,
      y: 200,
      width: 50,
      height: 30,
    });

    // Should send scroll message
    expect(mockSendMessage).toHaveBeenCalledWith(1, {
      request: "scroll-to-coordinates",
      x: 125, // center x
      y: 215, // center y
    });

    // Should send mouse move message
    expect(mockSendMessage).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        request: "fake-mouse-move",
        x: expect.any(Number),
        y: expect.any(Number),
        duration: 350,
      }),
    );
  });

  it("handles missing bounding box gracefully", async () => {
    mockHandle = {
      asLocator: vi.fn().mockReturnValue({
        boundingBox: vi.fn().mockResolvedValue(null),
      }),
      dispose: vi.fn(),
    } as any;

    const promise = scrollAndMoveFakeMouseToElement({
      tabId: 1,
      handle: mockHandle,
    });

    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBeNull();
  });

  it("handles message errors gracefully", async () => {
    mockSendMessage.mockRejectedValue(new Error("Content script not ready"));

    const promise = scrollAndMoveFakeMouseToElement({
      tabId: 1,
      handle: mockHandle,
    });

    await vi.runAllTimersAsync();
    const result = await promise;

    // Should still return the bounding box despite message errors
    expect(result).toEqual({
      x: 100,
      y: 200,
      width: 50,
      height: 30,
    });
  });
});

describe("playClickAnimationAndReturn", () => {
  beforeEach(() => {
    mockSendMessage.mockClear();
  });

  it("sends click animation message", async () => {
    mockSendMessage.mockResolvedValue({ success: true });

    await playClickAnimationAndReturn(1);

    expect(mockSendMessage).toHaveBeenCalledWith(1, {
      request: "fake-mouse-play-click-animation",
    });
  });

  it("handles message errors gracefully", async () => {
    mockSendMessage.mockRejectedValue(new Error("Content script not ready"));

    // Should not throw
    await expect(playClickAnimationAndReturn(1)).resolves.toBeUndefined();
  });
});
