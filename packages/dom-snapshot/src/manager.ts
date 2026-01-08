import { buildFocusAncestorSet, formatNode } from "./snapshot-formatter.js";
import type {
  DomSnapshotNode,
  SerializedDomSnapshot,
  TextSnapshot,
  TextSnapshotNode,
} from "./types.js";

export interface BuildSnapshotOptions {
  tabId?: number;
}

export class DomSnapshotManager {
  buildTextSnapshot(
    source: SerializedDomSnapshot,
    options?: BuildSnapshotOptions,
  ): TextSnapshot {
    const idToNode = new Map<string, TextSnapshotNode>();
    const root = this.cloneNode(source.root, idToNode);
    return {
      root,
      idToNode,
      tabId: options?.tabId ?? 0,
    };
  }

  formatSnapshot(snapshot: TextSnapshot): string {
    const focusAncestorSet = buildFocusAncestorSet(
      snapshot.root,
      snapshot.idToNode,
    );
    return formatNode(snapshot.root, 0, focusAncestorSet);
  }

  private cloneNode(
    node: DomSnapshotNode,
    idToNode: Map<string, TextSnapshotNode>,
  ): TextSnapshotNode {
    const clonedChildren =
      node.children?.map((child) => this.cloneNode(child, idToNode)) ?? [];
    const clonedNode: TextSnapshotNode = {
      id: node.id,
      role: node.role,
      name: node.name,
      value: node.value,
      description: node.description,
      children: clonedChildren,
      tagName: node.tagName,
      checked: node.checked,
      pressed: node.pressed,
      disabled: node.disabled,
      focused: node.focused,
      selected: node.selected,
      expanded: node.expanded,
    };

    if (node.placeholder && !clonedNode.description) {
      clonedNode.description = node.placeholder;
    }

    idToNode.set(clonedNode.id, clonedNode);
    return clonedNode;
  }
}

export const domSnapshotManager = new DomSnapshotManager();
