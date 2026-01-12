/**
 * Tests for FakeMouse component
 */

import { act, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FakeMouse } from "./fake-mouse";
import type { FakeMouseController } from "./types";

describe("FakeMouse", () => {
  it("should not render when invisible", () => {
    const { container } = render(<FakeMouse />);
    expect(container.querySelector("svg")).toBeNull();
  });

  it("should call onReady with controller", () => {
    const onReady = vi.fn();
    render(<FakeMouse onReady={onReady} />);

    expect(onReady).toHaveBeenCalled();
    const call = onReady.mock.calls[0];
    expect(call?.[0]).toBeDefined();
    const controller: FakeMouseController = call?.[0];
    expect(controller.show).toBeDefined();
    expect(controller.hide).toBeDefined();
    expect(controller.moveTo).toBeDefined();
  });

  it("should render cursor when visible", async () => {
    let controller: FakeMouseController | null = null;

    render(
      <FakeMouse
        onReady={(ctrl) => {
          controller = ctrl;
        }}
      />,
    );

    await waitFor(() => {
      expect(controller).not.toBeNull();
    });

    await act(async () => {
      controller!.show();
    });

    await waitFor(() => {
      const svg = document.querySelector("svg");
      expect(svg).not.toBeNull();
    });
  });

  it("should render tooltip when visible", async () => {
    let controller: FakeMouseController | null = null;

    render(
      <FakeMouse
        onReady={(ctrl) => {
          controller = ctrl;
        }}
      />,
    );

    await waitFor(() => {
      expect(controller).not.toBeNull();
    });

    await act(async () => {
      controller!.show();
      controller!.showTooltip("Test tooltip");
    });

    await waitFor(() => {
      const tooltipText = document.body.textContent;
      expect(tooltipText).toContain("Test tooltip");
    });
  });

  it("should apply custom theme", async () => {
    let controller: FakeMouseController | null = null;

    render(
      <FakeMouse
        options={{
          theme: {
            cursorColor: "#FF0000",
            cursorSize: 64,
          },
        }}
        onReady={(ctrl) => {
          controller = ctrl;
        }}
      />,
    );

    await waitFor(() => {
      expect(controller).not.toBeNull();
    });

    await act(async () => {
      controller!.show();
    });

    await waitFor(() => {
      const cursor = document.querySelector('[style*="width"]');
      expect(cursor).not.toBeNull();
    });
  });

  it("should cleanup on unmount", async () => {
    let controller: FakeMouseController | null = null;

    const { unmount } = render(
      <FakeMouse
        onReady={(ctrl) => {
          controller = ctrl;
        }}
      />,
    );

    await waitFor(() => {
      expect(controller).not.toBeNull();
    });

    await act(async () => {
      controller!.show();
    });

    await waitFor(() => {
      const svg = document.querySelector("svg");
      expect(svg).not.toBeNull();
    });

    await act(async () => {
      unmount();
    });

    await waitFor(() => {
      const svg = document.querySelector("svg");
      expect(svg).toBeNull();
    });
  });
});
