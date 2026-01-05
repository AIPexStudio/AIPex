/**
 * Snapshot Manager Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SnapshotManager } from "./snapshot-manager";
import type { AccessibilityTree, TextSnapshot } from "./types";

// Mock dependencies - hoisted to ensure they're available before imports
const mockSendCommand = vi.hoisted(() => vi.fn());
const mockSafeAttachDebugger = vi.hoisted(() => vi.fn());
const mockSafeDetachDebugger = vi.hoisted(() => vi.fn());
const mockExecuteScript = vi.hoisted(() => vi.fn());

// Mock chrome.debugger.sendCommand
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

// Mock chrome.scripting
global.chrome = {
  scripting: {
    executeScript: mockExecuteScript,
  },
  debugger: {
    sendCommand: vi.fn(),
    attach: vi.fn((_, __, callback) => callback()),
    detach: vi.fn((_, callback) => callback()),
    onDetach: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  tabs: {
    onRemoved: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  runtime: {
    lastError: null,
  },
} as any;

describe("SnapshotManager", () => {
  let snapshotManager: SnapshotManager;

  beforeEach(() => {
    vi.clearAllMocks();
    snapshotManager = new SnapshotManager();
    mockSafeAttachDebugger.mockResolvedValue(true);
    mockSafeDetachDebugger.mockResolvedValue(undefined);
    mockExecuteScript.mockResolvedValue([{ result: false }]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createSnapshot", () => {
    it("should create a snapshot from accessibility tree", async () => {
      const mockAXTree: AccessibilityTree = {
        nodes: [
          {
            nodeId: "1",
            ignored: false,
            role: { type: "string", value: "RootWebArea" },
            name: { type: "string", value: "Test Page" },
            backendDOMNodeId: 1,
          },
          {
            nodeId: "2",
            ignored: false,
            role: { type: "string", value: "button" },
            name: { type: "string", value: "Click Me" },
            parentId: "1",
            backendDOMNodeId: 2,
          },
        ],
      };

      // Mock CDP commands
      mockSendCommand
        .mockResolvedValueOnce(undefined) // Accessibility.enable
        .mockResolvedValueOnce(mockAXTree) // Accessibility.getFullAXTree
        .mockResolvedValueOnce(undefined) // DOM.enable
        .mockResolvedValueOnce({}) // DOM.getDocument
        .mockResolvedValueOnce({
          object: { objectId: "obj1" },
        }) // DOM.resolveNode for node 1
        .mockResolvedValueOnce({
          result: { value: { existingId: null, tagName: "html" } },
        }) // Runtime.callFunctionOn for node 1
        .mockResolvedValueOnce(undefined) // Runtime.releaseObject for node 1
        .mockResolvedValueOnce({
          object: { objectId: "obj2" },
        }) // DOM.resolveNode for node 2
        .mockResolvedValueOnce({
          result: { value: { existingId: null, tagName: "button" } },
        }) // Runtime.callFunctionOn for node 2
        .mockResolvedValueOnce(undefined) // Runtime.releaseObject for node 2
        .mockResolvedValueOnce(undefined) // DOM.disable
        .mockResolvedValueOnce(undefined) // DOM.enable (for injection)
        .mockResolvedValueOnce({}) // DOM.getDocument (for injection)
        .mockResolvedValueOnce({
          object: { objectId: "obj1" },
        }) // DOM.resolveNode for injection node 1
        .mockResolvedValueOnce({
          result: { value: true },
        }) // Runtime.callFunctionOn for injection node 1
        .mockResolvedValueOnce(undefined) // Runtime.releaseObject for injection node 1
        .mockResolvedValueOnce({
          object: { objectId: "obj2" },
        }) // DOM.resolveNode for injection node 2
        .mockResolvedValueOnce({
          result: { value: true },
        }) // Runtime.callFunctionOn for injection node 2
        .mockResolvedValueOnce(undefined) // Runtime.releaseObject for injection node 2
        .mockResolvedValueOnce(undefined); // DOM.disable (for injection)

      const snapshot = await snapshotManager.createSnapshot(1);

      expect(snapshot).toBeDefined();
      expect(snapshot.tabId).toBe(1);
      expect(snapshot.root).toBeDefined();
      expect(snapshot.idToNode.size).toBeGreaterThan(0);
      expect(mockSafeAttachDebugger).toHaveBeenCalled();
    });

    it("should throw error when no accessibility nodes found", async () => {
      mockSendCommand
        .mockResolvedValueOnce(undefined) // Accessibility.enable
        .mockResolvedValueOnce({ nodes: [] }); // Empty accessibility tree

      await expect(snapshotManager.createSnapshot(1)).rejects.toThrow(
        "No accessibility nodes found",
      );
    });

    it("should handle debugger attach failure gracefully", async () => {
      mockSafeAttachDebugger.mockResolvedValueOnce(false);

      const mockAXTree: AccessibilityTree = {
        nodes: [
          {
            nodeId: "1",
            ignored: false,
            role: { type: "string", value: "RootWebArea" },
            backendDOMNodeId: 1,
          },
        ],
      };

      mockSendCommand
        .mockResolvedValueOnce(undefined) // Accessibility.enable
        .mockResolvedValueOnce(mockAXTree); // Accessibility.getFullAXTree

      await expect(snapshotManager.createSnapshot(1)).rejects.toThrow();
    });
  });

  describe("getSnapshot", () => {
    it("should return snapshot if exists", async () => {
      const _mockSnapshot: TextSnapshot = {
        root: {
          id: "root",
          role: "RootWebArea",
          name: "Test",
          children: [],
        },
        idToNode: new Map([
          ["root", { id: "root", role: "RootWebArea", children: [] }],
        ]),
        tabId: 1,
      };

      // Create snapshot first
      const mockAXTree: AccessibilityTree = {
        nodes: [
          {
            nodeId: "1",
            ignored: false,
            role: { type: "string", value: "RootWebArea" },
            name: { type: "string", value: "Test" },
            backendDOMNodeId: 1,
          },
        ],
      };

      mockSendCommand
        .mockResolvedValueOnce(undefined) // Accessibility.enable
        .mockResolvedValueOnce(mockAXTree) // Accessibility.getFullAXTree
        .mockResolvedValueOnce(undefined) // DOM.enable
        .mockResolvedValueOnce({}) // DOM.getDocument
        .mockResolvedValueOnce({
          object: { objectId: "obj1" },
        }) // DOM.resolveNode
        .mockResolvedValueOnce({
          result: { value: { existingId: null, tagName: "html" } },
        }) // Runtime.callFunctionOn
        .mockResolvedValueOnce(undefined) // Runtime.releaseObject
        .mockResolvedValueOnce(undefined) // DOM.disable
        .mockResolvedValueOnce(undefined) // DOM.enable (for injection)
        .mockResolvedValueOnce({}) // DOM.getDocument (for injection)
        .mockResolvedValueOnce({
          object: { objectId: "obj1" },
        }) // DOM.resolveNode for injection
        .mockResolvedValueOnce({
          result: { value: true },
        }) // Runtime.callFunctionOn for injection
        .mockResolvedValueOnce(undefined) // Runtime.releaseObject for injection
        .mockResolvedValueOnce(undefined); // DOM.disable for injection

      await snapshotManager.createSnapshot(1);
      const snapshot = snapshotManager.getSnapshot(1);

      expect(snapshot).toBeDefined();
      expect(snapshot?.tabId).toBe(1);
    });

    it("should return null if snapshot does not exist", () => {
      const snapshot = snapshotManager.getSnapshot(999);
      expect(snapshot).toBeNull();
    });
  });

  describe("getNodeByUid", () => {
    it("should return node by UID if snapshot exists", async () => {
      const mockAXTree: AccessibilityTree = {
        nodes: [
          {
            nodeId: "1",
            ignored: false,
            role: { type: "string", value: "RootWebArea" },
            name: { type: "string", value: "Test" },
            backendDOMNodeId: 1,
          },
        ],
      };

      mockSendCommand
        .mockResolvedValueOnce(undefined) // Accessibility.enable
        .mockResolvedValueOnce(mockAXTree) // Accessibility.getFullAXTree
        .mockResolvedValueOnce(undefined) // DOM.enable
        .mockResolvedValueOnce({}) // DOM.getDocument
        .mockResolvedValueOnce({
          object: { objectId: "obj1" },
        }) // DOM.resolveNode
        .mockResolvedValueOnce({
          result: { value: { existingId: null, tagName: "html" } },
        }) // Runtime.callFunctionOn
        .mockResolvedValueOnce(undefined) // Runtime.releaseObject
        .mockResolvedValueOnce(undefined) // DOM.disable
        .mockResolvedValueOnce(undefined) // DOM.enable (for injection)
        .mockResolvedValueOnce({}) // DOM.getDocument (for injection)
        .mockResolvedValueOnce({
          object: { objectId: "obj1" },
        }) // DOM.resolveNode for injection
        .mockResolvedValueOnce({
          result: { value: true },
        }) // Runtime.callFunctionOn for injection
        .mockResolvedValueOnce(undefined) // Runtime.releaseObject for injection
        .mockResolvedValueOnce(undefined); // DOM.disable for injection

      await snapshotManager.createSnapshot(1);
      const snapshot = snapshotManager.getSnapshot(1);
      const nodeId = snapshot?.root.id || "";

      const node = snapshotManager.getNodeByUid(1, nodeId);
      expect(node).toBeDefined();
      expect(node?.id).toBe(nodeId);
    });

    it("should return null if snapshot does not exist", () => {
      const node = snapshotManager.getNodeByUid(999, "nonexistent");
      expect(node).toBeNull();
    });

    it("should return null if UID does not exist in snapshot", async () => {
      const mockAXTree: AccessibilityTree = {
        nodes: [
          {
            nodeId: "1",
            ignored: false,
            role: { type: "string", value: "RootWebArea" },
            backendDOMNodeId: 1,
          },
        ],
      };

      mockSendCommand
        .mockResolvedValueOnce(undefined) // Accessibility.enable
        .mockResolvedValueOnce(mockAXTree) // Accessibility.getFullAXTree
        .mockResolvedValueOnce(undefined) // DOM.enable
        .mockResolvedValueOnce({}) // DOM.getDocument
        .mockResolvedValueOnce({
          object: { objectId: "obj1" },
        }) // DOM.resolveNode
        .mockResolvedValueOnce({
          result: { value: { existingId: null, tagName: "html" } },
        }) // Runtime.callFunctionOn
        .mockResolvedValueOnce(undefined) // Runtime.releaseObject
        .mockResolvedValueOnce(undefined) // DOM.disable
        .mockResolvedValueOnce(undefined) // DOM.enable (for injection)
        .mockResolvedValueOnce({}) // DOM.getDocument (for injection)
        .mockResolvedValueOnce({
          object: { objectId: "obj1" },
        }) // DOM.resolveNode for injection
        .mockResolvedValueOnce({
          result: { value: true },
        }) // Runtime.callFunctionOn for injection
        .mockResolvedValueOnce(undefined) // Runtime.releaseObject for injection
        .mockResolvedValueOnce(undefined); // DOM.disable for injection

      await snapshotManager.createSnapshot(1);
      const node = snapshotManager.getNodeByUid(1, "nonexistent-uid");
      expect(node).toBeNull();
    });
  });

  describe("formatSnapshot", () => {
    it("should format snapshot as text", async () => {
      const mockAXTree: AccessibilityTree = {
        nodes: [
          {
            nodeId: "1",
            ignored: false,
            role: { type: "string", value: "RootWebArea" },
            name: { type: "string", value: "Test Page" },
            backendDOMNodeId: 1,
          },
          {
            nodeId: "2",
            ignored: false,
            role: { type: "string", value: "button" },
            name: { type: "string", value: "Click Me" },
            parentId: "1",
            backendDOMNodeId: 2,
          },
        ],
      };

      mockSendCommand
        .mockResolvedValueOnce(undefined) // Accessibility.enable
        .mockResolvedValueOnce(mockAXTree) // Accessibility.getFullAXTree
        .mockResolvedValueOnce(undefined) // DOM.enable
        .mockResolvedValueOnce({}) // DOM.getDocument
        .mockResolvedValueOnce({
          object: { objectId: "obj1" },
        }) // DOM.resolveNode for node 1
        .mockResolvedValueOnce({
          result: { value: { existingId: null, tagName: "html" } },
        }) // Runtime.callFunctionOn for node 1
        .mockResolvedValueOnce(undefined) // Runtime.releaseObject for node 1
        .mockResolvedValueOnce({
          object: { objectId: "obj2" },
        }) // DOM.resolveNode for node 2
        .mockResolvedValueOnce({
          result: { value: { existingId: null, tagName: "button" } },
        }) // Runtime.callFunctionOn for node 2
        .mockResolvedValueOnce(undefined) // Runtime.releaseObject for node 2
        .mockResolvedValueOnce(undefined) // DOM.disable
        .mockResolvedValueOnce(undefined) // DOM.enable (for injection)
        .mockResolvedValueOnce({}) // DOM.getDocument (for injection)
        .mockResolvedValueOnce({
          object: { objectId: "obj1" },
        }) // DOM.resolveNode for injection node 1
        .mockResolvedValueOnce({
          result: { value: true },
        }) // Runtime.callFunctionOn for injection node 1
        .mockResolvedValueOnce(undefined) // Runtime.releaseObject for injection node 1
        .mockResolvedValueOnce({
          object: { objectId: "obj2" },
        }) // DOM.resolveNode for injection node 2
        .mockResolvedValueOnce({
          result: { value: true },
        }) // Runtime.callFunctionOn for injection node 2
        .mockResolvedValueOnce(undefined) // Runtime.releaseObject for injection node 2
        .mockResolvedValueOnce(undefined); // DOM.disable for injection

      const snapshot = await snapshotManager.createSnapshot(1);
      const formatted = snapshotManager.formatSnapshot(snapshot);

      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe("string");
      expect(formatted.length).toBeGreaterThan(0);
      expect(formatted).toContain("RootWebArea");
    });
  });

  describe("searchAndFormat", () => {
    it("should search and format snapshot with query", async () => {
      const mockAXTree: AccessibilityTree = {
        nodes: [
          {
            nodeId: "1",
            ignored: false,
            role: { type: "string", value: "RootWebArea" },
            name: { type: "string", value: "Test Page" },
            backendDOMNodeId: 1,
          },
          {
            nodeId: "2",
            ignored: false,
            role: { type: "string", value: "button" },
            name: { type: "string", value: "Click Me" },
            parentId: "1",
            backendDOMNodeId: 2,
          },
        ],
      };

      mockSendCommand
        .mockResolvedValueOnce(undefined) // Accessibility.enable
        .mockResolvedValueOnce(mockAXTree) // Accessibility.getFullAXTree
        .mockResolvedValueOnce(undefined) // DOM.enable
        .mockResolvedValueOnce({}) // DOM.getDocument
        .mockResolvedValueOnce({
          object: { objectId: "obj1" },
        }) // DOM.resolveNode for node 1
        .mockResolvedValueOnce({
          result: { value: { existingId: null, tagName: "html" } },
        }) // Runtime.callFunctionOn for node 1
        .mockResolvedValueOnce(undefined) // Runtime.releaseObject for node 1
        .mockResolvedValueOnce({
          object: { objectId: "obj2" },
        }) // DOM.resolveNode for node 2
        .mockResolvedValueOnce({
          result: { value: { existingId: null, tagName: "button" } },
        }) // Runtime.callFunctionOn for node 2
        .mockResolvedValueOnce(undefined) // Runtime.releaseObject for node 2
        .mockResolvedValueOnce(undefined) // DOM.disable
        .mockResolvedValueOnce(undefined) // DOM.enable (for injection)
        .mockResolvedValueOnce({}) // DOM.getDocument (for injection)
        .mockResolvedValueOnce({
          object: { objectId: "obj1" },
        }) // DOM.resolveNode for injection node 1
        .mockResolvedValueOnce({
          result: { value: true },
        }) // Runtime.callFunctionOn for injection node 1
        .mockResolvedValueOnce(undefined) // Runtime.releaseObject for injection node 1
        .mockResolvedValueOnce({
          object: { objectId: "obj2" },
        }) // DOM.resolveNode for injection node 2
        .mockResolvedValueOnce({
          result: { value: true },
        }) // Runtime.callFunctionOn for injection node 2
        .mockResolvedValueOnce(undefined) // Runtime.releaseObject for injection node 2
        .mockResolvedValueOnce(undefined) // DOM.disable for injection
        .mockResolvedValueOnce(undefined) // Accessibility.enable (for search)
        .mockResolvedValueOnce(mockAXTree) // Accessibility.getFullAXTree (for search)
        .mockResolvedValueOnce(undefined) // DOM.enable (for search)
        .mockResolvedValueOnce({}) // DOM.getDocument (for search)
        .mockResolvedValueOnce({
          object: { objectId: "obj1" },
        }) // DOM.resolveNode for search node 1
        .mockResolvedValueOnce({
          result: { value: { existingId: null, tagName: "html" } },
        }) // Runtime.callFunctionOn for search node 1
        .mockResolvedValueOnce(undefined) // Runtime.releaseObject for search node 1
        .mockResolvedValueOnce({
          object: { objectId: "obj2" },
        }) // DOM.resolveNode for search node 2
        .mockResolvedValueOnce({
          result: { value: { existingId: null, tagName: "button" } },
        }) // Runtime.callFunctionOn for search node 2
        .mockResolvedValueOnce(undefined) // Runtime.releaseObject for search node 2
        .mockResolvedValueOnce(undefined); // DOM.disable for search

      const result = await snapshotManager.searchAndFormat(1, "button", 1);

      expect(result).toBeDefined();
      expect(result).toContain("button");
    });

    it("should return null if snapshot creation fails", async () => {
      mockSendCommand.mockRejectedValueOnce(new Error("CDP error"));

      const result = await snapshotManager.searchAndFormat(1, "test", 1);
      expect(result).toBeNull();
    });

    it("should return message when no matches found", async () => {
      const mockAXTree: AccessibilityTree = {
        nodes: [
          {
            nodeId: "1",
            ignored: false,
            role: { type: "string", value: "RootWebArea" },
            backendDOMNodeId: 1,
          },
        ],
      };

      mockSendCommand
        .mockResolvedValueOnce(undefined) // Accessibility.enable
        .mockResolvedValueOnce(mockAXTree) // Accessibility.getFullAXTree
        .mockResolvedValueOnce(undefined) // DOM.enable
        .mockResolvedValueOnce({}) // DOM.getDocument
        .mockResolvedValueOnce({
          object: { objectId: "obj1" },
        }) // DOM.resolveNode
        .mockResolvedValueOnce({
          result: { value: { existingId: null, tagName: "html" } },
        }) // Runtime.callFunctionOn
        .mockResolvedValueOnce(undefined) // Runtime.releaseObject
        .mockResolvedValueOnce(undefined) // DOM.disable
        .mockResolvedValueOnce(undefined) // DOM.enable (for injection)
        .mockResolvedValueOnce({}) // DOM.getDocument (for injection)
        .mockResolvedValueOnce({
          object: { objectId: "obj1" },
        }) // DOM.resolveNode for injection
        .mockResolvedValueOnce({
          result: { value: true },
        }) // Runtime.callFunctionOn for injection
        .mockResolvedValueOnce(undefined) // Runtime.releaseObject for injection
        .mockResolvedValueOnce(undefined) // DOM.disable for injection
        .mockResolvedValueOnce(undefined) // Accessibility.enable (for search)
        .mockResolvedValueOnce(mockAXTree) // Accessibility.getFullAXTree (for search)
        .mockResolvedValueOnce(undefined) // DOM.enable (for search)
        .mockResolvedValueOnce({}) // DOM.getDocument (for search)
        .mockResolvedValueOnce({
          object: { objectId: "obj1" },
        }) // DOM.resolveNode for search
        .mockResolvedValueOnce({
          result: { value: { existingId: null, tagName: "html" } },
        }) // Runtime.callFunctionOn for search
        .mockResolvedValueOnce(undefined); // Runtime.releaseObject for search

      const result = await snapshotManager.searchAndFormat(1, "nonexistent", 1);
      expect(result).toContain("No matches found");
    });
  });

  describe("clearSnapshot", () => {
    it("should clear snapshot by tabId", async () => {
      const mockAXTree: AccessibilityTree = {
        nodes: [
          {
            nodeId: "1",
            ignored: false,
            role: { type: "string", value: "RootWebArea" },
            backendDOMNodeId: 1,
          },
        ],
      };

      mockSendCommand
        .mockResolvedValueOnce(undefined) // Accessibility.enable
        .mockResolvedValueOnce(mockAXTree) // Accessibility.getFullAXTree
        .mockResolvedValueOnce(undefined) // DOM.enable
        .mockResolvedValueOnce({}) // DOM.getDocument
        .mockResolvedValueOnce({
          object: { objectId: "obj1" },
        }) // DOM.resolveNode
        .mockResolvedValueOnce({
          result: { value: { existingId: null, tagName: "html" } },
        }) // Runtime.callFunctionOn
        .mockResolvedValueOnce(undefined) // Runtime.releaseObject
        .mockResolvedValueOnce(undefined) // DOM.disable
        .mockResolvedValueOnce(undefined) // DOM.enable (for injection)
        .mockResolvedValueOnce({}) // DOM.getDocument (for injection)
        .mockResolvedValueOnce({
          object: { objectId: "obj1" },
        }) // DOM.resolveNode for injection
        .mockResolvedValueOnce({
          result: { value: true },
        }) // Runtime.callFunctionOn for injection
        .mockResolvedValueOnce(undefined) // Runtime.releaseObject for injection
        .mockResolvedValueOnce(undefined); // DOM.disable for injection

      await snapshotManager.createSnapshot(1);
      expect(snapshotManager.getSnapshot(1)).toBeDefined();

      snapshotManager.clearSnapshot(1);
      expect(snapshotManager.getSnapshot(1)).toBeNull();
    });
  });

  describe("clearAllSnapshots", () => {
    it("should clear all snapshots", async () => {
      const mockAXTree: AccessibilityTree = {
        nodes: [
          {
            nodeId: "1",
            ignored: false,
            role: { type: "string", value: "RootWebArea" },
            backendDOMNodeId: 1,
          },
        ],
      };

      mockSendCommand
        .mockResolvedValueOnce(undefined) // Accessibility.enable
        .mockResolvedValueOnce(mockAXTree) // Accessibility.getFullAXTree
        .mockResolvedValueOnce(undefined) // DOM.enable
        .mockResolvedValueOnce({}) // DOM.getDocument
        .mockResolvedValueOnce({
          object: { objectId: "obj1" },
        }) // DOM.resolveNode
        .mockResolvedValueOnce({
          result: { value: { existingId: null, tagName: "html" } },
        }) // Runtime.callFunctionOn
        .mockResolvedValueOnce(undefined) // Runtime.releaseObject
        .mockResolvedValueOnce(undefined) // DOM.disable
        .mockResolvedValueOnce(undefined) // DOM.enable (for injection)
        .mockResolvedValueOnce({}) // DOM.getDocument (for injection)
        .mockResolvedValueOnce({
          object: { objectId: "obj1" },
        }) // DOM.resolveNode for injection
        .mockResolvedValueOnce({
          result: { value: true },
        }) // Runtime.callFunctionOn for injection
        .mockResolvedValueOnce(undefined) // Runtime.releaseObject for injection
        .mockResolvedValueOnce(undefined); // DOM.disable for injection

      await snapshotManager.createSnapshot(1);
      expect(snapshotManager.getSnapshot(1)).toBeDefined();

      snapshotManager.clearAllSnapshots();
      expect(snapshotManager.getSnapshot(1)).toBeNull();
    });
  });

  describe("isValidUid", () => {
    it("should return true for valid UID", async () => {
      const mockAXTree: AccessibilityTree = {
        nodes: [
          {
            nodeId: "1",
            ignored: false,
            role: { type: "string", value: "RootWebArea" },
            backendDOMNodeId: 1,
          },
        ],
      };

      mockSendCommand
        .mockResolvedValueOnce(undefined) // Accessibility.enable
        .mockResolvedValueOnce(mockAXTree) // Accessibility.getFullAXTree
        .mockResolvedValueOnce(undefined) // DOM.enable
        .mockResolvedValueOnce({}) // DOM.getDocument
        .mockResolvedValueOnce({
          object: { objectId: "obj1" },
        }) // DOM.resolveNode
        .mockResolvedValueOnce({
          result: { value: { existingId: null, tagName: "html" } },
        }) // Runtime.callFunctionOn
        .mockResolvedValueOnce(undefined) // Runtime.releaseObject
        .mockResolvedValueOnce(undefined) // DOM.disable
        .mockResolvedValueOnce(undefined) // DOM.enable (for injection)
        .mockResolvedValueOnce({}) // DOM.getDocument (for injection)
        .mockResolvedValueOnce({
          object: { objectId: "obj1" },
        }) // DOM.resolveNode for injection
        .mockResolvedValueOnce({
          result: { value: true },
        }) // Runtime.callFunctionOn for injection
        .mockResolvedValueOnce(undefined) // Runtime.releaseObject for injection
        .mockResolvedValueOnce(undefined); // DOM.disable for injection

      await snapshotManager.createSnapshot(1);
      const snapshot = snapshotManager.getSnapshot(1);
      const nodeId = snapshot?.root.id || "";

      expect(snapshotManager.isValidUid(1, nodeId)).toBe(true);
    });

    it("should return false for invalid UID", () => {
      expect(snapshotManager.isValidUid(1, "invalid-uid")).toBe(false);
    });

    it("should return false if snapshot does not exist", () => {
      expect(snapshotManager.isValidUid(999, "any-uid")).toBe(false);
    });
  });
});
