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
  CdpCommander: class {
    sendCommand = mockSendCommand;
  },
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
    // Ensure mocked CDP always returns a Promise (important for code paths that call .catch()).
    mockSendCommand.mockImplementation(async () => undefined);

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

      let callFunctionOnCount = 0;
      mockSendCommand.mockImplementation(
        async (command: string, params: any) => {
          if (command === "DOM.enable") return undefined;
          if (command === "DOM.scrollIntoViewIfNeeded") return undefined;
          if (command === "DOM.resolveNode") {
            expect(params).toMatchObject({ backendNodeId: backendDOMNodeId });
            return { object: { objectId: "obj1" } };
          }
          if (command === "Runtime.callFunctionOn") {
            callFunctionOnCount++;
            // 1) addHighlight, 2) tryFillMonaco, 3) removeHighlight
            if (callFunctionOnCount === 2) {
              return { result: { value: true } };
            }
            return { result: { value: undefined } };
          }
          if (command === "Runtime.releaseObject") return undefined;
          return undefined;
        },
      );

      await expect(locator.fill("test value")).resolves.toBeUndefined();

      expect(mockSafeAttachDebugger).toHaveBeenCalledWith(tabId);
    });

    it("should fallback to universal fill strategy when Monaco not detected", async () => {
      const locator = new SmartLocator(tabId, mockNode, backendDOMNodeId);

      let callFunctionOnCount = 0;
      let resolveNodeCount = 0;
      mockSendCommand.mockImplementation(
        async (command: string, params: any) => {
          if (command === "DOM.enable") return undefined;
          if (command === "DOM.scrollIntoViewIfNeeded") return undefined;
          if (command === "DOM.resolveNode") {
            resolveNodeCount++;
            if (resolveNodeCount === 1) {
              expect(params).toMatchObject({ backendNodeId: backendDOMNodeId });
              return { object: { objectId: "obj1" } };
            }
            return { object: { objectId: "obj2" } };
          }
          if (command === "Runtime.callFunctionOn") {
            callFunctionOnCount++;
            // 1) addHighlight, 2) tryFillMonaco (false), 3) dispatch events, 4) removeHighlight
            if (callFunctionOnCount === 2) {
              return { result: { value: false } };
            }
            return { result: { value: undefined } };
          }
          if (command === "DOM.focus") return undefined;
          if (command === "Runtime.evaluate") {
            // platform check
            return { result: { value: false } };
          }
          if (command === "Input.dispatchKeyEvent") return undefined;
          if (command === "Input.insertText") return undefined;
          if (command === "Runtime.releaseObject") return undefined;
          return undefined;
        },
      );

      await expect(locator.fill("test value")).resolves.toBeUndefined();
    });

    it("should throw error when fill fails", async () => {
      const locator = new SmartLocator(tabId, mockNode, backendDOMNodeId);

      mockSendCommand.mockImplementation(async (command: string) => {
        if (command === "DOM.enable") return undefined;
        if (command === "DOM.scrollIntoViewIfNeeded") return undefined;
        if (command === "DOM.resolveNode") throw new Error("CDP error");
        return undefined;
      });

      await expect(locator.fill("test value")).rejects.toThrow();
    });
  });

  describe("click", () => {
    it("should click element successfully", async () => {
      const locator = new SmartLocator(tabId, mockNode, backendDOMNodeId);

      let resolveNodeCount = 0;
      let callFunctionOnCount = 0;
      mockSendCommand.mockImplementation(
        async (command: string, _params: any) => {
          if (command === "DOM.enable") return undefined;
          if (command === "DOM.scrollIntoViewIfNeeded") return undefined;
          if (command === "DOM.getContentQuads") {
            // Return a 50x30 rect at (100, 200)
            return {
              quads: [[100, 200, 150, 200, 150, 230, 100, 230]],
            };
          }
          if (command === "DOM.resolveNode") {
            resolveNodeCount++;
            // 1) highlight target, 2) isCovered target, 3) isCovered hit
            if (resolveNodeCount === 1)
              return { object: { objectId: "objTarget1" } };
            if (resolveNodeCount === 2)
              return { object: { objectId: "objTarget2" } };
            return { object: { objectId: "objHit" } };
          }
          if (command === "Runtime.callFunctionOn") {
            callFunctionOnCount++;
            // isCovered containment check should return true (not covered)
            if (callFunctionOnCount >= 2) {
              return { result: { value: true } };
            }
            return { result: { value: undefined } };
          }
          if (command === "Runtime.releaseObject") return undefined;
          if (command === "DOM.getNodeForLocation") {
            return { backendNodeId: backendDOMNodeId, frameId: "main" };
          }
          if (command === "Input.dispatchMouseEvent") return undefined;
          return undefined;
        },
      );

      await expect(locator.click()).resolves.toBeUndefined();
    });

    it("should handle double click", async () => {
      const locator = new SmartLocator(tabId, mockNode, backendDOMNodeId);

      mockSendCommand.mockImplementation(async (command: string) => {
        if (command === "DOM.enable") return undefined;
        if (command === "DOM.scrollIntoViewIfNeeded") return undefined;
        if (command === "DOM.getContentQuads") {
          return { quads: [[100, 200, 150, 200, 150, 230, 100, 230]] };
        }
        if (command === "DOM.getNodeForLocation") {
          return { backendNodeId: backendDOMNodeId, frameId: "main" };
        }
        if (command === "DOM.resolveNode") {
          return { object: { objectId: "obj" } };
        }
        if (command === "Runtime.callFunctionOn") {
          return { result: { value: true } };
        }
        if (command === "Runtime.releaseObject") return undefined;
        if (command === "Input.dispatchMouseEvent") return undefined;
        return undefined;
      });

      await expect(locator.click({ count: 2 })).resolves.toBeUndefined();
    });

    it("should throw error when element not visible", async () => {
      const locator = new SmartLocator(tabId, mockNode, backendDOMNodeId);

      mockSendCommand.mockImplementation(async (command: string) => {
        if (command === "DOM.enable") return undefined;
        if (command === "DOM.scrollIntoViewIfNeeded") return undefined;
        if (command === "DOM.getContentQuads") {
          // zero-size rect
          return { quads: [[100, 200, 100, 200, 100, 200, 100, 200]] };
        }
        if (command === "DOM.resolveNode")
          return { object: { objectId: "obj1" } };
        if (command === "Runtime.callFunctionOn")
          return { result: { value: true } };
        if (command === "Runtime.releaseObject") return undefined;
        return undefined;
      });

      await expect(locator.click()).rejects.toThrow();
    });

    it("should handle covered elements by falling back to JS click", async () => {
      const locator = new SmartLocator(tabId, mockNode, backendDOMNodeId);

      let callFunctionOnCount = 0;
      mockSendCommand.mockImplementation(async (command: string) => {
        if (command === "DOM.enable") return undefined;
        if (command === "DOM.scrollIntoViewIfNeeded") return undefined;
        if (command === "DOM.getContentQuads") {
          return { quads: [[100, 200, 150, 200, 150, 230, 100, 230]] };
        }
        if (command === "DOM.getNodeForLocation") {
          return { backendNodeId: backendDOMNodeId + 1, frameId: "main" };
        }
        if (command === "DOM.resolveNode")
          return { object: { objectId: "obj" } };
        if (command === "Runtime.callFunctionOn") {
          callFunctionOnCount++;
          // First: highlight; Second: contains check => false (covered); Third: JS click => true
          if (callFunctionOnCount === 2) return { result: { value: false } };
          return { result: { value: true } };
        }
        if (command === "Runtime.releaseObject") return undefined;
        if (command === "Input.dispatchMouseEvent") return undefined;
        return undefined;
      });

      await expect(locator.click()).resolves.toBeUndefined();
    });

    it("should still click via JS when bounding box cannot be computed", async () => {
      const locator = new SmartLocator(tabId, mockNode, backendDOMNodeId);

      let callFunctionOnCount = 0;
      mockSendCommand.mockImplementation(async (command: string) => {
        if (command === "DOM.enable") return undefined;
        if (command === "DOM.scrollIntoViewIfNeeded") return undefined;
        if (command === "DOM.getContentQuads") throw new Error("no layout");
        if (command === "DOM.getBoxModel") throw new Error("no layout");
        if (command === "DOM.resolveNode")
          return { object: { objectId: "obj" } };
        if (command === "Runtime.callFunctionOn") {
          callFunctionOnCount++;
          return { result: { value: true } };
        }
        if (command === "Runtime.releaseObject") return undefined;
        return undefined;
      });

      await expect(locator.click()).resolves.toBeUndefined();
      expect(callFunctionOnCount).toBeGreaterThan(0);
    });
  });

  describe("hover", () => {
    it("should hover element successfully", async () => {
      const locator = new SmartLocator(tabId, mockNode, backendDOMNodeId);

      mockSendCommand.mockImplementation(async (command: string) => {
        if (command === "DOM.enable") return undefined;
        if (command === "DOM.scrollIntoViewIfNeeded") return undefined;
        if (command === "DOM.getContentQuads") {
          return { quads: [[100, 200, 150, 200, 150, 230, 100, 230]] };
        }
        if (command === "DOM.resolveNode")
          return { object: { objectId: "obj1" } };
        if (command === "Runtime.callFunctionOn")
          return { result: { value: true } };
        if (command === "Runtime.releaseObject") return undefined;
        if (command === "Input.dispatchMouseEvent") return undefined;
        return undefined;
      });

      await expect(locator.hover()).resolves.toBeUndefined();
    });

    it("should throw error when element not visible", async () => {
      const locator = new SmartLocator(tabId, mockNode, backendDOMNodeId);

      mockSendCommand.mockImplementation(async (command: string) => {
        if (command === "DOM.enable") return undefined;
        if (command === "DOM.scrollIntoViewIfNeeded") return undefined;
        if (command === "DOM.getContentQuads") {
          return { quads: [[100, 200, 100, 200, 100, 200, 100, 200]] };
        }
        if (command === "DOM.resolveNode")
          return { object: { objectId: "obj1" } };
        if (command === "Runtime.callFunctionOn")
          return { result: { value: true } };
        if (command === "Runtime.releaseObject") return undefined;
        return undefined;
      });

      await expect(locator.hover()).rejects.toThrow();
    });
  });

  describe("boundingBox", () => {
    it("should return bounding box when element exists", async () => {
      const locator = new SmartLocator(tabId, mockNode, backendDOMNodeId);

      mockSendCommand.mockImplementation(async (command: string) => {
        if (command === "DOM.enable") return undefined;
        if (command === "DOM.getContentQuads") {
          return { quads: [[100, 200, 150, 200, 150, 230, 100, 230]] };
        }
        if (command === "DOM.getNodeForLocation") {
          return { backendNodeId: backendDOMNodeId, frameId: "main" };
        }
        if (command === "DOM.resolveNode")
          return { object: { objectId: "obj1" } };
        if (command === "Runtime.callFunctionOn")
          return { result: { value: true } };
        if (command === "Runtime.releaseObject") return undefined;
        return undefined;
      });

      const box = await locator.boundingBox();

      expect(box).toEqual({
        x: 100,
        y: 200,
        width: 50,
        height: 30,
      });
    });

    it("should accumulate iframe offsets when frameId is provided", async () => {
      const iframeNode: TextSnapshotNode = {
        ...mockNode,
        frameId: "child",
      };
      const locator = new SmartLocator(tabId, iframeNode, backendDOMNodeId);

      mockSendCommand.mockImplementation(
        async (command: string, params: any) => {
          if (command === "DOM.enable") return undefined;
          if (command === "DOM.getContentQuads") {
            if (params?.backendNodeId === backendDOMNodeId) {
              // element inside child frame at (10, 20) size 50x30
              return { quads: [[10, 20, 60, 20, 60, 50, 10, 50]] };
            }
            if (params?.backendNodeId === 200) {
              // iframe element in parent at (100, 150)
              return { quads: [[100, 150, 400, 150, 400, 350, 100, 350]] };
            }
            return { quads: [] };
          }
          if (command === "DOM.getNodeForLocation") {
            // Force base rect to be considered covered to test offset accumulation.
            return { backendNodeId: backendDOMNodeId + 1, frameId: "main" };
          }
          if (command === "Page.getFrameTree") {
            return {
              frameTree: {
                frame: { id: "main" },
                childFrames: [{ frame: { id: "child" } }],
              },
            };
          }
          if (command === "DOM.getFrameOwner") {
            return { backendNodeId: 200 };
          }
          if (command === "DOM.resolveNode")
            return { object: { objectId: "obj1" } };
          if (command === "Runtime.callFunctionOn")
            return { result: { value: true } };
          if (command === "Runtime.releaseObject") return undefined;
          return undefined;
        },
      );

      const box = await locator.boundingBox();
      expect(box).toEqual({
        x: 110,
        y: 170,
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

      mockSendCommand.mockImplementation(async (command: string) => {
        if (command === "DOM.enable") return undefined;
        if (command === "DOM.getContentQuads") return { quads: [] };
        if (command === "DOM.getBoxModel") return {};
        return undefined;
      });

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
