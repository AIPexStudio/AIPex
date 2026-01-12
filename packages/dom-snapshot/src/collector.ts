import type {
  CollectorOptions,
  DomSnapshotFlatMap,
  DomSnapshotNode,
  SerializedDomSnapshot,
} from "./types.js";

const NODE_ID_ATTR = "data-aipex-nodeid";
const STATIC_TEXT_ROLE = "StaticText";
const ROOT_ROLE = "RootWebArea";

// Tags that should be completely skipped (no traversal, no text extraction)
const SKIP_TAGS = new Set([
  "script",
  "style",
  "noscript",
  "template",
  "svg", // SVG internals are usually not useful for automation
  "head",
  "meta",
  "link",
]);

const DEFAULT_OPTIONS: CollectorOptions = {
  maxTextLength: 160,
  includeHidden: false,
  captureTextNodes: true,
};

const INTERACTIVE_TAGS = new Set([
  "a",
  "button",
  "summary",
  "details",
  "select",
  "textarea",
  "input",
  "label",
  "video",
  "audio",
]);

const INPUT_TYPES_AS_ROLE: Record<string, string> = {
  button: "button",
  submit: "button",
  reset: "button",
  image: "button",
  checkbox: "checkbox",
  radio: "radio",
  range: "slider",
  email: "textbox",
  search: "searchbox",
  url: "textbox",
  number: "spinbutton",
  password: "textbox",
  text: "textbox",
};

const LAYOUT_ROLES = new Set([
  "generic",
  "article",
  "section",
  "region",
  "group",
  "main",
  "complementary",
  "navigation",
  "banner",
  "contentinfo",
]);

const INTERACTIVE_ROLES = new Set([
  "button",
  "checkbox",
  "combobox",
  "link",
  "menuitem",
  "radio",
  "searchbox",
  "slider",
  "spinbutton",
  "switch",
  "tab",
  "textbox",
]);

export function collectDomSnapshot(
  rootDocument: Document = document,
  options?: Partial<CollectorOptions>,
): SerializedDomSnapshot {
  const config: CollectorOptions = { ...DEFAULT_OPTIONS, ...options };
  const idToNode: DomSnapshotFlatMap = Object.create(null);
  const body = rootDocument.body || rootDocument.documentElement;

  const rootNode: DomSnapshotNode = {
    id: ensureElementUid(
      body ?? rootDocument.documentElement ?? rootDocument.createElement("div"),
    ),
    role: ROOT_ROLE,
    name: rootDocument.title || rootDocument.URL || "document",
    children: [],
    tagName: body?.tagName.toLowerCase(),
  };

  const walkerRoot = body || rootDocument.documentElement;
  if (walkerRoot) {
    const childNodes = traverseElement(
      walkerRoot,
      config,
      idToNode,
      rootDocument,
    ).nodes;
    if (childNodes.length > 0) {
      rootNode.children.push(...childNodes);
    }
  }

  idToNode[rootNode.id] = rootNode;

  return {
    root: rootNode,
    idToNode,
    totalNodes: Object.keys(idToNode).length,
    timestamp: Date.now(),
    metadata: {
      title: rootDocument.title || "",
      url: rootDocument.URL || "",
      collectedAt: new Date().toISOString(),
      options: config,
    },
  };
}

export function collectDomSnapshotInPage(
  options?: Partial<CollectorOptions>,
): SerializedDomSnapshot {
  return collectDomSnapshot(document, options);
}

type TraverseResult = {
  nodes: DomSnapshotNode[];
  /**
   * Whether this subtree contains at least one element whose computed
   * `visibility` is not hidden. Used to prune fully `visibility:hidden` subtrees
   * while still allowing descendants to override with `visibility: visible`.
   */
  hasVisibilityVisible: boolean;
};

function isElementVisibilityHidden(
  element: Element,
  rootDocument: Document,
): boolean {
  if (!(element instanceof HTMLElement)) {
    return false;
  }
  const style = rootDocument.defaultView?.getComputedStyle(element);
  if (!style) {
    return false;
  }
  return style.visibility === "hidden" || style.visibility === "collapse";
}

