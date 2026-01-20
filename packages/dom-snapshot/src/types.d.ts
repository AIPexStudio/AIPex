export interface DomSnapshotNode {
  id: string;
  role: string;
  name?: string;
  value?: string;
  description?: string;
  children: DomSnapshotNode[];
  tagName?: string;
  checked?: boolean | "mixed";
  pressed?: boolean | "mixed";
  disabled?: boolean;
  focused?: boolean;
  selected?: boolean;
  expanded?: boolean;
  placeholder?: string;
  href?: string;
  title?: string;
  textContent?: string;
  inputType?: string;
}
export interface DomSnapshotFlatMap {
  [uid: string]: DomSnapshotNode;
}
export interface DomSnapshotResult {
  root: DomSnapshotNode;
  idToNode: DomSnapshotFlatMap;
  totalNodes: number;
  timestamp: number;
}
export interface CollectorOptions {
  /**
   * Maximum text length stored for StaticText nodes. Defaults to 160.
   */
  maxTextLength: number;
  /**
   * Should we include invisible elements (display:none / hidden). Defaults to false.
   */
  includeHidden: boolean;
  /**
   * Whether to capture raw text nodes as StaticText entries. Defaults to true.
   */
  captureTextNodes: boolean;
}
export interface SerializedDomSnapshot extends DomSnapshotResult {
  /**
   * Additional metadata to help debug or visualize the snapshot.
   */
  metadata: {
    title: string;
    url: string;
    collectedAt: string;
    options: Partial<CollectorOptions>;
  };
}
export interface TextSnapshotNode {
  id: string;
  role: string;
  name?: string;
  value?: string;
  description?: string;
  children: TextSnapshotNode[];
  backendDOMNodeId?: number;
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
export interface TextSnapshot {
  root: TextSnapshotNode;
  idToNode: Map<string, TextSnapshotNode>;
}
