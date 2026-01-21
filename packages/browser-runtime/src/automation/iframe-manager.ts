/**
 * Iframe Manager
 *
 * Handles iframe accessibility tree merging for snapshot generation
 * Recursively fetches and merges iframe AX trees into the main tree
 */

import type { CdpCommander } from "./cdp-commander";
import type { AccessibilityTree, AXNode } from "./types";

interface FrameTreeNode {
  frame: {
    id: string;
  };
  childFrames?: FrameTreeNode[];
}

/**
 * Manages iframe accessibility tree merging
 */
export class IframeManager {
  /**
   * Build a map of backendDOMNodeId -> frameId for all iframes
   */
  private async buildIframeMap(
    cdpCommander: CdpCommander,
  ): Promise<Map<number, string>> {
    const iframeMap = new Map<number, string>();

    try {
      // Enable Page domain to get frame tree
      await cdpCommander.sendCommand("Page.enable", {});

      // Get frame tree
      const frameTree = await cdpCommander.sendCommand<{
        frameTree: FrameTreeNode;
      }>("Page.getFrameTree", {});

      if (!frameTree?.frameTree) {
        return iframeMap;
      }

      // Enable DOM domain to resolve frame owners
      await cdpCommander.sendCommand("DOM.enable", {});
      await cdpCommander.sendCommand("DOM.getDocument", { depth: 0 });

      // Iterate through frame tree and use DOM.getFrameOwner
      // to get the backendNodeId for each frame
      const collectFrames = async (node: FrameTreeNode): Promise<void> => {
        const frameId = node.frame?.id;
        if (frameId) {
          try {
            const frameOwner = await cdpCommander.sendCommand<{
              backendNodeId?: number;
            }>("DOM.getFrameOwner", { frameId });

            if (frameOwner?.backendNodeId) {
              iframeMap.set(frameOwner.backendNodeId, frameId);
            }
          } catch {
            // Main frame or inaccessible frame - skip
          }
        }

        if (node.childFrames) {
          for (const childFrame of node.childFrames) {
            await collectFrames(childFrame);
          }
        }
      };

      await collectFrames(frameTree.frameTree);

      await cdpCommander.sendCommand("DOM.disable", {});
      await cdpCommander.sendCommand("Page.disable", {});
    } catch (error) {
      console.error("❌ [DEBUG] Error building iframe map:", error);
      // Clean up domains
      try {
        await cdpCommander.sendCommand("DOM.disable", {});
      } catch { }
      try {
        await cdpCommander.sendCommand("Page.disable", {});
      } catch { }
    }

    return iframeMap;
  }