function traverseElement(
  element: Element,
  options: CollectorOptions,
  idToNode: DomSnapshotFlatMap,
  rootDocument: Document,
): TraverseResult {
  // Skip tags that should not be traversed (script, style, etc.)
  const tagName = element.tagName.toLowerCase();
  if (SKIP_TAGS.has(tagName)) {
    return { nodes: [], hasVisibilityVisible: false };
  }

  // Skip entire subtree if element is hidden (not just the element itself)
  if (!options.includeHidden && isElementHidden(element, rootDocument)) {
    return { nodes: [], hasVisibilityVisible: false };
  }

  const childrenNodes: DomSnapshotNode[] = [];
  let hasVisibilityVisibleInChildren = false;

  const childElements = Array.from(element.children);
  for (const child of childElements) {
    const childResult = traverseElement(child, options, idToNode, rootDocument);
    childrenNodes.push(...childResult.nodes);
    if (childResult.hasVisibilityVisible) {
      hasVisibilityVisibleInChildren = true;
    }
  }

  const selfVisibilityHidden =
    !options.includeHidden && isElementVisibilityHidden(element, rootDocument);
  const hasVisibilityVisible =
    !selfVisibilityHidden || hasVisibilityVisibleInChildren;

  // Optimization: If this entire subtree is `visibility:hidden` and no descendants override
  // it back to `visibility: visible`, prune it to reduce noise and work.
  if (selfVisibilityHidden && !hasVisibilityVisibleInChildren) {
    return { nodes: [], hasVisibilityVisible: false };
  }

  const nodes: DomSnapshotNode[] = [];
  const includeSelf = shouldIncludeElement(element, options, rootDocument);

  if (options.captureTextNodes) {
    const textChildren = extractTextNodes(element, options, idToNode);
    childrenNodes.push(...textChildren);
  }

  if (!includeSelf) {
    if (childrenNodes.length === 1) {
      return { nodes: childrenNodes, hasVisibilityVisible };
    }
    if (childrenNodes.length > 1) {
      const syntheticNode = createNodeFromElement(
        element,
        options,
        idToNode,
        rootDocument,
        true,
      );
      syntheticNode.children = childrenNodes;
      idToNode[syntheticNode.id] = syntheticNode;
      nodes.push(syntheticNode);
      return { nodes, hasVisibilityVisible };
    }
    return { nodes, hasVisibilityVisible };
  }

  const node = createNodeFromElement(
    element,
    options,
    idToNode,
    rootDocument,
    false,
  );
  node.children = childrenNodes;
  idToNode[node.id] = node;
  nodes.push(node);
  return { nodes, hasVisibilityVisible };
}

