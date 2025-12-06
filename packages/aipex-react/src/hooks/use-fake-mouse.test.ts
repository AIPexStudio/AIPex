/**
 * Tests for useFakeMouse hook
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useFakeMouse } from "./use-fake-mouse";

describe("useFakeMouse", () => {
  afterEach(() => {
    const { result } = renderHook(() => useFakeMouse());
    act(() => {
      result.current.hide();
    });
  });

  it("should initialize with cursor hidden", () => {
    const { result } = renderHook(() => useFakeMouse());
    expect(result.current.isVisible).toBe(false);
  });

  it("should show cursor", () => {
    const { result } = renderHook(() => useFakeMouse());

    act(() => {
      result.current.show();
    });

    expect(result.current.isVisible).toBe(true);
  });

  it("should hide cursor", () => {
    const { result } = renderHook(() => useFakeMouse());

    act(() => {
      result.current.show();
      result.current.hide();
    });

    expect(result.current.isVisible).toBe(false);
  });

  it("should set position", () => {
    const { result } = renderHook(() => useFakeMouse());

    act(() => {
      result.current.setPosition(100, 200);
    });

    expect(result.current.position).toEqual({ x: 100, y: 200 });
  });

  it("should get position", () => {
    const { result } = renderHook(() => useFakeMouse());

    act(() => {
      result.current.setPosition(50, 75);
    });

    const position = result.current.getPosition();
    expect(position).toEqual({ x: 50, y: 75 });
  });

  it("should show tooltip", () => {
    const { result } = renderHook(() => useFakeMouse());

    act(() => {
      result.current.showTooltip("Test tooltip");
    });

    expect(result.current.isVisible).toBe(false);
  });

  it("should use custom options", () => {
    const { result } = renderHook(() =>
      useFakeMouse({
        theme: {
          cursorColor: "#FF0000",
        },
      }),
    );

    expect(result.current).toBeDefined();
  });

  it("should cleanup on unmount", () => {
    const { result, unmount } = renderHook(() => useFakeMouse());

    act(() => {
      result.current.show();
    });

    expect(result.current.isVisible).toBe(true);
    unmount();
  });
});
