/**
 * Snapshot Manager
 *
 * Creates and manages accessibility tree snapshots for browser automation
 */

import { nanoid } from "nanoid";
import { CdpCommander } from "./cdp-commander";
import { debuggerManager } from "./debugger-manager";
import { type SearchOptions, SKIP_ROLES, searchSnapshotText } from "./query";
import type {
  AccessibilityTree,
  AXNode,
  TextSnapshot,
  TextSnapshotNode,
} from "./types";

function createLimiter(concurrency: number) {
  let active = 0;
  const queue: Array<() => void> = [];

  const next = () => {
    if (queue.length > 0 && active < concurrency) {
      active++;
      const fn = queue.shift()!;
      fn();
    }
  };

  return <T>(fn: () => Promise<T>): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const run = async () => {
        try {
          resolve(await fn());
        } catch (e) {
          reject(e);
        } finally {
          active--;
          next();
        }
      };
      queue.push(run);
      next();
    });
  };
}

export class SnapshotManager {
  #snapshotMap: Map<number, TextSnapshot> = new Map();

  private async fetchExistingNodeIds(
    tabId: number,
    nodeMap: Map<string, AXNode>,
  ): Promise<Map<number, { existingId: string; tagName: string }>> {
    const existingData = new Map<
      number,
      { existingId: string; tagName: string }
    >();
    const cdpCommander = new CdpCommander(tabId);

    try {
      const attached = await debuggerManager.safeAttachDebugger(tabId);
      if (!attached) {
        return existingData;
      }

      await cdpCommander.sendCommand("DOM.enable", {});
      await cdpCommander.sendCommand("DOM.getDocument", { depth: 0 });

      const limit = createLimiter(50);

      const fetchTasks = Array.from(nodeMap.values())
        .filter((axNode) => axNode.backendDOMNodeId)
        .map((axNode) => {
          return limit(async () => {
            try {
              const resolved = await cdpCommander.sendCommand<{
                object?: { objectId?: string };
              }>("DOM.resolveNode", {
                backendNodeId: axNode.backendDOMNodeId,
              });

              if (!resolved?.object?.objectId) {
                return;
              }

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

              if (result?.result?.value && axNode.backendDOMNodeId) {
                const { existingId, tagName } = result.result.value;
                existingData.set(axNode.backendDOMNodeId, {
                  existingId,
                  tagName: tagName || "",
                });
              }

              await cdpCommander.sendCommand("Runtime.releaseObject", {
                objectId: resolved.object.objectId,
              });
            } catch {
              // Silently skip nodes that fail to resolve
            }
          });
        });

      await Promise.all(fetchTasks);
      await cdpCommander.sendCommand("DOM.disable", {});
      debuggerManager.safeDetachDebugger(tabId);

      return existingData;
    } catch {
      debuggerManager.safeDetachDebugger(tabId, true);
      return existingData;
    }
  }

  private async getRealAccessibilityTree(
    tabId: number,
  ): Promise<AccessibilityTree | null> {
    try {
      const attached = await debuggerManager.safeAttachDebugger(tabId);
      if (!attached) {
        throw new Error("Failed to attach debugger");
      }

      const cdpCommander = new CdpCommander(tabId);
      await cdpCommander.sendCommand("Accessibility.enable", {});

      const result = await cdpCommander.sendCommand<AccessibilityTree>(
        "Accessibility.getFullAXTree",
        {},
      );

      debuggerManager.safeDetachDebugger(tabId);
      return result;
    } catch (error) {
      throw new Error(`Failed to create snapshot: ${error}`);
    }
  }

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

  private isLeafNode(axNode: AXNode): boolean {
    if (!axNode.childIds || axNode.childIds.length === 0) {
      return true;
    }
    return this.isControl(axNode);
  }

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