function createNodeFromElement(
  element: Element,
  options: CollectorOptions,
  _idToNode: DomSnapshotFlatMap,
  rootDocument: Document,
  _isSynthetic: boolean,
): DomSnapshotNode {
  const nodeId = ensureElementUid(element);
  const role = resolveRole(element);
  const name = resolveAccessibleName(element, rootDocument);
  const value = resolveElementValue(element);

  const node: DomSnapshotNode = {
    id: nodeId,
    role: role || "generic",
    name: name || undefined,
    children: [],
    tagName: element.tagName.toLowerCase(),
  };

  if (value) {
    node.value = value;
  }

  // Only capture textContent for interactive elements to avoid redundancy
  // Container elements (section, div, etc.) would otherwise include all descendant text
  // which is already captured via StaticText child nodes
  const isInteractive =
    INTERACTIVE_ROLES.has(role) ||
    INTERACTIVE_TAGS.has(element.tagName.toLowerCase());

  if (isInteractive) {
    const textContent = extractVisibleTextContent(element);
    if (textContent && textContent !== node.name) {
      node.textContent = textContent.slice(0, options.maxTextLength);
    }
  }

  if (element instanceof HTMLInputElement) {
    node.inputType = element.type;
    if (element.placeholder) {
      node.placeholder = element.placeholder;
    }
    if (element.type === "checkbox" || element.type === "radio") {
      node.checked = element.indeterminate ? "mixed" : element.checked;
    }
    if (element.type === "submit" && !node.name) {
      node.name = element.value || "Submit";
    }
  }

  if (element instanceof HTMLTextAreaElement) {
    node.inputType = "textarea";
    if (!node.value && element.value) {
      node.value = element.value;
    }
    if (element.placeholder) {
      node.placeholder = element.placeholder;
    }
  }

  if (element instanceof HTMLSelectElement) {
    node.inputType = "select";
    const selectedOptions = Array.from(element.selectedOptions);
    if (selectedOptions.length > 0) {
      // value should be the actual HTML value attribute (for form submission)
      node.value = selectedOptions.map((opt) => opt.value).join(", ");
      // name should be the selected option's display text (what user sees), not all options' text
      const selectedText = selectedOptions
        .map((opt) => opt.label || opt.textContent?.trim() || "")
        .filter(Boolean)
        .join(", ");
      if (selectedText) {
        node.name = selectedText;
      }
    }
  }

  if (element instanceof HTMLAnchorElement) {
    node.href = element.href;
  }

  if (element instanceof HTMLImageElement) {
    node.description = element.alt || undefined;
  }

  if (element instanceof HTMLElement) {
    if (element.title) {
      node.title = element.title;
    }
    if (element.hasAttribute("aria-disabled")) {
      node.disabled = element.getAttribute("aria-disabled") === "true";
    } else if ("disabled" in element) {
      node.disabled = Boolean(
        (element as HTMLButtonElement | HTMLInputElement).disabled,
      );
    }
    if (element.hasAttribute("aria-pressed")) {
      const pressed = element.getAttribute("aria-pressed");
      node.pressed = pressed === "mixed" ? "mixed" : pressed === "true";
    }
    if (element.hasAttribute("aria-expanded")) {
      node.expanded = element.getAttribute("aria-expanded") === "true";
    }
    if (element.hasAttribute("aria-selected")) {
      node.selected = element.getAttribute("aria-selected") === "true";
    }

    // Capture focused state
    if (rootDocument.activeElement === element) {
      node.focused = true;
    }
  }

  // For synthetic nodes without a name, we no longer derive from textContent
  // The text content is already captured via StaticText child nodes
  // Setting a massive name from all descendant text creates redundancy and noise

  return node;
}

function hasExplicitAccessibleLabel(
  element: Element,
  rootDocument: Document,
): boolean {
  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel && ariaLabel.trim().length > 1) {
    return true;
  }

  const labelledBy = element.getAttribute("aria-labelledby");
  if (labelledBy) {
    const ids = labelledBy
      .split(/\s+/g)
      .map((id) => id.trim())
      .filter(Boolean);
    const labelText = ids
      .map((id) => rootDocument.getElementById(id)?.textContent?.trim() || "")
      .filter(Boolean)
      .join(" ");
    if (labelText.length > 1) {
      return true;
    }
  }

  return false;
}

/**
 * Check if an element has cursor: pointer style, indicating it's clickable via CSS/JS.
 * This helps identify interactive elements that don't use semantic HTML.
 */
function hasCursorPointer(element: Element, rootDocument: Document): boolean {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  const style = rootDocument.defaultView?.getComputedStyle(element);
  if (!style) {
    return false;
  }

  return style.cursor === "pointer";
}

function shouldIncludeElement(
  element: Element,
  options: CollectorOptions,
  rootDocument: Document,
): boolean {
  if (!options.includeHidden && !isElementVisible(element, rootDocument)) {
    return false;
  }

  const role = resolveRole(element);
  const name = resolveAccessibleName(element, rootDocument);
  const hasMeaningfulName = Boolean(name && name.trim().length > 1);

  if (INTERACTIVE_ROLES.has(role)) {
    return true;
  }

  if (INTERACTIVE_TAGS.has(element.tagName.toLowerCase())) {
    return true;
  }

  if (element instanceof HTMLElement && element.isContentEditable) {
    return true;
  }

  // Include elements with cursor: pointer style (clickable via CSS/JS)
  if (hasCursorPointer(element, rootDocument)) {
    return true;
  }

  if (role === "image") {
    const img = element as HTMLImageElement;
    return Boolean(img.alt && img.alt.trim().length > 0);
  }

  // Include elements with explicit accessibility labels (aria-label, aria-labelledby)
  // even if they have a generic/layout role
  if (hasExplicitAccessibleLabel(element, rootDocument)) {
    return true;
  }

  if (!LAYOUT_ROLES.has(role) && hasMeaningfulName) {
    return true;
  }

  const normalizedText = normalizeTextContent(element.textContent || "");
  if (normalizedText.length >= 2 && !LAYOUT_ROLES.has(role)) {
    return true;
  }

  return false;
}

