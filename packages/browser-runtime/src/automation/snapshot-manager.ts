/**
 * Chrome DevTools MCP 快照管理系统
 *
 * 基于文档指南实现优化的快照机制，提供清晰的UID管理和元素定位
 */

import { nanoid } from "nanoid";
import pLimit from "p-limit";
import { CdpCommander } from "./cdp-commander";
import { debuggerManager } from "./debugger-manager";
import { iframeManager } from "./iframe-manager";
import { type SearchOptions, SKIP_ROLES, searchSnapshotText } from "./query";
import type {
  AccessibilityTree,
  AXNode,
  TextSnapshot,
  TextSnapshotNode,
} from "./types";

/**
 * 快照管理器
 *
 * 负责创建、管理和格式化页面快照
 */
export class SnapshotManager {
  #snapshotMap: Map<number, TextSnapshot> = new Map();
  /**
   * Fetch existing data-aipex-nodeid attributes from DOM elements and tagName
   * Returns a map of backendDOMNodeId → { existingId, tagName }
   */
  private async fetchExistingNodeIds(
    tabId: number,
    nodeMap: Map<string, AXNode>,
  ): Promise<Map<number, { existingId: string; tagName: string }>> {
    console.log(
      "🔍 [DEBUG] Fetching existing aipex-nodeids and tagNames from page",
    );
    const existingData = new Map<
      number,
      { existingId: string; tagName: string }
    >();
    const cdpCommander = new CdpCommander(tabId);

    try {
      // Ensure debugger is attached
      const attached = await debuggerManager.safeAttachDebugger(tabId);
      if (!attached) {
        console.warn(
          "⚠️ [DEBUG] Failed to attach debugger for fetching existing IDs and tagNames",
        );
        return existingData;
      }

      // Enable DOM domain
      await cdpCommander.sendCommand("DOM.enable", {});

      // Get document node
      await cdpCommander.sendCommand("DOM.getDocument", { depth: 0 });

      // Use p-limit to control concurrency
      const limit = pLimit(50);

      // Create fetch tasks for each node with backendDOMNodeId
      const fetchTasks = Array.from(nodeMap.values())
        .filter((axNode) => axNode.backendDOMNodeId)
        .map((axNode) => {
          return limit(async () => {
            try {
              // Resolve backendNodeId to objectId
              const resolved = await cdpCommander.sendCommand<{
                object?: { objectId?: string };
              }>("DOM.resolveNode", {
                backendNodeId: axNode.backendDOMNodeId,
              });

              if (!resolved?.object?.objectId) {
                return;
              }

              // Read the data-aipex-nodeid attribute and tagName
              const result = await cdpCommander.sendCommand<{
                result?: { value?: { existingId: string; tagName: string } };
              }>("Runtime.callFunctionOn", {
                objectId: resolved.object.objectId,
                functionDeclaration: `
                  function() {
                    if (this && this.getAttribute && this.tagName) {
                      return {
                        existingId: this.getAttribute('data-aipex-nodeid'),
                        tagName: this.tagName.toLowerCase()
                      };
                    }
                    return null;
                  }
                `,
                returnByValue: true,
              });

              // Store the existing ID and tagName if found
              if (result?.result?.value && axNode.backendDOMNodeId) {
                const { existingId, tagName } = result.result.value;
                existingData.set(axNode.backendDOMNodeId, {
                  existingId,
                  tagName: tagName || "",
                });
              }

              // Release remote object
              await cdpCommander.sendCommand("Runtime.releaseObject", {
                objectId: resolved.object.objectId,
              });
            } catch {
              // Silently skip nodes that fail to resolve
              // This is normal for nodes that are no longer in the DOM
            }
          });
        });

      // Wait for all fetch tasks to complete
      await Promise.all(fetchTasks);

      console.log(
        `✅ [DEBUG] Found ${existingData.size} existing aipex-nodeids with tagNames`,
      );

      // Disable DOM domain
      await cdpCommander.sendCommand("DOM.disable", {});
      debuggerManager.safeDetachDebugger(tabId);

      return existingData;
    } catch (error) {
      console.error("❌ [DEBUG] Error fetching existing node IDs:", error);
      debuggerManager.safeDetachDebugger(tabId, true);
      return existingData;
    }
  }