  private isInterestingNode(axNode: AXNode, insideControl = false): boolean {
    const role = axNode.role?.value || "";
    const name = axNode.name?.value || "";
    const value =
      typeof axNode.value?.value === "string" ? axNode.value.value : "";
    const description =
      typeof axNode.description?.value === "string"
        ? axNode.description.value
        : "";

    if (insideControl && this.isLeafNode(axNode)) {
      return true;
    }

    if (role === "RootWebArea") {
      return true;
    }

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

    if (role === "image" || role === "img") {
      return true;
    }

    if (role === "StaticText" && name && name.trim().length >= 2) {
      return true;
    }

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
      const hasContent = [name, value, description].some(
        (content) => content && content.trim().length > 1,
      );
      return hasContent;
    }

    if (role && role !== "generic") {
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

    if (this.isInterestingNode(axNode, insideControl)) {
      interestingNodes.add(axNode.nodeId);
    }

    const childInsideControl = insideControl || this.isControl(axNode);

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

    if (!isInteresting) {
      if (serializedChildren.length === 0) {
        return null;
      }

      if (serializedChildren.length === 1) {
        return serializedChildren[0]!;
      }

      const role = axNode.role?.value || axNode.chromeRole?.value || "generic";
      const name = axNode.name?.value || "";

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
        tagName,
      };

      idToNode.set(containerNode.id, containerNode);
      return containerNode;
    }

    const role = axNode.role?.value || axNode.chromeRole?.value || "";
    let name = axNode.name?.value || "";
    const value = axNode.value?.value;
    const description = axNode.description?.value;

