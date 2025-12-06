/**
 * Tests for FakeMouseController
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeMouseControllerImpl } from "./fake-mouse-controller";

describe("FakeMouseControllerImpl", () => {
  let controller: FakeMouseControllerImpl;

  beforeEach(() => {
    controller = new FakeMouseControllerImpl();
    vi.useFakeTimers();
  });

  afterEach(() => {
    controller.destroy();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("visibility", () => {
    it("should start hidden", () => {
      const state = controller.getState();
      expect(state.isVisible).toBe(false);
    });

    it("should show cursor", () => {
      controller.show();
      const state = controller.getState();
      expect(state.isVisible).toBe(true);
    });

    it("should hide cursor", () => {
      controller.show();
      controller.hide();
      const state = controller.getState();
      expect(state.isVisible).toBe(false);
    });
  });

  describe("position", () => {
    it("should set position", () => {
      controller.setPosition(100, 200);
      const position = controller.getPosition();
      expect(position).toEqual({ x: 100, y: 200 });
    });

    it("should get position", () => {
      controller.setPosition(50, 75);
      const state = controller.getState();
      expect(state.position).toEqual({ x: 50, y: 75 });
    });
  });

  describe("tooltip", () => {
    it("should show tooltip", () => {
      controller.showTooltip("Test tooltip");
      const state = controller.getState();
      expect(state.tooltip.visible).toBe(true);
      expect(state.tooltip.text).toBe("Test tooltip");
    });

    it("should hide tooltip", () => {
      controller.showTooltip("Test");
      controller.hideTooltip();
      const state = controller.getState();
      expect(state.tooltip.visible).toBe(false);
      expect(state.tooltip.dismissed).toBe(true);
    });

    it("should auto-hide tooltip after 5 seconds", () => {
      controller.showTooltip("Test");
      expect(controller.getState().tooltip.visible).toBe(true);

      vi.advanceTimersByTime(5000);
      expect(controller.getState().tooltip.visible).toBe(false);
    });

    it("should truncate to first two sentences", () => {
      controller.showTooltip(
        "First sentence. Second sentence. Third sentence.",
      );
      const state = controller.getState();
      expect(state.tooltip.text).toBe("First sentence. Second sentence.");
    });

    it("should handle Chinese sentence delimiters", () => {
      controller.showTooltip("第一句。第二句。第三句。");
      const state = controller.getState();
      expect(state.tooltip.text).toBe("第一句。第二句。");
    });
  });

  describe("center mode", () => {
    it("should enable center mode", () => {
      controller.enableCenterMode();
      const state = controller.getState();
      expect(state.centerMode).toBe(true);
      expect(state.isVisible).toBe(true);
    });

    it("should disable center mode", () => {
      controller.enableCenterMode();
      controller.disableCenterMode();
      const state = controller.getState();
      expect(state.centerMode).toBe(false);
      expect(state.isVisible).toBe(false);
    });
  });

  describe("state subscription", () => {
    it("should notify listeners on state change", () => {
      const listener = vi.fn();
      controller.subscribe(listener);

      controller.show();
      expect(listener).toHaveBeenCalled();
    });

    it("should unsubscribe listener", () => {
      const listener = vi.fn();
      const unsubscribe = controller.subscribe(listener);

      unsubscribe();
      controller.show();
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("theme", () => {
    it("should use default theme", () => {
      const theme = controller.getTheme();
      expect(theme.cursorColor).toBe("#3B82F6");
      expect(theme.cursorSize).toBe(48);
    });

    it("should use custom theme", () => {
      const customController = new FakeMouseControllerImpl({
        theme: {
          cursorColor: "#FF0000",
          cursorSize: 64,
        },
      });

      const theme = customController.getTheme();
      expect(theme.cursorColor).toBe("#FF0000");
      expect(theme.cursorSize).toBe(64);

      customController.destroy();
    });
  });
});
