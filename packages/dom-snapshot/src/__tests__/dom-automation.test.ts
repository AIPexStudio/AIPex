import { beforeEach, describe, expect, it } from "vitest";
import { collectDomSnapshot } from "../collector";
import { buildTextSnapshot, formatSnapshot } from "../manager";
import { searchAndFormat, searchSnapshotText } from "../query";
import type { DomSnapshotNode, SerializedDomSnapshot } from "../types";

/**
 * Helper to set document.body.innerHTML from HTML string
 * Returns a query helper for selecting elements
 */
function setHtml(html: string) {
  document.body.innerHTML = html;
  return {
    $: <T extends Element = Element>(selector: string) =>
      document.querySelector<T>(selector),
    $$: <T extends Element = Element>(selector: string) =>
      document.querySelectorAll<T>(selector),
  };
}

describe("DOM snapshot collector", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("captures interactive elements with stable ids and metadata", () => {
    const { $ } = setHtml(`
      <main>
        <button id="primary-btn">Primary Action</button>
        <input id="work-email" type="email" placeholder="Work email" />
      </main>
    `);

    const snapshot = collectDomSnapshot(document);
    const button = $<HTMLButtonElement>("#primary-btn")!;
    const buttonUid = button.getAttribute("data-aipex-nodeid")!;

    expect(buttonUid).toBeTruthy();
    expect(snapshot.totalNodes).toBeGreaterThan(0);
    expect(snapshot.root).toBeTruthy();
    expect(snapshot.metadata.url).toContain("http");
  });

  it("respects maxTextLength option via metadata", () => {
    const snapshot = collectDomSnapshot(document, { maxTextLength: 50 });

    expect(snapshot.metadata.options.maxTextLength).toBe(50);
  });

  it("passes captureTextNodes option via metadata", () => {
    const snapshotWithText = collectDomSnapshot(document, {
      captureTextNodes: true,
    });

    expect(snapshotWithText.metadata.options.captureTextNodes).toBe(true);
  });

  it("skips text nodes when captureTextNodes is false", () => {
    setHtml(`<div>Some text content</div>`);

    const snapshotWithoutText = collectDomSnapshot(document, {
      captureTextNodes: false,
    });
    const nodesWithoutText = Object.values(snapshotWithoutText.idToNode);
    const staticTextNodes = nodesWithoutText.filter(
      (n) => n.role === "StaticText",
    );

    expect(staticTextNodes.length).toBe(0);
  });

  it("skips script tag content", () => {
    setHtml(`
      <button>Visible button</button>
      <script>const data = {"props": {"secret": "value"}};</script>
    `);

    const snapshot = collectDomSnapshot(document);
    const nodes = Object.values(snapshot.idToNode);
    const allText = nodes.map((n) => n.textContent || n.name || "").join(" ");

    expect(allText).toContain("Visible button");
    expect(allText).not.toContain("props");
    expect(allText).not.toContain("secret");
  });

  it("skips style tag content", () => {
    setHtml(`
      <button>Visible button</button>
      <style>.hidden { display: none; color: red; }</style>
    `);

    const snapshot = collectDomSnapshot(document);
    const nodes = Object.values(snapshot.idToNode);
    const allText = nodes.map((n) => n.textContent || n.name || "").join(" ");

    expect(allText).toContain("Visible button");
    expect(allText).not.toContain("display");
    expect(allText).not.toContain("color");
  });

  it("skips noscript tag content", () => {
    setHtml(`
      <button>Visible button</button>
      <noscript>JavaScript is disabled</noscript>
    `);

    const snapshot = collectDomSnapshot(document);
    const nodes = Object.values(snapshot.idToNode);
    const allText = nodes.map((n) => n.textContent || n.name || "").join(" ");

    expect(allText).toContain("Visible button");
    expect(allText).not.toContain("JavaScript is disabled");
  });

  it("skips template tag content", () => {
    setHtml(`
      <button>Visible button</button>
      <template><div>Template content</div></template>
    `);

    const snapshot = collectDomSnapshot(document);
    const nodes = Object.values(snapshot.idToNode);
    const allText = nodes.map((n) => n.textContent || n.name || "").join(" ");

    expect(allText).toContain("Visible button");
    expect(allText).not.toContain("Template content");
  });

  it("skips aria-hidden elements and their subtree", () => {
    setHtml(`
      <button>Visible button</button>
      <div aria-hidden="true">
        <span>Hidden text</span>
        <button>Hidden button</button>
      </div>
    `);

    const snapshot = collectDomSnapshot(document);
    const nodes = Object.values(snapshot.idToNode);
    const allText = nodes.map((n) => n.textContent || n.name || "").join(" ");

    expect(allText).toContain("Visible button");
    expect(allText).not.toContain("Hidden text");
    expect(allText).not.toContain("Hidden button");
  });

  it("skips elements with hidden attribute and their subtree", () => {
    setHtml(`
      <button>Visible button</button>
      <div hidden>
        <span>Hidden content</span>
        <a href="#">Hidden link</a>
      </div>
    `);

    const snapshot = collectDomSnapshot(document);
    const nodes = Object.values(snapshot.idToNode);
    const allText = nodes.map((n) => n.textContent || n.name || "").join(" ");

    expect(allText).toContain("Visible button");
    expect(allText).not.toContain("Hidden content");
    expect(allText).not.toContain("Hidden link");
  });

  it("skips inert elements and their subtree", () => {
    setHtml(`
      <button>Visible button</button>
      <div inert>
        <span>Inert text</span>
        <input placeholder="Inert input" />
      </div>
    `);

    const snapshot = collectDomSnapshot(document);
    const nodes = Object.values(snapshot.idToNode);
    const allText = nodes.map((n) => n.textContent || n.name || "").join(" ");

    expect(allText).toContain("Visible button");
    expect(allText).not.toContain("Inert text");
    expect(allText).not.toContain("Inert input");
  });

  it("skips display:none elements and their subtree", () => {
    setHtml(`
      <button>Visible button</button>
      <div style="display: none;">
        <span>Display none text</span>
        <button>Display none button</button>
      </div>
    `);

    const snapshot = collectDomSnapshot(document);
    const nodes = Object.values(snapshot.idToNode);
    const allText = nodes.map((n) => n.textContent || n.name || "").join(" ");

    expect(allText).toContain("Visible button");
    expect(allText).not.toContain("Display none text");
    expect(allText).not.toContain("Display none button");
  });

  it("skips visibility:hidden elements and their subtree", () => {
    setHtml(`
      <button>Visible button</button>
      <div style="visibility: hidden;">
        <span>Visibility hidden text</span>
        <button>Visibility hidden button</button>
      </div>
    `);

    const snapshot = collectDomSnapshot(document);
    const nodes = Object.values(snapshot.idToNode);
    const allText = nodes.map((n) => n.textContent || n.name || "").join(" ");

    expect(allText).toContain("Visible button");
    expect(allText).not.toContain("Visibility hidden text");
    expect(allText).not.toContain("Visibility hidden button");
  });

  it('includes elements with aria-hidden="false"', () => {
    setHtml(`
      <button>Visible button</button>
      <div aria-hidden="false">
        <span>Not hidden text</span>
      </div>
    `);

    const snapshot = collectDomSnapshot(document);
    const nodes = Object.values(snapshot.idToNode);
    const allText = nodes.map((n) => n.textContent || n.name || "").join(" ");

    expect(allText).toContain("Visible button");
    expect(allText).toContain("Not hidden text");
  });

  it("adds StaticText nodes to idToNode flat map", () => {
    setHtml(`<span>Some text content</span>`);

    const snapshot = collectDomSnapshot(document);
    const staticTextNodes = Object.values(snapshot.idToNode).filter(
      (n) => n.role === "StaticText",
    );

    expect(staticTextNodes.length).toBeGreaterThan(0);
    expect(staticTextNodes.some((n) => n.name === "Some text content")).toBe(
      true,
    );
  });

  it("captures text content even when parent element is skipped (generic role)", () => {
    setHtml(`
      <div>
        <span>Text inside span</span>
      </div>
    `);

    const snapshot = collectDomSnapshot(document);
    const nodes = Object.values(snapshot.idToNode);
    const allText = nodes.map((n) => n.textContent || n.name || "").join(" ");

    // span is generic role and gets skipped, but its text content should be captured
    expect(allText).toContain("Text inside span");
  });

  it("captures nested text content through multiple skipped generic elements", () => {
    setHtml(`
      <div>
        <div>
          <span>
            <span>Deeply nested text</span>
          </span>
        </div>
      </div>
    `);

    const snapshot = collectDomSnapshot(document);
    const nodes = Object.values(snapshot.idToNode);
    const allText = nodes.map((n) => n.textContent || n.name || "").join(" ");

    expect(allText).toContain("Deeply nested text");
  });

  it("StaticText nodes have correct id format", () => {
    setHtml(`<p>Test paragraph</p>`);

    const snapshot = collectDomSnapshot(document);
    const staticTextNodes = Object.values(snapshot.idToNode).filter(
      (n) => n.role === "StaticText",
    );

    expect(staticTextNodes.length).toBeGreaterThan(0);
    // StaticText ids should follow pattern: parentId::text-index
    expect(staticTextNodes?.[0]?.id).toMatch(/::text-\d+$/);
  });

  it("returns snapshot with root node", () => {
    const snapshot = collectDomSnapshot(document);

    expect(snapshot.root).toBeTruthy();
    expect(snapshot.root.role).toBe("RootWebArea");
    expect(snapshot.root.children).toBeDefined();
  });

  it("includes timestamp and metadata", () => {
    const snapshot = collectDomSnapshot(document);

    expect(snapshot.timestamp).toBeGreaterThan(0);
    expect(snapshot.metadata.collectedAt).toBeTruthy();
    expect(snapshot.metadata.url).toBeTruthy();
  });

  it("assigns stable node IDs via data attribute", () => {
    const { $ } = setHtml(`<button>Test</button>`);

    collectDomSnapshot(document);
    const nodeId = $("button")!.getAttribute("data-aipex-nodeid");

    expect(nodeId).toBeTruthy();
    expect(nodeId).toMatch(/^dom_/);
  });

  it("reuses existing node IDs", () => {
    const { $ } = setHtml(
      `<button data-aipex-nodeid="existing_id">Test Button</button>`,
    );

    collectDomSnapshot(document);

    // The node ID should remain unchanged
    expect($("button")!.getAttribute("data-aipex-nodeid")).toBe("existing_id");
  });

  it("generates stable IDs across multiple snapshot calls", () => {
    const { $$ } = setHtml(`
      <button>Click Me Button</button>
      <button>Submit Form</button>
      <button>Cancel Action</button>
    `);

    const buttons = $$<HTMLButtonElement>("button");

    // First snapshot call - generates IDs
    collectDomSnapshot(document);
    const id1_first = buttons?.[0]?.getAttribute("data-aipex-nodeid");
    const id2_first = buttons?.[1]?.getAttribute("data-aipex-nodeid");
    const id3_first = buttons?.[2]?.getAttribute("data-aipex-nodeid");

    expect(id1_first).toBeTruthy();
    expect(id2_first).toBeTruthy();
    expect(id3_first).toBeTruthy();

    // Second snapshot call - should reuse same IDs
    collectDomSnapshot(document);
    expect(buttons?.[0]?.getAttribute("data-aipex-nodeid")).toBe(id1_first);
    expect(buttons?.[1]?.getAttribute("data-aipex-nodeid")).toBe(id2_first);
    expect(buttons?.[2]?.getAttribute("data-aipex-nodeid")).toBe(id3_first);

    // Third snapshot call - IDs still stable
    collectDomSnapshot(document);
    expect(buttons?.[0]?.getAttribute("data-aipex-nodeid")).toBe(id1_first);
    expect(buttons?.[1]?.getAttribute("data-aipex-nodeid")).toBe(id2_first);
    expect(buttons?.[2]?.getAttribute("data-aipex-nodeid")).toBe(id3_first);

    // Fourth snapshot call with different options - IDs still stable
    collectDomSnapshot(document, { maxTextLength: 100 });
    expect(buttons?.[0]?.getAttribute("data-aipex-nodeid")).toBe(id1_first);
    expect(buttons?.[1]?.getAttribute("data-aipex-nodeid")).toBe(id2_first);
    expect(buttons?.[2]?.getAttribute("data-aipex-nodeid")).toBe(id3_first);
  });

  it("generates unique IDs for different elements", () => {
    const { $$ } = setHtml(`
      <button>Button 1</button>
      <button>Button 2</button>
      <button>Button 3</button>
    `);

    collectDomSnapshot(document);

    const buttons = $$("button");
    const id1 = buttons?.[0]?.getAttribute("data-aipex-nodeid");
    const id2 = buttons?.[1]?.getAttribute("data-aipex-nodeid");
    const id3 = buttons?.[2]?.getAttribute("data-aipex-nodeid");

    // All IDs should be unique
    expect(id1).not.toBe(id2);
    expect(id2).not.toBe(id3);
    expect(id1).not.toBe(id3);
  });

  it("captures select element selected options", () => {
    setHtml(`
      <select>
        <option value="1">First</option>
        <option value="2" selected>Second</option>
      </select>
    `);

    const snapshot = collectDomSnapshot(document);
    const nodes = Object.values(snapshot.idToNode);
    const selectNode = nodes.find((n) => n.tagName === "select");

    // value should be the HTML value attribute (for form submission)
    expect(selectNode?.value).toBe("2");
    // name should be the display text (what user sees)
    expect(selectNode?.name).toBe("Second");
  });

  it("collects nodes from page with interactive elements", () => {
    setHtml(`
      <form>
        <input type="text" placeholder="Name" />
        <button>Submit</button>
      </form>
    `);

    const snapshot = collectDomSnapshot(document);

    // At minimum we have the root node
    expect(snapshot.totalNodes).toBeGreaterThanOrEqual(1);
    expect(Object.keys(snapshot.idToNode).length).toBeGreaterThan(0);
    expect(snapshot.root).toBeTruthy();
  });
});