  /**
   * Get REAL accessibility tree using Chrome DevTools Protocol
   * This is the ACTUAL browser's native accessibility tree - exactly like Puppeteer's page.accessibility.snapshot()
   */
  private async getRealAccessibilityTree(
    tabId: number,
    includeIframes: boolean = true,
  ): Promise<AccessibilityTree | null> {
    try {
      console.log(
        "🔍 [DEBUG] Connecting to tab via Chrome DevTools Protocol:",
        tabId,
      );

      // Safely attach debugger to the tab
      const attached = await debuggerManager.safeAttachDebugger(tabId);
      if (!attached) {
        throw new Error("Failed to attach debugger");
      }

      const cdpCommander = new CdpCommander(tabId);

      // STEP 1: Enable accessibility domain - REQUIRED for consistent AXNodeIds
      await cdpCommander.sendCommand("Accessibility.enable", {});

      console.log("✅ [DEBUG] Accessibility domain enabled");

      // STEP 2: Get the full accessibility tree
      // This is the same as Puppeteer's page.accessibility.snapshot()
      const result = await cdpCommander.sendCommand<AccessibilityTree>(
        "Accessibility.getFullAXTree",
        {
          // depth: undefined - get full tree (not just top level)
          // frameId: undefined - get main frame
        },
      );
      console.log(
        "✅ [DEBUG] Got accessibility tree with",
        result.nodes?.length || 0,
        "nodes",
      );

      // STEP 3: Populate iframes if requested
      if (includeIframes) {
        console.log("🔍 [DEBUG] Populating iframe snapshots...");
        const treeWithIframes = await iframeManager.populateIframes(
          cdpCommander,
          result,
        );
        console.log(
          "✅ [DEBUG] Tree with iframes has",
          treeWithIframes.nodes?.length || 0,
          "nodes",
        );
        debuggerManager.safeDetachDebugger(tabId);
        return treeWithIframes;
      }

      debuggerManager.safeDetachDebugger(tabId);
      return result;
    } catch (error) {
      console.error("Failed to create accessibility snapshot:", error);
      throw new Error(`Failed to create snapshot: ${error}`);
    }
  }

  /**
   * Check if a node is a control element (from Puppeteer source)
   */
  private isControl(axNode: AXNode): boolean {
    const role = axNode.role?.value || "";

    switch (role) {
      case "button":
      case "checkbox":
      case "ColorWell":
      case "combobox":
      case "DisclosureTriangle":
      case "listbox":
      case "menu":
      case "menubar":
      case "menuitem":
      case "menuitemcheckbox":
      case "menuitemradio":
      case "radio":
      case "scrollbar":
      case "searchbox":
      case "slider":
      case "spinbutton":
      case "switch":
      case "tab":
      case "textbox":
      case "tree":
      case "TreeItem":
        return true;
      default:
        return false;
    }
  }

  /**
   * Check if a node is a leaf node (from Puppeteer source)
   * Special case: control elements are treated as leaf nodes even if they have children
   */
  private isLeafNode(axNode: AXNode): boolean {
    if (!axNode.childIds || axNode.childIds.length === 0) {
      return true;
    }

    // Control elements are treated as leaf nodes even if they have children
    return this.isControl(axNode);
  }