function resolveRole(element: Element): string {
  const explicitRole = element.getAttribute("role");
  if (explicitRole) {
    return explicitRole;
  }

  const tag = element.tagName.toLowerCase();

  if (tag === "a") {
    return (element as HTMLAnchorElement).href ? "link" : "generic";
  }

  if (tag === "button") {
    return "button";
  }

  if (tag === "img") {
    return "image";
  }

  if (tag === "textarea") {
    return "textbox";
  }

  if (tag === "select") {
    return "combobox";
  }

  if (tag === "input") {
    const input = element as HTMLInputElement;
    const type = (input.type || "text").toLowerCase();
    return (
      INPUT_TYPES_AS_ROLE[type] ||
      (input.type === "range" ? "slider" : "textbox")
    );
  }

  if (element instanceof HTMLElement && element.isContentEditable) {
    return "textbox";
  }

  return "generic";
}

function resolveAccessibleName(
  element: Element,
  rootDocument: Document,
): string | null {
  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel && ariaLabel.trim().length > 0) {
    return ariaLabel.trim();
  }

  const labelledBy = element.getAttribute("aria-labelledby");
  if (labelledBy) {
    const ids = labelledBy
      .split(/\s+/g)
      .map((id) => id.trim())
      .filter(Boolean);
    const texts: string[] = [];
    for (const id of ids) {
      const target = rootDocument.getElementById(id);
      if (target) {
        const text = normalizeTextContent(target.textContent || "");
        if (text) {
          texts.push(text);
        }
      }
    }
    if (texts.length > 0) {
      return texts.join(" ");
    }
  }

  if (element instanceof HTMLImageElement && element.alt) {
    return element.alt.trim();
  }

  if (element instanceof HTMLInputElement) {
    if (element.placeholder) {
      return element.placeholder;
    }
    if (element.type === "submit" || element.type === "button") {
      return element.value || "Submit";
    }
  }

  if (element instanceof HTMLButtonElement && element.textContent) {
    return normalizeTextContent(element.textContent);
  }

  if (element instanceof HTMLAnchorElement) {
    const text = normalizeTextContent(element.textContent || "");
    if (text) {
      return text;
    }
  }

  // For other elements, only use textContent as name if the element is interactive
  // Non-interactive containers should not derive name from their descendant text
  const tagName = element.tagName.toLowerCase();
  const role = element.getAttribute("role") || "";
  const isInteractive =
    INTERACTIVE_ROLES.has(role) || INTERACTIVE_TAGS.has(tagName);

  if (isInteractive) {
    const textContent = extractVisibleTextContent(element);
    return textContent || null;
  }

  // For non-interactive elements, don't derive name from textContent
  return null;
}

function resolveElementValue(element: Element): string | undefined {
  if (element instanceof HTMLInputElement) {
    if (element.type === "password") {
      return "*".repeat(element.value.length);
    }
    return element.value || undefined;
  }

  if (element instanceof HTMLTextAreaElement) {
    return element.value || undefined;
  }

  if (element instanceof HTMLSelectElement) {
    const selected = element.selectedOptions[0];
    if (selected) {
      // Return the actual HTML value attribute for consistency with form submission
      return selected.value || undefined;
    }
    return undefined;
  }

  if (element instanceof HTMLElement && element.isContentEditable) {
    return normalizeTextContent(element.textContent || "") || undefined;
  }

  return undefined;
}