describe("DOM snapshot manager", () => {
  beforeEach(() => {
    setHtml(`
      <section>
        <button id="submit-btn">Submit</button>
      </section>
    `);
  });

  const buildMockSerializedSnapshot = (): SerializedDomSnapshot => {
    const child: DomSnapshotNode = {
      id: "btn",
      role: "button",
      name: "Save",
      children: [],
      tagName: "button",
      focused: true,
    };

    const placeholderChild: DomSnapshotNode = {
      id: "input1",
      role: "textbox",
      name: "",
      children: [],
      tagName: "input",
      placeholder: "Enter value",
    };

    const root: DomSnapshotNode = {
      id: "root",
      role: "RootWebArea",
      name: "Mock Page",
      children: [child, placeholderChild],
      tagName: "body",
    };

    return {
      root,
      idToNode: {
        root,
        btn: child,
        input1: placeholderChild,
      },
      totalNodes: 3,
      timestamp: Date.now(),
      metadata: {
        title: "mock",
        url: "https://example.test",
        collectedAt: new Date().toISOString(),
        options: {},
      },
    };
  };

  it("reconstructs TextSnapshot objects and formats output", () => {
    const serialized = collectDomSnapshot(document);
    const textSnapshot = buildTextSnapshot(serialized);

    expect(textSnapshot.idToNode.size).toBeGreaterThan(1);

    const formatted = formatSnapshot(textSnapshot);
    expect(formatted).toContain("uid=");
    const roles = Array.from(textSnapshot.idToNode.values()).map(
      (node) => node.role,
    );
    expect(roles).toContain("RootWebArea");
  });

  it("show button in formatted result", () => {
    setHtml(`<button>
                <div>Some text content</div>
             </button>`);

    const serialized = collectDomSnapshot(document);
    const textSnapshot = buildTextSnapshot(serialized);

    const formatted = formatSnapshot(textSnapshot);
    expect(formatted).toContain("button");
  });

  it("show select in formatted result", () => {
    setHtml(`<select>
      <option value="1">First</option>
      <option selected value="2">Second</option>
    </select>`);

    const serialized = collectDomSnapshot(document);
    const textSnapshot = buildTextSnapshot(serialized);
    const formatted = formatSnapshot(textSnapshot);

    expect(formatted).toContain("select");
    // value should be the HTML value attribute, not the display text
    expect(formatted).toContain('<select> value="2"');
  });

  it("show radio in formatted result with value and checked state", () => {
    setHtml(`
      <fieldset>
        <legend>Choose your favorite color</legend>
        <input type="radio" name="color" value="red" id="red">
        <label for="red">Red</label>
        <input type="radio" name="color" value="blue" id="blue" checked>
        <label for="blue">Blue</label>
        <input type="radio" name="color" value="green" id="green">
        <label for="green">Green</label>
      </fieldset>
    `);

    const serialized = collectDomSnapshot(document);
    const textSnapshot = buildTextSnapshot(serialized);
    const formatted = formatSnapshot(textSnapshot);

    // Should contain radio role
    expect(formatted).toContain("radio");
    // value should be the HTML value attribute
    expect(formatted).toContain('value="red"');
    expect(formatted).toContain('value="blue"');
    expect(formatted).toContain('value="green"');
    // checked state should be captured for the selected radio
    expect(formatted).toContain('checked="true"');
  });

  it("show checkbox in formatted result with value and checked state", () => {
    setHtml(`
      <div>
        <input type="checkbox" name="agree" value="yes" id="agree" checked>
        <label for="agree">I agree to terms</label>
      </div>
    `);

    const serialized = collectDomSnapshot(document);
    const textSnapshot = buildTextSnapshot(serialized);
    const formatted = formatSnapshot(textSnapshot);

    expect(formatted).toContain("checkbox");
    // value should be the HTML value attribute
    expect(formatted).toContain('value="yes"');
    expect(formatted).toContain('checked="true"');
  });

  it("ignore div with no role in formatted result", () => {
    const { $ } = setHtml(`
      <button>
        <div class='ignore'></div>
        <div>Some text content</div>
      </button>`);
    const ignore = $<HTMLDivElement>("div.ignore")!;
    expect(ignore).toBeTruthy();
    expect(ignore.getAttribute("data-aipex-nodeid")).toBeFalsy();
    const serialized = collectDomSnapshot(document);
    const textSnapshot = buildTextSnapshot(serialized);
    const formatted = formatSnapshot(textSnapshot);
    // body -> button -> static text
    expect(formatted.split(`\n`).filter((line) => line.trim()).length).toBe(3);
  });

  it("buildTextSnapshot converts placeholder to description when missing", () => {
    const serialized = buildMockSerializedSnapshot();
    const textSnapshot = buildTextSnapshot(serialized);

    const inputNode = textSnapshot.idToNode.get("input1");
    expect(inputNode?.description).toBe("Enter value");
    expect(inputNode?.tagName).toBe("input");
  });

  it("formatSnapshot marks focused nodes and ancestors", () => {
    const serialized = buildMockSerializedSnapshot();
    const textSnapshot = buildTextSnapshot(serialized);
    const formatted = formatSnapshot(textSnapshot);

    const focusedLine = formatted
      .split("\n")
      .find((line) => line.trim().startsWith("*uid=btn"));
    const ancestorLine = formatted
      .split("\n")
      .find((line) => line.trim().startsWith("→uid=root"));

    expect(focusedLine).toBeTruthy();
    expect(ancestorLine).toBeTruthy();
    expect(focusedLine).toContain("button");
  });

  it("formatSnapshot outputs node attributes such as value and checked state", () => {
    const serialized = buildMockSerializedSnapshot();
    (serialized.idToNode["btn"] as DomSnapshotNode).value = "Click me";
    (serialized.idToNode["btn"] as DomSnapshotNode).checked = true;
    const snapshot = buildTextSnapshot(serialized);
    const formatted = formatSnapshot(snapshot);

    expect(formatted).toContain('value="Click me"');
    expect(formatted).toContain("checked");
  });

  it("buildTextSnapshot populates idToNode Map with all nodes", () => {
    const grandchild: DomSnapshotNode = {
      id: "grandchild",
      role: "StaticText",
      name: "Nested text",
      children: [],
    };

    const child: DomSnapshotNode = {
      id: "child",
      role: "button",
      name: "Click",
      children: [grandchild],
      tagName: "button",
    };

    const root: DomSnapshotNode = {
      id: "root",
      role: "RootWebArea",
      name: "Test",
      children: [child],
      tagName: "body",
    };

    const serialized: SerializedDomSnapshot = {
      root,
      idToNode: { root, child, grandchild },
      totalNodes: 3,
      timestamp: Date.now(),
      metadata: {
        title: "test",
        url: "https://test.com",
        collectedAt: new Date().toISOString(),
        options: {},
      },
    };

    const textSnapshot = buildTextSnapshot(serialized);

    expect(textSnapshot.idToNode.size).toBe(3);
    expect(textSnapshot.idToNode.has("root")).toBe(true);
    expect(textSnapshot.idToNode.has("child")).toBe(true);
    expect(textSnapshot.idToNode.has("grandchild")).toBe(true);

    const childNode = textSnapshot.idToNode.get("child");
    expect(childNode?.children.length).toBe(1);
    expect(childNode?.children?.[0]?.id).toBe("grandchild");
  });

  describe("shouldIncludeInOutput filtering", () => {
    const createSnapshotWithNode = (
      nodeProps: Partial<DomSnapshotNode>,
    ): SerializedDomSnapshot => {
      const testNode: DomSnapshotNode = {
        id: "test-node",
        role: "generic",
        name: "",
        children: [],
        ...nodeProps,
      };

      const root: DomSnapshotNode = {
        id: "root",
        role: "RootWebArea",
        name: "Test",
        children: [testNode],
        tagName: "body",
      };

      return {
        root,
        idToNode: { root, "test-node": testNode },
        totalNodes: 2,
        timestamp: Date.now(),
        metadata: {
          title: "test",
          url: "https://test.com",
          collectedAt: new Date().toISOString(),
          options: {},
        },
      };
    };

    it("includes RootWebArea with full attributes", () => {
      const serialized = createSnapshotWithNode({ role: "generic", name: "" });
      const snapshot = buildTextSnapshot(serialized);
      const formatted = formatSnapshot(snapshot);

      expect(formatted).toContain("uid=root");
      expect(formatted).toContain("RootWebArea");
    });

    it.each([
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
      "switch",
    ])('includes interactive role "%s" with full attributes', (role) => {
      const serialized = createSnapshotWithNode({ role, name: "Action" });
      const snapshot = buildTextSnapshot(serialized);
      const formatted = formatSnapshot(snapshot);

      expect(formatted).toContain("uid=test-node");
      expect(formatted).toContain(role);
    });

    it("includes image role with full attributes", () => {
      const serialized = createSnapshotWithNode({
        role: "image",
        name: "Logo",
      });
      const snapshot = buildTextSnapshot(serialized);
      const formatted = formatSnapshot(snapshot);

      expect(formatted).toContain("uid=test-node");
      expect(formatted).toContain("image");
    });

    it("includes img role with full attributes", () => {
      const serialized = createSnapshotWithNode({
        role: "img",
        name: "Picture",
      });
      const snapshot = buildTextSnapshot(serialized);
      const formatted = formatSnapshot(snapshot);

      expect(formatted).toContain("uid=test-node");
      expect(formatted).toContain("img");
    });

    it("includes StaticText with name of 2+ chars with full attributes", () => {
      const serialized = createSnapshotWithNode({
        role: "StaticText",
        name: "Hi",
      });
      const snapshot = buildTextSnapshot(serialized);
      const formatted = formatSnapshot(snapshot);

      // StaticText nodes don't have uid - they can't be operated on directly
      expect(formatted).not.toContain("uid=test-node");
      expect(formatted).toContain("StaticText");
      expect(formatted).toContain('"Hi"');
    });

    it("excludes StaticText with name less than 2 chars from full output", () => {
      const serialized = createSnapshotWithNode({
        role: "StaticText",
        name: "X",
      });
      const snapshot = buildTextSnapshot(serialized);
      const formatted = formatSnapshot(snapshot);

      const lines = formatted
        .split("\n")
        .filter((l) => l.includes("test-node"));
      expect(lines.length).toBe(0);
    });

    it("includes nodes with name longer than 1 char with full attributes", () => {
      const serialized = createSnapshotWithNode({
        role: "heading",
        name: "Welcome",
      });
      const snapshot = buildTextSnapshot(serialized);
      const formatted = formatSnapshot(snapshot);

      expect(formatted).toContain("uid=test-node");
      expect(formatted).toContain("heading");
    });

    it("excludes generic role with empty name from full output", () => {
      const serialized = createSnapshotWithNode({ role: "generic", name: "" });
      const snapshot = buildTextSnapshot(serialized);
      const formatted = formatSnapshot(snapshot);

      const testNodeLines = formatted
        .split("\n")
        .filter((l) => l.includes("uid=test-node"));
      expect(testNodeLines.length).toBe(0);
    });
  });

  describe("getNodeAttributes complete coverage", () => {
    const createNodeWithAttributes = (
      attrs: Partial<DomSnapshotNode>,
    ): SerializedDomSnapshot => {
      const testNode: DomSnapshotNode = {
        id: "attr-node",
        role: "button",
        name: "Test Button",
        children: [],
        tagName: "button",
        ...attrs,
      };

      const root: DomSnapshotNode = {
        id: "root",
        role: "RootWebArea",
        name: "Test",
        children: [testNode],
        tagName: "body",
      };

      return {
        root,
        idToNode: { root, "attr-node": testNode },
        totalNodes: 2,
        timestamp: Date.now(),
        metadata: {
          title: "test",
          url: "https://test.com",
          collectedAt: new Date().toISOString(),
          options: {},
        },
      };
    };

    it("outputs disabled attribute when node is disabled", () => {
      const serialized = createNodeWithAttributes({ disabled: true });
      const snapshot = buildTextSnapshot(serialized);
      const formatted = formatSnapshot(snapshot);

      expect(formatted).toContain("disabled");
    });

    it("outputs selected attribute when node is selected", () => {
      const serialized = createNodeWithAttributes({ selected: true });
      const snapshot = buildTextSnapshot(serialized);
      const formatted = formatSnapshot(snapshot);

      expect(formatted).toContain("selected");
    });

    it("outputs expanded attribute when node is expanded", () => {
      const serialized = createNodeWithAttributes({ expanded: true });
      const snapshot = buildTextSnapshot(serialized);
      const formatted = formatSnapshot(snapshot);

      expect(formatted).toContain("expanded");
    });

    it("outputs tagName in angle brackets", () => {
      const serialized = createNodeWithAttributes({ tagName: "div" });
      const snapshot = buildTextSnapshot(serialized);
      const formatted = formatSnapshot(snapshot);

      expect(formatted).toContain("<div>");
    });

    it('outputs checked="mixed" for indeterminate checkbox', () => {
      const serialized = createNodeWithAttributes({ checked: "mixed" });
      const snapshot = buildTextSnapshot(serialized);
      const formatted = formatSnapshot(snapshot);

      expect(formatted).toContain('checked="mixed"');
    });

    it('outputs checked="false" for unchecked checkbox', () => {
      const serialized = createNodeWithAttributes({ checked: false });
      const snapshot = buildTextSnapshot(serialized);
      const formatted = formatSnapshot(snapshot);

      expect(formatted).toContain('checked="false"');
    });

    it("outputs pressed attribute when node is pressed", () => {
      const serialized = createNodeWithAttributes({ pressed: true });
      const snapshot = buildTextSnapshot(serialized);
      const formatted = formatSnapshot(snapshot);

      expect(formatted).toContain('pressed="true"');
    });

    it('outputs pressed="mixed" for mixed pressed state', () => {
      const serialized = createNodeWithAttributes({ pressed: "mixed" });
      const snapshot = buildTextSnapshot(serialized);
      const formatted = formatSnapshot(snapshot);

      expect(formatted).toContain('pressed="mixed"');
    });

    it('outputs pressed="false" for unpressed toggle', () => {
      const serialized = createNodeWithAttributes({ pressed: false });
      const snapshot = buildTextSnapshot(serialized);
      const formatted = formatSnapshot(snapshot);

      expect(formatted).toContain('pressed="false"');
    });

    it("outputs description attribute when present", () => {
      const serialized = createNodeWithAttributes({
        description: "Helper text",
      });
      const snapshot = buildTextSnapshot(serialized);
      const formatted = formatSnapshot(snapshot);

      expect(formatted).toContain('desc="Helper text"');
    });
  });

  describe("formatNode marker logic", () => {
    it("uses space marker for non-focused nodes not in focus path", () => {
      const nonFocusedNode: DomSnapshotNode = {
        id: "sibling",
        role: "button",
        name: "Sibling",
        children: [],
        tagName: "button",
        focused: false,
      };

      const focusedNode: DomSnapshotNode = {
        id: "focused",
        role: "button",
        name: "Focused",
        children: [],
        tagName: "button",
        focused: true,
      };

      const root: DomSnapshotNode = {
        id: "root",
        role: "RootWebArea",
        name: "Test",
        children: [nonFocusedNode, focusedNode],
        tagName: "body",
      };

      const serialized: SerializedDomSnapshot = {
        root,
        idToNode: { root, sibling: nonFocusedNode, focused: focusedNode },
        totalNodes: 3,
        timestamp: Date.now(),
        metadata: {
          title: "test",
          url: "https://test.com",
          collectedAt: new Date().toISOString(),
          options: {},
        },
      };

      const snapshot = buildTextSnapshot(serialized);
      const formatted = formatSnapshot(snapshot);

      const siblingLine = formatted
        .split("\n")
        .find((l) => l.includes("uid=sibling"));
      expect(siblingLine).toBeTruthy();
      // Non-focused, non-ancestor nodes use space marker (not * or →)
      // Format: [indentation][marker][attributes], so marker is just before 'uid='
      const markerMatch = siblingLine?.match(/^(\s*)(.)(uid=sibling)/);
      expect(markerMatch).toBeTruthy();
      expect(markerMatch?.[2]).toBe(" "); // marker should be space
    });

    it("uses asterisk marker for focused node", () => {
      const focusedNode: DomSnapshotNode = {
        id: "focused",
        role: "button",
        name: "Focused",
        children: [],
        tagName: "button",
        focused: true,
      };

      const root: DomSnapshotNode = {
        id: "root",
        role: "RootWebArea",
        name: "Test",
        children: [focusedNode],
        tagName: "body",
      };

      const serialized: SerializedDomSnapshot = {
        root,
        idToNode: { root, focused: focusedNode },
        totalNodes: 2,
        timestamp: Date.now(),
        metadata: {
          title: "test",
          url: "https://test.com",
          collectedAt: new Date().toISOString(),
          options: {},
        },
      };

      const snapshot = buildTextSnapshot(serialized);
      const formatted = formatSnapshot(snapshot);

      const focusedLine = formatted
        .split("\n")
        .find((l) => l.includes("uid=focused"));
      expect(focusedLine).toBeTruthy();
      expect(focusedLine?.trim().startsWith("*")).toBe(true);
    });

    it("uses arrow marker for ancestors of focused node", () => {
      const focusedChild: DomSnapshotNode = {
        id: "child",
        role: "button",
        name: "Child",
        children: [],
        tagName: "button",
        focused: true,
      };

      const parent: DomSnapshotNode = {
        id: "parent",
        role: "group",
        name: "Parent Group",
        children: [focusedChild],
        tagName: "div",
      };

      const root: DomSnapshotNode = {
        id: "root",
        role: "RootWebArea",
        name: "Test",
        children: [parent],
        tagName: "body",
      };

      const serialized: SerializedDomSnapshot = {
        root,
        idToNode: { root, parent, child: focusedChild },
        totalNodes: 3,
        timestamp: Date.now(),
        metadata: {
          title: "test",
          url: "https://test.com",
          collectedAt: new Date().toISOString(),
          options: {},
        },
      };

      const snapshot = buildTextSnapshot(serialized);
      const formatted = formatSnapshot(snapshot);

      const rootLine = formatted
        .split("\n")
        .find((l) => l.includes("uid=root"));
      expect(rootLine?.trim().startsWith("→")).toBe(true);
    });
  });

  describe("edge cases and complex structures", () => {
    it("handles nodes with empty children array", () => {
      const emptyNode: DomSnapshotNode = {
        id: "empty",
        role: "button",
        name: "Empty",
        children: [],
        tagName: "button",
      };

      const root: DomSnapshotNode = {
        id: "root",
        role: "RootWebArea",
        name: "Test",
        children: [emptyNode],
        tagName: "body",
      };

      const serialized: SerializedDomSnapshot = {
        root,
        idToNode: { root, empty: emptyNode },
        totalNodes: 2,
        timestamp: Date.now(),
        metadata: {
          title: "test",
          url: "https://test.com",
          collectedAt: new Date().toISOString(),
          options: {},
        },
      };

      const snapshot = buildTextSnapshot(serialized);
      const formatted = formatSnapshot(snapshot);

      expect(formatted).toContain("uid=empty");
      expect(snapshot.idToNode.get("empty")?.children).toEqual([]);
    });

    it("handles nodes without name property", () => {
      const noNameNode: DomSnapshotNode = {
        id: "noname",
        role: "button",
        children: [],
        tagName: "button",
      };

      const root: DomSnapshotNode = {
        id: "root",
        role: "RootWebArea",
        name: "Test",
        children: [noNameNode],
        tagName: "body",
      };

      const serialized: SerializedDomSnapshot = {
        root,
        idToNode: { root, noname: noNameNode },
        totalNodes: 2,
        timestamp: Date.now(),
        metadata: {
          title: "test",
          url: "https://test.com",
          collectedAt: new Date().toISOString(),
          options: {},
        },
      };

      const snapshot = buildTextSnapshot(serialized);
      const formatted = formatSnapshot(snapshot);

      expect(formatted).toContain("uid=noname");
      expect(formatted).toContain('""');
    });

    it("handles multiple focused nodes", () => {
      const focused1: DomSnapshotNode = {
        id: "f1",
        role: "button",
        name: "First",
        children: [],
        tagName: "button",
        focused: true,
      };

      const focused2: DomSnapshotNode = {
        id: "f2",
        role: "button",
        name: "Second",
        children: [],
        tagName: "button",
        focused: true,
      };

      const root: DomSnapshotNode = {
        id: "root",
        role: "RootWebArea",
        name: "Test",
        children: [focused1, focused2],
        tagName: "body",
      };

      const serialized: SerializedDomSnapshot = {
        root,
        idToNode: { root, f1: focused1, f2: focused2 },
        totalNodes: 3,
        timestamp: Date.now(),
        metadata: {
          title: "test",
          url: "https://test.com",
          collectedAt: new Date().toISOString(),
          options: {},
        },
      };

      const snapshot = buildTextSnapshot(serialized);
      const formatted = formatSnapshot(snapshot);

      const lines = formatted.split("\n");
      const f1Line = lines.find((l) => l.includes("uid=f1"));
      const f2Line = lines.find((l) => l.includes("uid=f2"));

      expect(f1Line?.trim().startsWith("*")).toBe(true);
      expect(f2Line?.trim().startsWith("*")).toBe(true);
    });

    it("handles deeply nested structures", () => {
      const level3: DomSnapshotNode = {
        id: "l3",
        role: "button",
        name: "Deep Button",
        children: [],
        tagName: "button",
      };

      const level2: DomSnapshotNode = {
        id: "l2",
        role: "group",
        name: "Level 2",
        children: [level3],
        tagName: "div",
      };

      const level1: DomSnapshotNode = {
        id: "l1",
        role: "group",
        name: "Level 1",
        children: [level2],
        tagName: "div",
      };

      const root: DomSnapshotNode = {
        id: "root",
        role: "RootWebArea",
        name: "Test",
        children: [level1],
        tagName: "body",
      };

      const serialized: SerializedDomSnapshot = {
        root,
        idToNode: { root, l1: level1, l2: level2, l3: level3 },
        totalNodes: 4,
        timestamp: Date.now(),
        metadata: {
          title: "test",
          url: "https://test.com",
          collectedAt: new Date().toISOString(),
          options: {},
        },
      };

      const snapshot = buildTextSnapshot(serialized);
      expect(snapshot.idToNode.size).toBe(4);

      const l3Node = snapshot.idToNode.get("l3");
      expect(l3Node?.role).toBe("button");
      expect(l3Node?.name).toBe("Deep Button");

      const formatted = formatSnapshot(snapshot);
      expect(formatted).toContain("uid=l3");
    });

    it("clones all node properties correctly", () => {
      const fullNode: DomSnapshotNode = {
        id: "full",
        role: "checkbox",
        name: "Accept Terms",
        value: "terms",
        description: "Accept the terms and conditions",
        children: [],
        tagName: "input",
        checked: true,
        pressed: false,
        disabled: false,
        focused: false,
        selected: true,
        expanded: false,
        placeholder: "Check this",
      };

      const root: DomSnapshotNode = {
        id: "root",
        role: "RootWebArea",
        name: "Test",
        children: [fullNode],
        tagName: "body",
      };

      const serialized: SerializedDomSnapshot = {
        root,
        idToNode: { root, full: fullNode },
        totalNodes: 2,
        timestamp: Date.now(),
        metadata: {
          title: "test",
          url: "https://test.com",
          collectedAt: new Date().toISOString(),
          options: {},
        },
      };

      const snapshot = buildTextSnapshot(serialized);
      const clonedNode = snapshot.idToNode.get("full");

      expect(clonedNode?.id).toBe("full");
      expect(clonedNode?.role).toBe("checkbox");
      expect(clonedNode?.name).toBe("Accept Terms");
      expect(clonedNode?.value).toBe("terms");
      expect(clonedNode?.description).toBe("Accept the terms and conditions");
      expect(clonedNode?.tagName).toBe("input");
      expect(clonedNode?.checked).toBe(true);
      expect(clonedNode?.pressed).toBe(false);
      expect(clonedNode?.disabled).toBe(false);
      expect(clonedNode?.focused).toBe(false);
      expect(clonedNode?.selected).toBe(true);
      expect(clonedNode?.expanded).toBe(false);
    });
  });
});

