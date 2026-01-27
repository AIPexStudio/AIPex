import { beforeEach, describe, expect, it, vi } from "vitest";
import { DomElementHandle, DomLocator } from "./dom-locator";

const mockExecuteScript = vi.fn();

describe("DomLocator", () => {
  beforeEach(() => {
    mockExecuteScript.mockReset();
    global.chrome = {
      scripting: {
        executeScript: mockExecuteScript,
      },
    } as any;
  });

  it("executes dom action and returns bounding box", async () => {
    mockExecuteScript.mockResolvedValueOnce([
      {
        result: {
          success: true,
          data: { x: 10, y: 20, width: 100, height: 200 },
        },
      },
    ]);

    const locator = new DomLocator(1, "uid-1");
    const box = await locator.boundingBox();

    expect(box).toEqual({ x: 10, y: 20, width: 100, height: 200 });
    expect(mockExecuteScript).toHaveBeenCalled();
  });

  it("creates element handle that exposes a locator", () => {
    const handle = new DomElementHandle(1, "uid-2");
    expect(handle.asLocator()).toBeInstanceOf(DomLocator);
  });
});
