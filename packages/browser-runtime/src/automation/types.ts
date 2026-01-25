/**
 * Browser Automation Types
 *
 * Type definitions for Chrome DevTools Protocol interactions and accessibility tree
 */

export interface TextSnapshotNode {
  id: string;
  role: string;
  name?: string;
  value?: string;
  description?: string;
  children: TextSnapshotNode[];
  backendDOMNodeId?: number;
  frameId?: string;
  tagName?: string;
  focused?: boolean;
  modal?: boolean;
  keyshortcuts?: string;
  roledescription?: string;
  valuetext?: string;
  disabled?: boolean;
  expanded?: boolean;
  selected?: boolean;
  checked?: boolean | "mixed";
  pressed?: boolean | "mixed";
  level?: number;
  valuemin?: number;
  valuemax?: number;
  autocomplete?: string;
  haspopup?: string;
  invalid?: string;
  orientation?: string;
  readonly?: boolean;
  required?: boolean;
  elementHandle?: () => Promise<Element>;
}

export interface AXNode {
  nodeId: string;
  ignored: boolean;
  ignoredReasons?: Array<{ name: string; value: { type: string; value: any } }>;
  role?: { type: string; value: string };
  chromeRole?: { type: string; value: string };
  name?: { type: string; value: string };
  description?: { type: string; value: string };
  value?: { type: string; value: string };
  properties?: Array<{ name: string; value: { type: string; value: any } }>;
  parentId?: string;
  childIds?: string[];
  backendDOMNodeId?: number;
  frameId?: string;
}

export interface AccessibilityTree {
  nodes: AXNode[];
}

export interface TextSnapshot {
  root: TextSnapshotNode;
  idToNode: Map<string, TextSnapshotNode>;
  tabId: number;
}

export interface Locator {
  fill(value: string): Promise<void>;
  click(options?: { count?: number }): Promise<void>;
  hover(): Promise<void>;
  boundingBox(): Promise<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>;
  getEditorValue(): Promise<string | null>;
  dispose(): void;
}

export interface ElementHandle {
  asLocator(): Locator;
  dispose(): void;
}