describe("searchSnapshotText", () => {
  const sampleSnapshotText = `→uid=root RootWebArea "Test Page" <body>
 uid=btn1 button "Submit Form" <button>
 uid=btn2 button "Cancel" <button>
 uid=input1 textbox "Email" <input> desc="Enter your email"
 uid=link1 link "Learn More" <a>
  StaticText "Welcome to our site"
 uid=btn3 button "Login" <button>
 uid=btn4 button "Sign In" <button>`;

  it("finds simple text matches", () => {
    const result = searchSnapshotText(sampleSnapshotText, "Submit");

    expect(result.totalMatches).toBe(1);
    expect(result.matchedLines.length).toBe(1);
  });

  it("finds multiple matches with | separator", () => {
    const result = searchSnapshotText(sampleSnapshotText, "Login | Sign In");

    expect(result.totalMatches).toBe(2);
    expect(result.matchedLines.length).toBe(2);
  });

  it("performs case-insensitive search by default", () => {
    const result = searchSnapshotText(sampleSnapshotText, "submit");

    expect(result.totalMatches).toBe(1);
  });

  it("performs case-sensitive search when option is set", () => {
    const result = searchSnapshotText(sampleSnapshotText, "submit", {
      caseSensitive: true,
    });

    expect(result.totalMatches).toBe(0);
  });

  it("returns empty result for no matches", () => {
    const result = searchSnapshotText(sampleSnapshotText, "NonExistent");

    expect(result.totalMatches).toBe(0);
    expect(result.matchedLines).toEqual([]);
    expect(result.contextLines).toEqual([]);
  });

  it("returns empty result for empty query", () => {
    const result = searchSnapshotText(sampleSnapshotText, "");

    expect(result.totalMatches).toBe(0);
  });

  it("includes context lines around matches", () => {
    const result = searchSnapshotText(sampleSnapshotText, "Email", {
      contextLevels: 1,
    });

    expect(result.totalMatches).toBe(1);
    expect(result.contextLines.length).toBeGreaterThan(1);
  });

  it("supports glob pattern with asterisk", () => {
    const result = searchSnapshotText(sampleSnapshotText, "button*", {
      useGlob: true,
    });

    expect(result.totalMatches).toBeGreaterThan(0);
  });

  it("supports glob pattern matching anywhere in line", () => {
    const result = searchSnapshotText(sampleSnapshotText, "*Form*", {
      useGlob: true,
    });

    expect(result.totalMatches).toBe(1);
  });

  it("auto-detects glob patterns", () => {
    const result = searchSnapshotText(sampleSnapshotText, "*Cancel*");

    expect(result.totalMatches).toBe(1);
  });

  it("handles multiple search terms with mixed glob patterns", () => {
    const result = searchSnapshotText(
      sampleSnapshotText,
      "Submit | *Cancel* | Login",
    );

    expect(result.totalMatches).toBe(3);
  });

  it("supports question mark glob pattern", () => {
    const text = "line1 test\nline2 text\nline3 tent";
    const result = searchSnapshotText(text, "*te?t*", { useGlob: true });

    expect(result.totalMatches).toBe(3);
  });

  it("supports brace expansion in glob patterns", () => {
    const result = searchSnapshotText(sampleSnapshotText, "*{Login,Cancel}*", {
      useGlob: true,
    });

    expect(result.totalMatches).toBe(2);
  });
});