  /**
   * Get accessibility tree for a specific frame
   */
  private async getFrameAccessibilityTree(
    cdpCommander: CdpCommander,
    frameId: string,
  ): Promise<AccessibilityTree | null> {
    try {
      const result = await cdpCommander.sendCommand<AccessibilityTree>(
        "Accessibility.getFullAXTree",
        { frameId },
      );
      return result;
    } catch (error) {
      console.warn(
        `⚠️ [DEBUG] Failed to get accessibility tree for frame ${frameId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Prefix nodeIds in a tree to avoid conflicts when merging
   */
  private prefixNodeIds(
    nodes: AXNode[],
    prefix: string,
  ): { nodes: AXNode[]; nodeIdMap: Map<string, string> } {
    const nodeIdMap = new Map<string, string>();
    const prefixedNodes: AXNode[] = [];

    for (const node of nodes) {
      const originalId = node.nodeId;
      const prefixedId = `${prefix}:${originalId}`;
      nodeIdMap.set(originalId, prefixedId);

      const prefixedNode: AXNode = {
        ...node,
        nodeId: prefixedId,
        parentId: node.parentId ? `${prefix}:${node.parentId}` : undefined,
        childIds: node.childIds?.map((id) => `${prefix}:${id}`),
        frameId: node.frameId || prefix, // Store frameId for reference
      };

      prefixedNodes.push(prefixedNode);
    }

    return { nodes: prefixedNodes, nodeIdMap };
  }

  /**
   * Populate iframe snapshots recursively
   * Similar to Puppeteer's populateIframes function
   */
  async populateIframes(
    cdpCommander: CdpCommander,
    mainTree: AccessibilityTree,
  ): Promise<AccessibilityTree> {
    // Build iframe map: backendDOMNodeId -> frameId
    const iframeMap = await this.buildIframeMap(cdpCommander);

    if (iframeMap.size === 0) {
      console.log("✅ [DEBUG] No iframes found, returning main tree as-is");
      return mainTree;
    }

    console.log(
      `✅ [DEBUG] Found ${iframeMap.size} iframes, populating snapshots...`,
    );

    // Build nodeId -> AXNode map for main tree
    const nodeMap = new Map<string, AXNode>();
    for (const node of mainTree.nodes) {
      nodeMap.set(node.nodeId, node);
    }

    // Find root node
    const rootNode = mainTree.nodes.find((n) => !n.parentId);
    if (!rootNode) {
      return mainTree;
    }

    // Recursively populate iframes
    const processedFrames = new Set<string>(); // Track processed frames to avoid cycles

    const populateRecursive = async (
      axNode: AXNode,
      nodeMap: Map<string, AXNode>,
    ): Promise<void> => {
      // Check if this node is an iframe
      // Note: "Iframe" is the role for the iframe element itself
      // "WebArea" or "RootWebArea" is the role for the root of the iframe's content
      const role = axNode.role?.value || "";
      const isIframe = role === "Iframe";

      if (isIframe && axNode.backendDOMNodeId) {
        const frameId = iframeMap.get(axNode.backendDOMNodeId);
        if (frameId && !processedFrames.has(frameId)) {
          processedFrames.add(frameId);
          console.log(
            `🔍 [DEBUG] Processing iframe with frameId: ${frameId}, backendDOMNodeId: ${axNode.backendDOMNodeId}`,
          );

          // Get iframe's accessibility tree
          const iframeTree = await this.getFrameAccessibilityTree(
            cdpCommander,
            frameId,
          );

          if (iframeTree?.nodes && iframeTree.nodes.length > 0) {
            // Prefix nodeIds to avoid conflicts
            const { nodes: prefixedNodes } = this.prefixNodeIds(
              iframeTree.nodes,
              frameId,
            );

            // Find iframe's root node
            const iframeRoot = prefixedNodes.find((n) => !n.parentId);
            if (iframeRoot) {
              // Attach iframe root as a child of the iframe node
              // We'll store it in a special property, but for now we'll add it to childIds
              // Actually, we need to merge the nodes into the main tree
              // and update the iframe node's childIds

              // Add all prefixed nodes to the main tree
              mainTree.nodes.push(...prefixedNodes);

              // Update nodeMap
              for (const node of prefixedNodes) {
                nodeMap.set(node.nodeId, node);
              }

              // Update iframe node's childIds to include iframe root
              // But wait - the iframe node might already have children
              // We should replace or merge them
              // Actually, in accessibility tree, iframe nodes typically don't have
              // the iframe content as children - we need to add it

              // Set the iframe root as a child of the iframe node
              if (!axNode.childIds) {
                axNode.childIds = [];
              }
              axNode.childIds.push(iframeRoot.nodeId);
              iframeRoot.parentId = axNode.nodeId;

              // Recursively populate nested iframes
              await populateRecursive(iframeRoot, nodeMap);
            }
          }
        }
      }

      // Process children recursively
      if (axNode.childIds) {
        for (const childId of axNode.childIds) {
          const childNode = nodeMap.get(childId);
          if (childNode) {
            await populateRecursive(childNode, nodeMap);
          }
        }
      }
    };

    await populateRecursive(rootNode, nodeMap);

    return mainTree;
  }
}

export const iframeManager = new IframeManager();
