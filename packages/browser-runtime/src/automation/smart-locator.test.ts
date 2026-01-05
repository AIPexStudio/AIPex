/**
 * Smart Locator Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SmartElementHandle, SmartLocator } from "./smart-locator";
import type { TextSnapshotNode } from "./types";

// Mock dependencies - hoisted to ensure they're available before imports
const mockSendCommand = vi.hoisted(() => vi.fn());
const mockSafeAttachDebugger = vi.hoisted(() => vi.fn());
const mockSafeDetachDebugger = vi.hoisted(() => vi.fn());

// Mock CdpCommander
vi.mock("./cdp-commander", () => ({
  CdpCommander: vi.fn().mockImplementation(() => ({
    sendCommand: mockSendCommand,
  })),
}));

// Mock debugger-manager
vi.mock("./debugger-manager", () => ({
  debuggerManager: {
    safeAttachDebugger: mockSafeAttachDebugger,
    safeDetachDebugger: mockSafeDetachDebugger,
  },
}));

describe("SmartLocator", () => {
  let mockNode: TextSnapshotNode;
  const tabId = 1;
  const backendDOMNodeId = 100;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeAttachDebugger.mockResolvedValue(true);
    mockSafeDetachDebugger.mockResolvedValue(undefined);

    mockNode = {
      id: "test-node-id",
      role: "textbox",
      name: "Test Input",
      children: [],
      backendDOMNodeId,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("fill", () => {
    it("should fill element using Monaco Editor API", async () => {
      const locator = new SmartLocator(tabId, mockNode, backendDOMNodeId);

      // Mock CDP commands for Monaco fill
      mockSendCommand
        .mockResolvedValueOnce(undefined) // DOM.enable
        .mockResolvedValueOnce(undefined) // DOM.scrollIntoViewIfNeeded
        .mockResolvedValueOnce({
          object: { objectId: "obj1" },
        }) // DOM.resolveNode
        .mockResolvedValueOnce({
          result: { value: true },
        }) // Runtime.callFunctionOn - tryFillMonaco success
        .mockResolvedValueOnce(undefined); // Runtime.releaseObject

      await expect(locator.fill("test value")).resolves.toBeUndefined();

      expect(mockSafeAttachDebugger).toHaveBeenCalledWith(tabId);
    });

    it("should fallback to universal fill strategy when Monaco not detected", async () => {
      const locator = new SmartLocator(tabId, mockNode, backendDOMNodeId);

      // Mock CDP commands for universal fill
      mockSendCommand
        .mockResolvedValueOnce(undefined) // DOM.enable
        .mockResolvedValueOnce(undefined) // DOM.scrollIntoViewIfNeeded
        .mockResolvedValueOnce({
          object: { objectId: "obj1" },
        }) // DOM.resolveNode
        .mockResolvedValueOnce({
          result: { value: false },
        }) // Runtime.callFunctionOn - tryFillMonaco returns false
        .mockResolvedValueOnce(undefined) // DOM.focus
        .mockResolvedValueOnce({
          result: { value: false },
        }) // Runtime.evaluate - platform check (not Mac)
        .mockResolvedValueOnce(undefined) // Input.dispatchKeyEvent - Ctrl down
        .mockResolvedValueOnce(undefined) // Input.dispatchKeyEvent - A down
        .mockResolvedValueOnce(undefined) // Input.dispatchKeyEvent - A up
        .mockResolvedValueOnce(undefined) // Input.dispatchKeyEvent - Ctrl up
        .mockResolvedValueOnce(undefined) // Input.insertText
        .mockResolvedValueOnce({
          object: { objectId: "obj2" },
        }) // DOM.resolveNode for events
        .mockResolvedValueOnce(undefined) // Runtime.callFunctionOn - dispatch events
        .mockResolvedValueOnce(undefined); // Runtime.releaseObject

      await expect(locator.fill("test value")).resolves.toBeUndefined();
    });

    it("should throw error when fill fails", async () => {
      const locator = new SmartLocator(tabId, mockNode, backendDOMNodeId);

      mockSendCommand
        .mockResolvedValueOnce(undefined) // DOM.enable
        .mockResolvedValueOnce(undefined) // DOM.scrollIntoViewIfNeeded
        .mockRejectedValueOnce(new Error("CDP error")); // DOM.resolveNode fails

      await expect(locator.fill("test value")).rejects.toThrow();
    });
  });

  describe("click", () => {
    it("should click element successfully", async () => {
      const locator = new SmartLocator(tabId, mockNode, backendDOMNodeId);

      // Mock CDP commands for click
      mockSendCommand
        .mockResolvedValueOnce(undefined) // DOM.enable
        .mockResolvedValueOnce(undefined) // DOM.scrollIntoViewIfNeeded
        .mockResolvedValueOnce({
          result: {
            value: {
              x: 100,
              y: 200,
              width: 50,
              height: 30,
            },
          },
        }) // Runtime.evaluate - getElementBoundingBox
        .mockResolvedValueOnce({
          result: {
            value: { found: true, isCovered: false },
          },
        }) // Runtime.evaluate - check if element is covered
        .mockResolvedValueOnce(undefined) // Input.dispatchMouseEvent - mousePressed
        .mockResolvedValueOnce(undefined); // Input.dispatchMouseEvent - mouseReleased

      await expect(locator.click()).resolves.toBeUndefined();
    });

    it("should handle double click", async () => {
      const locator = new SmartLocator(tabId, mockNode, backendDOMNodeId);

      mockSendCommand
        .mockResolvedValueOnce(undefined) // DOM.enable
        .mockResolvedValueOnce(undefined) // DOM.scrollIntoViewIfNeeded
        .mockResolvedValueOnce({
          result: {
            value: {
              x: 100,
              y: 200,
              width: 50,
              height: 30,
            },
          },
        }) // Runtime.evaluate - getElementBoundingBox
        .mockResolvedValueOnce({
          result: {
            value: { found: true, isCovered: false },
          },
        }) // Runtime.evaluate - check if element is covered (first click)
        .mockResolvedValueOnce(undefined) // Input.dispatchMouseEvent - mousePressed (first)
        .mockResolvedValueOnce(undefined) // Input.dispatchMouseEvent - mouseReleased (first)
        .mockResolvedValueOnce({
          result: {
            value: { found: true, isCovered: false },
          },
        }) // Runtime.evaluate - check if element is covered (second click)
        .mockResolvedValueOnce(undefined) // Input.dispatchMouseEvent - mousePressed (second)
        .mockResolvedValueOnce(undefined); // Input.dispatchMouseEvent - mouseReleased (second)

      await expect(locator.click({ count: 2 })).resolves.toBeUndefined();
    });

    it("should throw error when element not visible", async () => {
      const locator = new SmartLocator(tabId, mockNode, backendDOMNodeId);

      mockSendCommand
        .mockResolvedValueOnce(undefined) // DOM.enable
        .mockResolvedValueOnce(undefined) // DOM.scrollIntoViewIfNeeded
        .mockResolvedValueOnce({
          result: {
            value: {
              x: 100,
              y: 200,
              width: 0,
              height: 0,
            },
          },
        }); // Runtime.evaluate - zero size element

      await expect(locator.click()).rejects.toThrow();
    });

    it("should handle covered elements by dispatching click event", async () => {
      const locator = new SmartLocator(tabId, mockNode, backendDOMNodeId);

      mockSendCommand
        .mockResolvedValueOnce(undefined) // DOM.enable
        .mockResolvedValueOnce(undefined) // DOM.scrollIntoViewIfNeeded
        .mockResolvedValueOnce({
          result: {
            value: {
              x: 100,
              y: 200,
              width: 50,
              height: 30,
            },
          },
        }) // Runtime.evaluate - getElementBoundingBox
        .mockResolvedValueOnce({
          result: {
            value: { found: true, isCovered: true },
          },
        }) // Runtime.evaluate - element is covered
        .mockResolvedValueOnce({
          result: { value: true },
        }); // Runtime.evaluate - dispatch click event

      await expect(locator.click()).resolves.toBeUndefined();
    });
  });

  describe("hover", () => {
    it("should hover element successfully", async () => {
      const locator = new SmartLocator(tabId, mockNode, backendDOMNodeId);

      mockSendCommand
        .mockResolvedValueOnce(undefined) // DOM.enable
        .mockResolvedValueOnce(undefined) // DOM.scrollIntoViewIfNeeded
        .mockResolvedValueOnce({
          result: {
            value: {
              x: 100,
              y: 200,
              width: 50,
              height: 30,
            },
          },
        }) // Runtime.evaluate - getElementBoundingBox
        .mockResolvedValueOnce(undefined); // Input.dispatchMouseEvent - mouseMoved

      await expect(locator.hover()).resolves.toBeUndefined();
    });

    it("should throw error when element not visible", async () => {
      const locator = new SmartLocator(tabId, mockNode, backendDOMNodeId);

      mockSendCommand
        .mockResolvedValueOnce(undefined) // DOM.enable
        .mockResolvedValueOnce(undefined) // DOM.scrollIntoViewIfNeeded
        .mockResolvedValueOnce({
          result: {
            value: {
              x: 100,
              y: 200,
              width: 0,
              height: 0,
            },
          },
        }); // Runtime.evaluate - zero size element

      await expect(locator.hover()).rejects.toThrow();
    });
  });

  describe("boundingBox", () => {
    it("should return bounding box when element exists", async () => {
      const locator = new SmartLocator(tabId, mockNode, backendDOMNodeId);

      mockSendCommand
        .mockResolvedValueOnce(undefined) // DOM.enable
        .mockResolvedValueOnce({
          result: {
            value: {
              x: 100,
              y: 200,
              width: 50,
              height: 30,
            },
          },
        }); // Runtime.evaluate - getElementBoundingBox

      const box = await locator.boundingBox();

      expect(box).toEqual({
        x: 100,
        y: 200,
        width: 50,
        height: 30,
      });
    });

    it("should return null when debugger attach fails", async () => {
      mockSafeAttachDebugger.mockResolvedValueOnce(false);
      const locator = new SmartLocator(tabId, mockNode, backendDOMNodeId);

      const box = await locator.boundingBox();
      expect(box).toBeNull();
    });

    it("should return null when element not found", async () => {
      const locator = new SmartLocator(tabId, mockNode, backendDOMNodeId);

      mockSendCommand
        .mockResolvedValueOnce(undefined) // DOM.enable
        .mockResolvedValueOnce({
          result: { value: null },
        }); // Runtime.evaluate - element not found

      const box = await locator.boundingBox();
      expect(box).toBeNull();
    });
  });

  describe("getEditorValue", () => {
    it("should get value from Monaco Editor", async () => {
      const locator = new SmartLocator(tabId, mockNode, backendDOMNodeId);

      mockSendCommand
        .mockResolvedValueOnce(undefined) // DOM.enable
        .mockResolvedValueOnce({
          object: { objectId: "obj1" },
        }) // DOM.resolveNode
        .mockResolvedValueOnce({
          result: { value: "monaco editor content" },
        }); // Runtime.callFunctionOn - Monaco getValue

      const value = await locator.getEditorValue();

      expect(value).toBe("monaco editor content");
    });

    it("should get value from CodeMirror", async () => {
      const locator = new SmartLocator(tabId, mockNode, backendDOMNodeId);

      // Mock Monaco failing, CodeMirror succeeding
      mockSendCommand
        .mockResolvedValueOnce(undefined) // DOM.enable
        .mockResolvedValueOnce({
          object: { objectId: "obj1" },
        }) // DOM.resolveNode
        .mockResolvedValueOnce({
          result: {
            value: "codemirror content",
          },
        }); // Runtime.callFunctionOn - CodeMirror getValue

      const value = await locator.getEditorValue();

      expect(value).toBe("codemirror content");
    });

    it("should get value from standard input", async () => {
      const locator = new SmartLocator(tabId, mockNode, backendDOMNodeId);

      mockSendCommand
        .mockResolvedValueOnce(undefined) // DOM.enable
        .mockResolvedValueOnce({
          object: { objectId: "obj1" },
        }) // DOM.resolveNode
        .mockResolvedValueOnce({
          result: { value: "standard input value" },
        }); // Runtime.callFunctionOn - standard input value

      const value = await locator.getEditorValue();

      expect(value).toBe("standard input value");
    });

    it("should return null when element is not an editor", async () => {
      const locator = new SmartLocator(tabId, mockNode, backendDOMNodeId);

      mockSendCommand
        .mockResolvedValueOnce(undefined) // DOM.enable
        .mockResolvedValueOnce({
          object: { objectId: "obj1" },
        }) // DOM.resolveNode
        .mockResolvedValueOnce({
          result: { value: null },
        }); // Runtime.callFunctionOn - no editor value

      const value = await locator.getEditorValue();

      expect(value).toBeNull();
    });

    it("should return null when debugger attach fails", async () => {
      mockSafeAttachDebugger.mockResolvedValueOnce(false);
      const locator = new SmartLocator(tabId, mockNode, backendDOMNodeId);

      const value = await locator.getEditorValue();
      expect(value).toBeNull();
    });

    it("should return null when element cannot be resolved", async () => {
      const locator = new SmartLocator(tabId, mockNode, backendDOMNodeId);

      mockSendCommand
        .mockResolvedValueOnce(undefined) // DOM.enable
        .mockResolvedValueOnce({
          object: {},
        }); // DOM.resolveNode - no objectId

      const value = await locator.getEditorValue();
      expect(value).toBeNull();
    });
  });

  describe("dispose", () => {
    it("should detach debugger when disposing", () => {
      const locator = new SmartLocator(tabId, mockNode, backendDOMNodeId);

      locator.dispose();

      expect(mockSafeDetachDebugger).toHaveBeenCalledWith(tabId, true);
    });
  });
});

describe("SmartElementHandle", () => {
  const tabId = 1;
  const backendDOMNodeId = 100;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should create locator from element handle", () => {
    const mockNode: TextSnapshotNode = {
      id: "test-node",
      role: "button",
      children: [],
      backendDOMNodeId,
    };

    const handle = new SmartElementHandle(tabId, mockNode, backendDOMNodeId);
    const locator = handle.asLocator();

    expect(locator).toBeInstanceOf(SmartLocator);
  });

  it("should dispose locator when handle is disposed", () => {
    mockSafeDetachDebugger.mockResolvedValue(undefined);

    const mockNode: TextSnapshotNode = {
      id: "test-node",
      role: "button",
      children: [],
      backendDOMNodeId,
    };

    const handle = new SmartElementHandle(tabId, mockNode, backendDOMNodeId);
    handle.dispose();

    expect(mockSafeDetachDebugger).toHaveBeenCalledWith(tabId, true);
  });
});