describe("searchAndFormat", () => {
  const createMockSnapshot = (): SerializedDomSnapshot => {
    const button1: DomSnapshotNode = {
      id: "btn1",
      role: "button",
      name: "Submit Form",
      children: [],
      tagName: "button",
    };

    const button2: DomSnapshotNode = {
      id: "btn2",
      role: "button",
      name: "Cancel",
      children: [],
      tagName: "button",
    };

    const input: DomSnapshotNode = {
      id: "input1",
      role: "textbox",
      name: "Email",
      children: [],
      tagName: "input",
      placeholder: "Enter your email",
    };

    const root: DomSnapshotNode = {
      id: "root",
      role: "RootWebArea",
      name: "Test Page",
      children: [button1, button2, input],
      tagName: "body",
    };

    return {
      root,
      idToNode: { root, btn1: button1, btn2: button2, input1: input },
      totalNodes: 4,
      timestamp: Date.now(),
      metadata: {
        title: "Test",
        url: "https://test.com",
        collectedAt: new Date().toISOString(),
        options: {},
      },
    };
  };

  it("returns formatted results with matches", async () => {
    const snapshot = createMockSnapshot();
    const result = await searchAndFormat(snapshot, "Submit");

    expect(result).not.toBeNull();
    expect(result).toContain("Submit");
  });

  it("returns no matches message when query not found", async () => {
    const snapshot = createMockSnapshot();
    const result = await searchAndFormat(snapshot, "NonExistent");

    expect(result).toContain("No matches found");
  });

  it("returns null for null snapshot", async () => {
    const result = await searchAndFormat(
      null as unknown as SerializedDomSnapshot,
      "test",
    );

    expect(result).toBeNull();
  });

  it("respects contextLevels parameter", async () => {
    const snapshot = createMockSnapshot();
    const result = await searchAndFormat(snapshot, "Email", 2);

    expect(result).not.toBeNull();
    expect(result).toContain("Email");
  });

  it("passes search options through", async () => {
    const snapshot = createMockSnapshot();
    const result = await searchAndFormat(snapshot, "submit", 1, {
      caseSensitive: true,
    });

    expect(result).toContain("No matches found");
  });

  it("marks matched lines with checkmark", async () => {
    const snapshot = createMockSnapshot();
    const result = await searchAndFormat(snapshot, "Cancel");

    expect(result).not.toBeNull();
    expect(result).toContain("✓");
  });

  it("handles multiple search terms", async () => {
    const snapshot = createMockSnapshot();
    const result = await searchAndFormat(snapshot, "Submit | Cancel");

    expect(result).not.toBeNull();
    expect(result).toContain("Submit");
    expect(result).toContain("Cancel");
  });
});