function extractTextNodes(
  element: Element,
  _options: CollectorOptions,
  idToNode: DomSnapshotFlatMap,
): DomSnapshotNode[] {
  const results: DomSnapshotNode[] = [];
  const childNodes = Array.from(element.childNodes);
  childNodes.forEach((node, index) => {
    if (node.nodeType !== Node.TEXT_NODE) {
      return;
    }
    const text = normalizeTextContent(node.textContent || "");
    if (!text || text.length === 0) {
      return;
    }
    const uid = `${ensureElementUid(element)}::text-${index}`;
    // StaticText nodes use 'name' for text content
    // No need for 'textContent' field as it would be redundant
    const textNode: DomSnapshotNode = {
      id: uid,
      role: STATIC_TEXT_ROLE,
      name: text,
      children: [],
    };
    idToNode[uid] = textNode; // Add to flat map for consistency
    results.push(textNode);
  });
  return results;
}

function ensureElementUid(element: Element): string {
  const existing = element.getAttribute(NODE_ID_ATTR);
  if (existing) {
    return existing;
  }
  const uid = `dom_${generateShortId()}`;
  element.setAttribute(NODE_ID_ATTR, uid);
  return uid;
}

function generateShortId(): string {
  const random = Math.random().toString(36).slice(2, 8);
  const time = Date.now().toString(36).slice(-4);
  return `${time}${random}`;
}

function normalizeTextContent(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Extract visible text content from an element, excluding script, style, and other non-visible tags.
 * This is used for interactive elements where we want meaningful text content for AI search.
 */
function extractVisibleTextContent(element: Element): string {
  const texts: string[] = [];

  function traverse(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        texts.push(text);
      }
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      const tagName = el.tagName.toLowerCase();

      // Skip non-visible content tags
      if (SKIP_TAGS.has(tagName)) {
        return;
      }

      // Traverse children
      for (const child of Array.from(node.childNodes)) {
        traverse(child);
      }
    }
  }

  traverse(element);
  return texts.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * Check if an element is completely hidden and its entire subtree should be skipped.
 * This is a stronger check than isElementVisible - if true, we skip the whole subtree.
 */
function isElementHidden(element: Element, rootDocument: Document): boolean {
  // Check aria-hidden attribute (hides entire subtree from accessibility tree)
  if (element.getAttribute("aria-hidden") === "true") {
    return true;
  }

  // Check hidden attribute (HTML5 hidden)
  if (element.hasAttribute("hidden")) {
    return true;
  }

  // Check inert attribute (makes element and subtree non-interactive and hidden from AT)
  if (element.hasAttribute("inert")) {
    return true;
  }

  // Check CSS visibility
  if (element instanceof HTMLElement) {
    const style = rootDocument.defaultView?.getComputedStyle(element);
    if (style) {
      // display: none hides entire subtree
      if (style.display === "none") {
        return true;
      }
      // Note: we intentionally do NOT treat `visibility: hidden` as an unconditional
      // subtree skip signal. `visibility` can be overridden by descendants, so pruning
      // fully `visibility:hidden` subtrees is handled in `traverseElement`.
    }
  }

  return false;
}

/**
 * Check if an element should be considered visible for inclusion purposes.
 * This is a weaker check - element might still be traversed even if not visible.
 */
function isElementVisible(element: Element, rootDocument: Document): boolean {
  if (!(element instanceof HTMLElement)) {
    return true;
  }
  const style = rootDocument.defaultView?.getComputedStyle(element);
  if (!style) {
    return true;
  }
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.opacity === "0"
  ) {
    return false;
  }
  // offsetParent is unreliable in JSDOM/happy-dom (always null), skip this heuristic in test environments
  const win = rootDocument.defaultView;
  const isTestEnv =
    win &&
    (win.navigator?.userAgent?.includes("jsdom") || win.innerWidth === 0);
  if (
    !isTestEnv &&
    element.offsetParent === null &&
    style.position !== "fixed"
  ) {
    return element === element.ownerDocument?.body;
  }
  return true;
}