  /**
   * Check if a node has any interesting descendants in the given set
   */
  private hasInterestingDescendantsInSet(
    axNode: AXNode,
    interestingNodes: Set<string>,
    nodeMap: Map<string, AXNode>,
  ): boolean {
    if (!axNode.childIds) {
      return false;
    }

    for (const childId of axNode.childIds) {
      if (interestingNodes.has(childId)) {
        return true;
      }

      const childNode = nodeMap.get(childId);
      if (
        childNode &&
        this.hasInterestingDescendantsInSet(
          childNode,
          interestingNodes,
          nodeMap,
        )
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a node is "interesting" - optimized for DevTools MCP-like output
   * More selective than Puppeteer to reduce noise
   */
  private isInterestingNode(axNode: AXNode, insideControl = false): boolean {
    const role = axNode.role?.value || "";
    const name = axNode.name?.value || "";
    const value =
      typeof axNode.value?.value === "string" ? axNode.value.value : "";
    const description =
      typeof axNode.description?.value === "string"
        ? axNode.description.value
        : "";

    // Rule 1: If inside a control, only leaf nodes are interesting
    if (insideControl && this.isLeafNode(axNode)) {
      return true;
    }

    // Rule 2: Always include root
    if (role === "RootWebArea") {
      return true;
    }

    // Rule 2.5: Always include iframe nodes to preserve boundaries
    if (role === "Iframe" || role === "WebArea") {
      return true;
    }

    // Rule 3: Interactive elements are always interesting
    const interactiveRoles = [
      "button",
      "link",
      "textbox",
      "combobox",
      "checkbox",
      "radio",
      "menuitem",
      "tab",
      "slider",
      "spinbutton",
      "searchbox",
    ];

    if (interactiveRoles.includes(role)) {
      return true;
    }

    // Rule 4: Images are interesting
    if (role === "image" || role === "img") {
      return true;
    }

    // Rule 5: Text content with meaningful names
    if (role === "StaticText" && name && name.trim().length >= 2) {
      return true;
    }

    // Rule 6: Skip common layout containers
    const layoutRoles = [
      "generic",
      "none",
      "group",
      "main",
      "navigation",
      "contentinfo",
      "search",
      "banner",
      "complementary",
      "region",
      "article",
      "section",
    ];

    if (layoutRoles.includes(role)) {
      // Only include if they have meaningful content
      const hasContent = [name, value, description].some(
        (content) => content && content.trim().length > 1,
      );
      return hasContent;
    }

    // Rule 7: For other roles, be selective
    if (role && role !== "generic") {
      // Only include if they have meaningful content
      const hasContent = [name, value, description].some(
        (content) => content && content.trim().length > 1,
      );
      return hasContent;
    }

    return false;
  }

  private collectInterestingNodes(params: {
    axNode: AXNode;
    insideControl: boolean;
    interestingNodes: Set<string>;
    nodeMap: Map<string, AXNode>;
  }): void {
    const { axNode, insideControl, interestingNodes, nodeMap } = params;
    // Add to collection if interesting
    if (this.isInterestingNode(axNode, insideControl)) {
      interestingNodes.add(axNode.nodeId);
    }

    // Update insideControl flag
    const childInsideControl = insideControl || this.isControl(axNode);

    // Recurse to children
    if (axNode.childIds) {
      for (const childId of axNode.childIds) {
        const childNode = nodeMap.get(childId);
        if (childNode) {
          this.collectInterestingNodes({
            axNode: childNode,
            insideControl: childInsideControl,
            interestingNodes,
            nodeMap,
          });
        }
      }
    }
  }

  private serializeTree(params: {
    axNode: AXNode;
    interestingNodes: Set<string>;
    nodeMap: Map<string, AXNode>;
    idToNode: Map<string, TextSnapshotNode>;
    existingNodeData: Map<number, { existingId: string; tagName: string }>;
  }): TextSnapshotNode | null {
    const { axNode, interestingNodes, nodeMap, idToNode, existingNodeData } =
      params;
    const isInteresting = interestingNodes.has(axNode.nodeId);

    // Process children first (always recurse to find interesting descendants)
    const serializedChildren: TextSnapshotNode[] = [];
    if (axNode.childIds) {
      for (const childId of axNode.childIds) {
        const childNode = nodeMap.get(childId);
        if (childNode) {
          const child = this.serializeTree({
            axNode: childNode,
            interestingNodes,
            nodeMap,
            idToNode,
            existingNodeData,
          });
          if (child) {
            serializedChildren.push(child);
          }
        }
      }
    }

    // If this node is not interesting, we need to handle it differently
    if (!isInteresting) {
      // If no children, return null (this node is not interesting and has no interesting descendants)
      if (serializedChildren.length === 0) {
        return null;
      }

      // If only one child, return it directly (flatten single-child chains)
      if (serializedChildren.length === 1) {
        return serializedChildren[0] ?? null;
      }

      // If multiple children, we need to create a container node to hold them
      // This is the key fix - we can't just return null when there are multiple interesting children
      const role = axNode.role?.value || axNode.chromeRole?.value || "generic";
      const name = axNode.name?.value || "";

      // Try to reuse existing ID and get tagName, otherwise generate new one
      const existingData = axNode.backendDOMNodeId
        ? existingNodeData.get(axNode.backendDOMNodeId)
        : undefined;
      const nodeId = existingData?.existingId || nanoid(8);
      const tagName = existingData?.tagName || "";

      const containerNode: TextSnapshotNode = {
        id: nodeId,
        role,
        name,
        children: serializedChildren,
        backendDOMNodeId: axNode.backendDOMNodeId,
        frameId: axNode.frameId,
        tagName,
      };

      // Store in ID map
      idToNode.set(containerNode.id, containerNode);

      return containerNode;
    }

    // This node IS interesting - create it
    const role = axNode.role?.value || axNode.chromeRole?.value || "";
    let name = axNode.name?.value || "";
    const value = axNode.value?.value;
    const description = axNode.description?.value;

    // Normalize link names for better matching
    if (role === "link" && name) {
      // For Google search results and similar complex link texts
      // Extract the main text part and keep URL separate
      const urlMatch = name.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        const url = urlMatch[1];
        const mainText = name.replace(/(https?:\/\/[^\s]+).*$/, "").trim();

        // If main text is duplicated (like "Model Context Protocol Model Context Protocol")
        // try to deduplicate it
        const words = mainText.split(/\s+/);
        const halfLength = Math.floor(words.length / 2);
        const firstHalf = words.slice(0, halfLength).join(" ");
        const secondHalf = words.slice(halfLength).join(" ");

        if (firstHalf === secondHalf && firstHalf.length > 0) {
          // Deduplicated text + URL
          name = `${firstHalf} ${url}`;
          console.log(
            `🔧 [DEBUG] Normalized duplicated link name: "${axNode.name?.value}" → "${name}"`,
          );
        } else if (mainText.length > 0) {
          // Keep original format but log it
          console.log(`🔧 [DEBUG] Link name with URL: "${name}"`);
        }
      }
    }

    // Try to reuse existing ID and get tagName, otherwise generate new one
    const existingData = axNode.backendDOMNodeId
      ? existingNodeData.get(axNode.backendDOMNodeId)
      : undefined;
    const nodeId = existingData?.existingId || nanoid(8);
    const tagName = existingData?.tagName || "";

    const node: TextSnapshotNode = {
      id: nodeId,
      role,
      name,
      children: serializedChildren,
      backendDOMNodeId: axNode.backendDOMNodeId,
      frameId: axNode.frameId,
      tagName,
    };

    // Add optional properties
    if (value) node.value = value;
    if (description) node.description = description;

    // Extract rich accessibility properties from CDP
    if (axNode.properties) {
      for (const prop of axNode.properties) {
        const propName = prop.name;
        const propValue = prop.value?.value;

        switch (propName) {
          case "focused":
            if (propValue) node.focused = true;
            break;
          case "disabled":
            if (propValue) node.disabled = true;
            break;
          case "expanded":
            node.expanded = propValue;
            break;
          case "selected":
            if (propValue) node.selected = true;
            break;
          case "checked":
            node.checked = propValue;
            break;
          case "pressed":
            node.pressed = propValue;
            break;
          case "level":
            node.level = propValue;
            break;
          case "valuemin":
            node.valuemin = propValue;
            break;
          case "valuemax":
            node.valuemax = propValue;
            break;
          case "autocomplete":
            node.autocomplete = propValue;
            break;
          case "haspopup":
            node.haspopup = propValue;
            break;
          case "invalid":
            node.invalid = propValue;
            break;
          case "orientation":
            node.orientation = propValue;
            break;
          case "modal":
            if (propValue) node.modal = true;
            break;
        }
      }
    }

    // Store in ID map
    idToNode.set(node.id, node);

    return node;
  }

  /**
   * Convert CDP accessibility tree to Puppeteer-like SerializedAXNode tree
   * This uses Puppeteer's TWO-PASS approach: collect interesting nodes, then serialize
   */
  private convertAccessibilityTreeToSnapshot(
    snapshotResult: AccessibilityTree,
    existingNodeData: Map<number, { existingId: string; tagName: string }>,
  ): Omit<TextSnapshot, "tabId"> | null {
    const nodes = snapshotResult.nodes;
    if (!nodes || nodes.length === 0) {
      return null;
    }

    console.log("🔍 [DEBUG] Processing", nodes.length, "raw CDP nodes");

    // Debug: show role distribution
    const roleCounts = new Map<string, number>();
    for (const node of nodes) {
      const role = node.role?.value || "unknown";
      roleCounts.set(role, (roleCounts.get(role) || 0) + 1);
    }
    console.log(
      "📊 [DEBUG] Role distribution:",
      Array.from(roleCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([role, count]) => `${role}:${count}`)
        .join(", "),
    );

    // Build nodeId -> AXNode map
    const nodeMap = new Map<string, AXNode>();
    for (const node of nodes) {
      nodeMap.set(node.nodeId, node);
    }

    // Find root (no parentId)
    const rootNode = nodes.find((n: AXNode) => !n.parentId);
    if (!rootNode) {
      return null;
    }

    // PASS 1: Collect interesting nodes (Puppeteer's approach)
    const interestingNodes = new Set<string>(); // Store nodeIds

    console.log("🔍 [DEBUG] Pass 1: Collecting interesting nodes...");
    this.collectInterestingNodes({
      axNode: rootNode,
      insideControl: false,
      interestingNodes,
      nodeMap,
    });
    console.log(`✅ [DEBUG] Found ${interestingNodes.size} interesting nodes`);

    if (interestingNodes.size === 0) {
      console.warn("⚠️ [DEBUG] No interesting nodes found!");
      return null;
    }

    // Additional filtering: Remove nodes that are just layout containers
    // This is a post-processing step to further reduce noise
    const finalInterestingNodes = new Set<string>();
    for (const nodeId of interestingNodes) {
      const node = nodeMap.get(nodeId);
      if (node) {
        const role = node.role?.value || "";
        const name = node.name?.value || "";
        const value = node.value?.value || "";
        const description = node.description?.value || "";

        // Skip pure layout containers with no meaningful content
        if (role === "generic" && !name && !value && !description) {
          // Check if this node has any interesting descendants
          const hasInterestingDescendants = this.hasInterestingDescendantsInSet(
            node,
            interestingNodes,
            nodeMap,
          );
          if (!hasInterestingDescendants) {
            console.log(
              `  ✗ Filtered out pure layout container: ${role} "${name}"`,
            );
            continue;
          }
        }

        // Additional quality filter: Skip nodes with very short or meaningless content
        if (role === "generic" && name) {
          const trimmedName = name.trim();
          // Skip nodes with very short names (likely just layout)
          if (trimmedName.length < 2) {
            console.log(`  ✗ Filtered out short content: ${role} "${name}"`);
            continue;
          }

          // Skip nodes that are just common layout text
          const layoutTexts = [
            "div",
            "span",
            "section",
            "article",
            "header",
            "footer",
            "nav",
            "main",
            "aside",
          ];
          if (layoutTexts.includes(trimmedName.toLowerCase())) {
            console.log(`  ✗ Filtered out layout text: ${role} "${name}"`);
            continue;
          }
        }

        finalInterestingNodes.add(nodeId);
      }
    }

    console.log(
      `✅ [DEBUG] After filtering: ${finalInterestingNodes.size} truly interesting nodes`,
    );
    interestingNodes.clear();
    for (const id of finalInterestingNodes) {
      interestingNodes.add(id);
    }

    // PASS 2: Serialize tree, only including interesting nodes
    const idToNode = new Map<string, TextSnapshotNode>();

    console.log("🔍 [DEBUG] Pass 2: Serializing tree...");
    const root = this.serializeTree({
      axNode: rootNode,
      interestingNodes,
      nodeMap,
      idToNode,
      existingNodeData,
    });
    if (!root) {
      console.warn("⚠️ [DEBUG] Failed to serialize root node");
      return null;
    }

    console.log(
      `✅ [DEBUG] Built accessibility tree with ${idToNode.size} interesting nodes`,
    );
    return {
      root,
      idToNode,
    };
  }

  /**
   * create snapshot
   *
   * get accessibility tree using Chrome DevTools Protocol
   */
  async createSnapshot(
    tabId: number,
    includeIframes: boolean = true,
  ): Promise<TextSnapshot> {
    try {
      // get accessibility tree
      const axTree = await this.getRealAccessibilityTree(tabId, includeIframes);

      if (!axTree?.nodes || axTree.nodes.length === 0) {
        throw new Error("No accessibility nodes found");
      }

      // Build nodeId -> AXNode map for fetching existing IDs
      const nodeMap = new Map<string, AXNode>();
      for (const node of axTree.nodes) {
        nodeMap.set(node.nodeId, node);
      }

      console.log("🔍 [DEBUG] Node map:", nodeMap);

      // Fetch existing node IDs and tagNames from the page
      const existingNodeData = await this.fetchExistingNodeIds(tabId, nodeMap);

      console.log("🔍 [DEBUG] Existing node data:", existingNodeData);

      const snapshotResult = this.convertAccessibilityTreeToSnapshot(
        axTree,
        existingNodeData,
      );
      if (!snapshotResult) {
        throw new Error("Failed to convert accessibility tree to snapshot");
      }
      const snapshot: TextSnapshot = {
        root: snapshotResult.root,
        idToNode: snapshotResult.idToNode,
        tabId,
      };
      // inject aipex-nodeId attribute to page elements for precise positioning
      // only inject new nodes, skip those that already have the correct ID
      await this.injectNodeIdsToPage(
        tabId,
        snapshot.idToNode,
        existingNodeData,
      );
      this.#snapshotMap.set(tabId, snapshot);
      return snapshot;
    } catch (error) {
      console.error("Failed to create accessibility snapshot:", error);
      throw new Error(`Failed to create snapshot: ${error}`);
    }
  }

  /**
   * inject aipex-nodeId attribute to page elements for precise positioning
   * use CDP's DOM.resolveNode to precisely locate elements instead of heuristic lookup
   *
   * solution: use backendNodeId to locate DOM nodes using CDP, then inject attribute
   * optimized: only inject new nodes that don't already have the attribute
   */
  private async injectNodeIdsToPage(
    tabId: number,
    idToNode: Map<string, TextSnapshotNode>,
    existingNodeData: Map<number, { existingId: string; tagName: string }>,
  ): Promise<void> {
    console.log("🔍 [DEBUG] Injecting aipex-nodeId to page elements using CDP");
    const cdpCommander = new CdpCommander(tabId);

    try {
      // ensure debugger is attached
      const attached = await debuggerManager.safeAttachDebugger(tabId);
      if (!attached) {
        console.error(
          "❌ [DEBUG] Failed to attach debugger for node injection",
        );
        return;
      }

      // enable DOM domain
      await cdpCommander.sendCommand("DOM.enable", {});

      // get document node (ensure DOM domain is ready)
      await cdpCommander.sendCommand("DOM.getDocument", { depth: 0 });

      let successCount = 0;
      let failedCount = 0;
      let skippedCount = 0;

      // use p-limit to control concurrency,最多 50 个并发请求
      const limit = pLimit(50);

      // create inject tasks for each node
      const injectTasks = Array.from(idToNode.entries()).map(([uid, node]) => {
        if (!node.backendDOMNodeId) {
          failedCount++;
          return Promise.resolve();
        }

        // Skip nodes that already have the correct ID
        const existingData = existingNodeData.get(node.backendDOMNodeId);
        if (existingData?.existingId === uid) {
          skippedCount++;
          return Promise.resolve();
        }

        // wrap each task with limit
        return limit(async () => {
          try {
            // step 1: use DOM.resolveNode to convert backendNodeId to objectId
            const resolved = await cdpCommander.sendCommand<{
              object?: { objectId?: string };
            }>("DOM.resolveNode", { backendNodeId: node.backendDOMNodeId });

            if (!resolved?.object?.objectId) {
              console.warn(`⚠️ [DEBUG] No objectId for uid ${uid}`);
              failedCount++;
              return;
            }

            // step 2: use Runtime.callFunctionOn to directly operate on DOM element
            const result = await cdpCommander.sendCommand<{
              result?: { value?: boolean };
            }>("Runtime.callFunctionOn", {
              objectId: resolved.object.objectId,
              functionDeclaration: `
                  function(nodeId) {
                    // this is the corresponding DOM element
                    if (this && this.setAttribute) {
                      this.setAttribute('data-aipex-nodeid', nodeId);
                      return true;
                    }
                    return false;
                  }
                `,
              arguments: [{ value: uid }],
              returnByValue: true,
            });
            if (result?.result?.value === true) {
              successCount++;
            } else {
              failedCount++;
            }
            // 释放 remote object
            await cdpCommander.sendCommand("Runtime.releaseObject", {
              objectId: resolved.object.objectId,
            });
          } catch (error) {
            console.warn(`⚠️ [DEBUG] Failed to inject uid ${uid}:`, error);
            failedCount++;
          }
        });
      });

      // wait for all inject tasks to complete
      await Promise.all(injectTasks);

      console.log(
        `✅ [DEBUG] Node injection complete: ${successCount} injected, ${skippedCount} skipped (already set), ${failedCount} failed`,
      );

      // disable DOM domains
      await cdpCommander.sendCommand("DOM.disable", {});
      debuggerManager.safeDetachDebugger(tabId); // Success: schedule delayed detach (may have more operations)
    } catch (error) {
      console.error("❌ [DEBUG] Error in injectNodeIdsToPage:", error);
      debuggerManager.safeDetachDebugger(tabId, true); // Error: detach immediately
    }
  }

  /**
   * get snapshot by tabId
   */
  getSnapshot(tabId: number): TextSnapshot | null {
    return this.#snapshotMap.get(tabId) || null;
  }

  /**
   * get node by uid
   */
  getNodeByUid(tabId: number, uid: string): TextSnapshotNode | null {
    const snapshot = this.getSnapshot(tabId);
    if (!snapshot) {
      return null;
    }
    return snapshot.idToNode.get(uid) || null;
  }

  /**
   * format snapshot to text
   */
  formatSnapshot(snapshot: TextSnapshot): string {
    const focusedNodeIds: string[] = [];
    for (const [id, node] of snapshot.idToNode.entries()) {
      if (node.focused) focusedNodeIds.push(id);
    }

    // 计算所有焦点祖先链（把祖先都标记为 focus-path）
    const focusAncestorSet = new Set<string>();
    // helper: DFS to find path from root to target
    function findPath(
      rootIdLocal: string,
      targetId: string,
      visited = new Set<string>(),
    ): string[] | null {
      if (rootIdLocal === targetId) return [rootIdLocal];
      if (visited.has(rootIdLocal)) return null;
      visited.add(rootIdLocal);
      const node = snapshot.idToNode.get(rootIdLocal);
      if (!node) return null;
      for (const c of node.children) {
        const p = findPath(c.id, targetId, visited);
        if (p) {
          return [rootIdLocal, ...p];
        }
      }
      return null;
    }

    for (const fid of focusedNodeIds) {
      const path = findPath(snapshot.root.id, fid);
      if (path) {
        for (const p of path) {
          focusAncestorSet.add(p);
        }
      } else {
        focusAncestorSet.add(fid); // 若找不到路径（fragmented tree），至少标注焦点自身
      }
    }
    return this.formatNode(snapshot.root, 0, focusAncestorSet);
  }

  /**
   * Search snapshot and format results with context
   *
   * @param tabId - Tab ID to search
   * @param query - Search query string (supports "|" for multiple terms and glob patterns)
   * @param contextLevels - Number of lines to include around matches (default: 1)
   * @param options - Additional search options
   * @returns Formatted text showing matched lines with context, or null if no snapshot
   */
  async searchAndFormat(
    tabId: number,
    query: string,
    contextLevels: number = 1,
    options?: Partial<SearchOptions>,
  ): Promise<string | null> {
    let snapshot: TextSnapshot | null = null;
    try {
      snapshot = await this.createSnapshot(tabId);
    } catch {
      return null;
    }

    if (!snapshot) {
      return null;
    }

    // Get formatted snapshot text
    const snapshotText = this.formatSnapshot(snapshot);

    // Perform text search
    const searchResult = searchSnapshotText(snapshotText, query, {
      contextLevels,
      ...options,
    });

    if (searchResult.totalMatches === 0) {
      return `No matches found for: ${query}`;
    }

    // Format results showing only matched lines with context
    return this.formatSearchResults(snapshotText, searchResult);
  }

  /**
   * Format search results with context
   * Shows only matched lines with surrounding context, separated by dividers
   */
  private formatSearchResults(
    snapshotText: string,
    searchResult: {
      matchedLines: number[];
      contextLines: number[];
      totalMatches: number;
    },
  ): string {
    const { matchedLines, contextLines } = searchResult;
    const lines = snapshotText.split("\n");

    // Create a set for quick lookup of matched lines
    const matchedSet = new Set(matchedLines);

    // Group context lines by proximity to matched lines
    const resultGroups: string[][] = [];
    let currentGroup: string[] = [];
    let lastContextLine = -1;

    for (const lineNum of contextLines) {
      if (lineNum >= 0 && lineNum < lines.length) {
        const line = lines[lineNum];

        if (!line) {
          continue;
        }

        // Check if we need to start a new group
        // Start new group if there's a gap > 2 lines from the last context line
        if (currentGroup.length > 0 && lineNum - lastContextLine > 2) {
          resultGroups.push(currentGroup);
          currentGroup = [];
        }

        // Add marker for matched lines
        if (matchedSet.has(lineNum)) {
          // Replace the first space with ✓ for matched lines
          const markedLine = line.replace(/^(\s*)([^\s])/, "$1✓$2");
          currentGroup.push(markedLine);
        } else {
          currentGroup.push(line);
        }

        lastContextLine = lineNum;
      }
    }

    // Add the last group
    if (currentGroup.length > 0) {
      resultGroups.push(currentGroup);
    }

    // Join groups with dividers
    return resultGroups.map((group) => group.join("\n")).join("\n----\n");
  }

  /**
   * clear snapshot by tabId
   */
  clearSnapshot(tabId: number): void {
    this.#snapshotMap.delete(tabId);
  }

  /**
   * clear all snapshots
   */
  clearAllSnapshots(): void {
    this.#snapshotMap.clear();
  }

  /**
   * check if uid is valid
   */
  isValidUid(tabId: number, uid: string): boolean {
    const snapshot = this.getSnapshot(tabId);
    if (!snapshot) {
      return false;
    }
    return snapshot.idToNode.has(uid);
  }

  /**
   * Determine if a node should be included in output (like DevTools MCP)
   * Only include truly interactive or meaningful elements
   */
  private shouldIncludeInOutput(node: TextSnapshotNode): boolean {
    const role = node.role || "";
    const name = node.name || "";

    // Include root web area (always first)
    if (role === "RootWebArea") {
      return true;
    }

    // Always include interactive elements
    const interactiveRoles = [
      "button",
      "link",
      "textbox",
      "combobox",
      "checkbox",
      "radio",
      "menuitem",
      "tab",
      "slider",
      "spinbutton",
      "searchbox",
    ];

    if (interactiveRoles.includes(role)) {
      return true;
    }

    // Include images (like Google logo)
    if (role === "image" || role === "img") {
      return true;
    }

    // Include StaticText with meaningful content (like link text)
    if (role === "StaticText" && name && name.trim().length > 0) {
      // But skip very short or meaningless text
      const trimmedName = name.trim();
      if (trimmedName.length >= 2) {
        return true;
      }
    }

    if (SKIP_ROLES.includes(role)) {
      return false;
    }

    // For any other role, include if it has meaningful content
    if (name && name.trim().length > 1) {
      return true;
    }

    return false;
  }

  /**
   * format node recursively
   */
  private formatNode(
    node: TextSnapshotNode,
    depth: number,
    focusAncestorSet: Set<string>,
  ): string {
    const shouldInclude = this.shouldIncludeInOutput(node);
    const attributes = shouldInclude
      ? this.getNodeAttributes(node)
      : [node.role];
    // marker: '*' = exact focused node; '→' = ancestor in focus path
    const marker = node.focused
      ? "*"
      : focusAncestorSet.has(node.id)
        ? "→"
        : " ";
    let result = `${" ".repeat(depth * 1) + marker + attributes.join(" ")}\n`;

    // recursively format child nodes
    for (const child of node.children) {
      result += this.formatNode(child, depth + 1, focusAncestorSet);
    }

    return result;
  }

  /**
   * get node attributes list
   */
  private getNodeAttributes(node: TextSnapshotNode): string[] {
    const attributes = [`uid=${node.id}`, node.role, `"${node.name || ""}"`];

    // Add tagName if available
    if (node.tagName) {
      attributes.push(`<${node.tagName}>`);
    }

    // 添加值属性
    const valueProperties = [
      "value",
      "valuetext",
      "valuemin",
      "valuemax",
      "level",
      "autocomplete",
    ];
    for (const property of valueProperties) {
      const value = (node as any)[property];
      if (value !== undefined && value !== null) {
        attributes.push(`${property}="${value}"`);
      }
    }

    // 添加布尔属性
    const booleanProperties = {
      disabled: "disableable",
      expanded: "expandable",
      focused: "focusable",
      selected: "selectable",
      modal: "modal",
      readonly: "readonly",
      required: "required",
    };

    for (const [property, capability] of Object.entries(booleanProperties)) {
      const value = (node as any)[property];
      if (value !== undefined) {
        attributes.push(capability);
        if (value) {
          attributes.push(property);
        }
      }
    }

    // 添加混合属性
    for (const property of ["pressed", "checked"]) {
      const value = (node as any)[property];
      if (value !== undefined) {
        attributes.push(property);
        if (value && value !== true) {
          attributes.push(`${property}="${value}"`);
        } else if (value === true) {
          attributes.push(property);
        }
      }
    }

    return attributes.filter(
      (attribute): attribute is string => attribute !== undefined,
    );
  }
}

// 导出单例实例
export const snapshotManager = new SnapshotManager();