    if (role === "link" && name) {
      const urlMatch = name.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        const url = urlMatch[1];
        const mainText = name.replace(/(https?:\/\/[^\s]+).*$/, "").trim();

        const words = mainText.split(/\s+/);
        const halfLength = Math.floor(words.length / 2);
        const firstHalf = words.slice(0, halfLength).join(" ");
        const secondHalf = words.slice(halfLength).join(" ");

        if (firstHalf === secondHalf && firstHalf.length > 0) {
          name = `${firstHalf} ${url}`;
        }
      }
    }

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
      tagName,
    };

    if (value) node.value = value;
    if (description) node.description = description;

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

    idToNode.set(node.id, node);
    return node;
  }

  private convertAccessibilityTreeToSnapshot(
    snapshotResult: AccessibilityTree,
    existingNodeData: Map<number, { existingId: string; tagName: string }>,
  ): Omit<TextSnapshot, "tabId"> | null {
    const nodes = snapshotResult.nodes;
    if (!nodes || nodes.length === 0) {
      return null;
    }

    const nodeMap = new Map<string, AXNode>();
    for (const node of nodes) {
      nodeMap.set(node.nodeId, node);
    }

    const rootNode = nodes.find((n: AXNode) => !n.parentId);
    if (!rootNode) {
      return null;
    }

    const interestingNodes = new Set<string>();

    this.collectInterestingNodes({
      axNode: rootNode,
      insideControl: false,
      interestingNodes,
      nodeMap,
    });

    if (interestingNodes.size === 0) {
      return null;
    }

    const finalInterestingNodes = new Set<string>();
    for (const nodeId of interestingNodes) {
      const node = nodeMap.get(nodeId);
      if (node) {
        const role = node.role?.value || "";
        const name = node.name?.value || "";
        const value = node.value?.value || "";
        const description = node.description?.value || "";

        if (role === "generic" && !name && !value && !description) {
          const hasInterestingDescendants = this.hasInterestingDescendantsInSet(
            node,
            interestingNodes,
            nodeMap,
          );
          if (!hasInterestingDescendants) {
            continue;
          }
        }

        if (role === "generic" && name) {
          const trimmedName = name.trim();
          if (trimmedName.length < 2) {
            continue;
          }

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
            continue;
          }
        }

        finalInterestingNodes.add(nodeId);
      }
    }

    interestingNodes.clear();
    for (const id of finalInterestingNodes) {
      interestingNodes.add(id);
    }

    const idToNode = new Map<string, TextSnapshotNode>();

    const root = this.serializeTree({
      axNode: rootNode,
      interestingNodes,
      nodeMap,
      idToNode,
      existingNodeData,
    });

    if (!root) {
      return null;
    }

    return {
      root,
      idToNode,
    };
  }

  async createSnapshot(tabId: number): Promise<TextSnapshot> {
    try {
      const axTree = await this.getRealAccessibilityTree(tabId);

      if (!axTree?.nodes || axTree.nodes.length === 0) {
        throw new Error("No accessibility nodes found");
      }

      const nodeMap = new Map<string, AXNode>();
      for (const node of axTree.nodes) {
        nodeMap.set(node.nodeId, node);
      }

      const existingNodeData = await this.fetchExistingNodeIds(tabId, nodeMap);

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

      await this.injectNodeIdsToPage(
        tabId,
        snapshot.idToNode,
        existingNodeData,
      );
      this.#snapshotMap.set(tabId, snapshot);
      return snapshot;
    } catch (error) {
      throw new Error(`Failed to create snapshot: ${error}`);
    }
  }

  private async injectNodeIdsToPage(
    tabId: number,
    idToNode: Map<string, TextSnapshotNode>,
    existingNodeData: Map<number, { existingId: string; tagName: string }>,
  ): Promise<void> {
    const cdpCommander = new CdpCommander(tabId);

    try {
      const attached = await debuggerManager.safeAttachDebugger(tabId);
      if (!attached) {
        return;
      }

      await cdpCommander.sendCommand("DOM.enable", {});
      await cdpCommander.sendCommand("DOM.getDocument", { depth: 0 });

      const limit = createLimiter(50);

      const injectTasks = Array.from(idToNode.entries()).map(([uid, node]) => {
        if (!node.backendDOMNodeId) {
          return Promise.resolve();
        }

        const existingData = existingNodeData.get(node.backendDOMNodeId);
        if (existingData?.existingId === uid) {
          return Promise.resolve();
        }

        return limit(async () => {
          try {
            const resolved = await cdpCommander.sendCommand<{
              object?: { objectId?: string };
            }>("DOM.resolveNode", { backendNodeId: node.backendDOMNodeId });

            if (!resolved?.object?.objectId) {
              return;
            }

            await cdpCommander.sendCommand("Runtime.callFunctionOn", {
              objectId: resolved.object.objectId,
              functionDeclaration: `
                function(nodeId) {
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

            await cdpCommander.sendCommand("Runtime.releaseObject", {
              objectId: resolved.object.objectId,
            });
          } catch {
            // Silently ignore injection failures
          }
        });
      });

      await Promise.all(injectTasks);
      await cdpCommander.sendCommand("DOM.disable", {});
      debuggerManager.safeDetachDebugger(tabId);
    } catch {
      debuggerManager.safeDetachDebugger(tabId, true);
    }
  }

  getSnapshot(tabId: number): TextSnapshot | null {
    return this.#snapshotMap.get(tabId) || null;
  }

  getNodeByUid(tabId: number, uid: string): TextSnapshotNode | null {
    const snapshot = this.getSnapshot(tabId);
    if (!snapshot) {
      return null;
    }
    return snapshot.idToNode.get(uid) || null;
  }

  formatSnapshot(snapshot: TextSnapshot): string {
    const focusedNodeIds: string[] = [];
    for (const [id, node] of snapshot.idToNode.entries()) {
      if (node.focused) focusedNodeIds.push(id);
    }

    const focusAncestorSet = new Set<string>();

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
        focusAncestorSet.add(fid);
      }
    }
    return this.formatNode(snapshot.root, 0, focusAncestorSet);
  }

  async searchAndFormat(
    tabId: number,
    query: string,
    contextLevels: number = 1,
    options?: Partial<SearchOptions>,
  ): Promise<string | null> {
    const snapshot = await this.createSnapshot(tabId);

    if (!snapshot) {
      return null;
    }

    const snapshotText = this.formatSnapshot(snapshot);

    const searchResult = searchSnapshotText(snapshotText, query, {
      contextLevels,
      ...options,
    });

    if (searchResult.totalMatches === 0) {
      return `No matches found for: ${query}`;
    }

    return this.formatSearchResults(snapshotText, searchResult);
  }

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

    const matchedSet = new Set(matchedLines);

    const resultGroups: string[][] = [];
    let currentGroup: string[] = [];
    let lastContextLine = -1;

    for (const lineNum of contextLines) {
      if (lineNum >= 0 && lineNum < lines.length) {
        const line = lines[lineNum];
        if (line === undefined) {
          continue;
        }

        if (currentGroup.length > 0 && lineNum - lastContextLine > 2) {
          resultGroups.push(currentGroup);
          currentGroup = [];
        }

        if (matchedSet.has(lineNum)) {
          const markedLine = line.replace(/^(\s*)([^\s])/, "$1✓$2");
          currentGroup.push(markedLine);
        } else {
          currentGroup.push(line);
        }

        lastContextLine = lineNum;
      }
    }

    if (currentGroup.length > 0) {
      resultGroups.push(currentGroup);
    }

    return resultGroups.map((group) => group.join("\n")).join("\n----\n");
  }

  clearSnapshot(tabId: number): void {
    this.#snapshotMap.delete(tabId);
  }

  clearAllSnapshots(): void {
    this.#snapshotMap.clear();
  }

  isValidUid(tabId: number, uid: string): boolean {
    const snapshot = this.getSnapshot(tabId);
    if (!snapshot) {
      return false;
    }
    return snapshot.idToNode.has(uid);
  }

  private shouldIncludeInOutput(node: TextSnapshotNode): boolean {
    const role = node.role || "";
    const name = node.name || "";

    if (role === "RootWebArea") {
      return true;
    }

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

    if (role === "image" || role === "img") {
      return true;
    }

    if (role === "StaticText" && name && name.trim().length > 0) {
      const trimmedName = name.trim();
      if (trimmedName.length >= 2) {
        return true;
      }
    }

    if (SKIP_ROLES.includes(role)) {
      return false;
    }

    if (name && name.trim().length > 1) {
      return true;
    }

    return false;
  }

  private formatNode(
    node: TextSnapshotNode,
    depth: number,
    focusAncestorSet: Set<string>,
  ): string {
    const shouldInclude = this.shouldIncludeInOutput(node);
    const attributes = shouldInclude
      ? this.getNodeAttributes(node)
      : [node.role];
    const marker = node.focused
      ? "*"
      : focusAncestorSet.has(node.id)
        ? "→"
        : " ";
    let result = `${" ".repeat(depth * 1) + marker + attributes.join(" ")}\n`;

    for (const child of node.children) {
      result += this.formatNode(child, depth + 1, focusAncestorSet);
    }

    return result;
  }

  private getNodeAttributes(node: TextSnapshotNode): string[] {
    const attributes = [`uid=${node.id}`, node.role, `"${node.name || ""}"`];

    if (node.tagName) {
      attributes.push(`<${node.tagName}>`);
    }

    const valueProperties = [
      "value",
      "valuetext",
      "valuemin",
      "valuemax",
      "level",
      "autocomplete",
    ] as const;
    for (const property of valueProperties) {
      const value = node[property];
      if (value !== undefined && value !== null) {
        attributes.push(`${property}="${value}"`);
      }
    }

    const booleanProperties: Record<string, string> = {
      disabled: "disableable",
      expanded: "expandable",
      focused: "focusable",
      selected: "selectable",
      modal: "modal",
      readonly: "readonly",
      required: "required",
    };

    for (const [property, capability] of Object.entries(booleanProperties)) {
      const value = node[property as keyof TextSnapshotNode];
      if (value !== undefined) {
        attributes.push(capability);
        if (value) {
          attributes.push(property);
        }
      }
    }

    const mixedProperties = ["pressed", "checked"] as const;
    for (const property of mixedProperties) {
      const value = node[property];
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

export const snapshotManager = new SnapshotManager();
