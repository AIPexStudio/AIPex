import { beforeEach, describe, expect, it, vi } from "vitest";
import { DomElementHandle } from "./dom-element-handle";
import { DomLocator } from "./dom-locator";

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

  it("executes dom action and returns bounding box response", async () => {
    mockExecuteScript.mockResolvedValueOnce([
      {
        result: {
          success: true,
          data: { x: 10, y: 20, width: 100, height: 200 },
        },
      },
    ]);

    const locator = new DomLocator(1);
    const response = await locator.boundingBox("uid-1");

    expect(response).toEqual({
      success: true,
      data: { x: 10, y: 20, width: 100, height: 200 },
    });
    expect(mockExecuteScript).toHaveBeenCalled();
  });

  it("creates element handle that exposes a locator", () => {
    const mockNode = {
      id: "uid-2",
      role: "button",
      name: "Test Button",
      children: [],
    };
    const handle = new DomElementHandle(1, mockNode);
    expect(handle.asLocator()).toBeDefined();
    expect(typeof handle.asLocator().click).toBe("function");
    expect(typeof handle.asLocator().fill).toBe("function");
  });
});
