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

  it("does not let undefined option values override defaults", () => {
    const snapshot = collectDomSnapshot(document, {
      maxTextLength: undefined,
      includeHidden: undefined,
      captureTextNodes: undefined,
    });

    // Default values should be preserved when options have undefined values
    expect(snapshot.metadata.options.maxTextLength).toBe(160);
    expect(snapshot.metadata.options.includeHidden).toBe(false);
    expect(snapshot.metadata.options.captureTextNodes).toBe(true);
  });

  it("applies explicit option values while ignoring undefined ones", () => {
    const snapshot = collectDomSnapshot(document, {
      maxTextLength: 100,
      includeHidden: undefined,
      captureTextNodes: false,
    });

    // Explicit values should be applied
    expect(snapshot.metadata.options.maxTextLength).toBe(100);
    expect(snapshot.metadata.options.captureTextNodes).toBe(false);
    // undefined should fall back to default
    expect(snapshot.metadata.options.includeHidden).toBe(false);
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

  it("skips visibility:hidden elements and their subtree (no visible overrides)", () => {
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

  it("includes visible descendants across repeated visibility overrides", () => {
    const { $ } = setHtml(`
      <div style="visibility: hidden;">
        <div style="visibility: visible;">
          <button id="btn-v1">Visible L1</button>
          <div style="visibility: hidden;">
            <button id="btn-h1">Hidden L2</button>
            <div style="visibility: visible;">
              <button id="btn-v2">Visible L3</button>
              <div style="visibility: hidden;">
                <button id="btn-h2">Hidden L4</button>
                <div style="visibility: visible;">
                  <button id="btn-v3">Visible L5</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `);

    const snapshot = collectDomSnapshot(document);
    const nodes = Object.values(snapshot.idToNode);
    const allText = nodes.map((n) => n.textContent || n.name || "").join(" ");

    expect(allText).toContain("Visible L1");
    expect(allText).toContain("Visible L3");
    expect(allText).toContain("Visible L5");
    expect(allText).not.toContain("Hidden L2");
    expect(allText).not.toContain("Hidden L4");

    expect(
      $<HTMLButtonElement>("#btn-v1")!.getAttribute("data-aipex-nodeid"),
    ).toBeTruthy();
    expect(
      $<HTMLButtonElement>("#btn-v2")!.getAttribute("data-aipex-nodeid"),
    ).toBeTruthy();
    expect(
      $<HTMLButtonElement>("#btn-v3")!.getAttribute("data-aipex-nodeid"),
    ).toBeTruthy();
    expect(
      $<HTMLButtonElement>("#btn-h1")!.getAttribute("data-aipex-nodeid"),
    ).toBeNull();
    expect(
      $<HTMLButtonElement>("#btn-h2")!.getAttribute("data-aipex-nodeid"),
    ).toBeNull();
  });

  it("handles multiple branches with repeated visibility overrides", () => {
    const { $ } = setHtml(`
      <div style="visibility: hidden;">
        <div style="visibility: hidden;">
          <button id="a-hidden">A hidden</button>
        </div>

        <div style="visibility: hidden;">
          <div style="visibility: visible;">
            <button id="b-visible">B visible</button>
            <div style="visibility: hidden;">
              <div style="visibility: visible;">
                <button id="b-visible-deep">B visible deep</button>
              </div>
              <button id="b-hidden-sibling">B hidden sibling</button>
            </div>
          </div>
        </div>

        <div style="visibility: visible;">
          <button id="c-visible">C visible</button>
          <div style="visibility: hidden;">
            <button id="c-hidden">C hidden</button>
          </div>
        </div>
      </div>
    `);

    const snapshot = collectDomSnapshot(document);
    const nodes = Object.values(snapshot.idToNode);
    const allText = nodes.map((n) => n.textContent || n.name || "").join(" ");

    expect(allText).toContain("B visible");
    expect(allText).toContain("B visible deep");
    expect(allText).toContain("C visible");
    expect(allText).not.toContain("A hidden");
    expect(allText).not.toContain("B hidden sibling");
    expect(allText).not.toContain("C hidden");

    expect(
      $<HTMLButtonElement>("#b-visible")!.getAttribute("data-aipex-nodeid"),
    ).toBeTruthy();
    expect(
      $<HTMLButtonElement>("#b-visible-deep")!.getAttribute(
        "data-aipex-nodeid",
      ),
    ).toBeTruthy();
    expect(
      $<HTMLButtonElement>("#c-visible")!.getAttribute("data-aipex-nodeid"),
    ).toBeTruthy();

    expect(
      $<HTMLButtonElement>("#a-hidden")!.getAttribute("data-aipex-nodeid"),
    ).toBeNull();
    expect(
      $<HTMLButtonElement>("#b-hidden-sibling")!.getAttribute(
        "data-aipex-nodeid",
      ),
    ).toBeNull();
    expect(
      $<HTMLButtonElement>("#c-hidden")!.getAttribute("data-aipex-nodeid"),
    ).toBeNull();
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

  it("captures span element with aria-label", () => {
    setHtml(`
      <div>
        <span aria-label="Important label">Some text</span>
      </div>
    `);

    const snapshot = collectDomSnapshot(document);
    const nodes = Object.values(snapshot.idToNode);

    // span with aria-label should be included as a node
    const spanNode = nodes.find(
      (n) => n.tagName === "span" && n.name === "Important label",
    );
    expect(spanNode).toBeTruthy();
    expect(spanNode?.name).toBe("Important label");
  });

  it("captures span element with explicit role and aria-label", () => {
    setHtml(`
      <div>
        <span role="status" aria-label="Loading status">Loading...</span>
      </div>
    `);

    const snapshot = collectDomSnapshot(document);
    const nodes = Object.values(snapshot.idToNode);

    // span with explicit role should be included
    const spanNode = nodes.find((n) => n.role === "status");
    expect(spanNode).toBeTruthy();
    expect(spanNode?.name).toBe("Loading status");
  });

  it("captures element with aria-labelledby", () => {
    setHtml(`
      <div>
        <span id="label-text">Description Label</span>
        <div aria-labelledby="label-text">Content here</div>
      </div>
    `);

    const snapshot = collectDomSnapshot(document);
    const nodes = Object.values(snapshot.idToNode);

    // div with aria-labelledby should be included (find by tagName + name)
    const labelledDiv = nodes.find(
      (n) => n.tagName === "div" && n.name === "Description Label",
    );
    expect(labelledDiv).toBeTruthy();
    expect(labelledDiv?.name).toBe("Description Label");
  });

  it("captures span with aria-label inside nested structure (real-world icon button)", () => {
    setHtml(`
      <div class="ant-space-item">
        <span aria-describedby="rh">
          <span class="anticon zcp-icon" aria-label="Show Deploy Detail" data-testid="action-detail" style="font-size: 16px;">
            <svg class="icon" viewBox="0 0 1024 1024" width="200" height="200">
              <path d="M833.013155 249.550056L468.049052"></path>
            </svg>
          </span>
        </span>
      </div>
    `);

    const snapshot = collectDomSnapshot(document);
    const nodes = Object.values(snapshot.idToNode);

    // The span with aria-label="Show Deploy Detail" should be captured
    const iconSpan = nodes.find((n) => n.name === "Show Deploy Detail");
    expect(iconSpan).toBeTruthy();
    expect(iconSpan?.tagName).toBe("span");
    expect(iconSpan?.name).toBe("Show Deploy Detail");

    // Search should find it
    const searchResult = searchAndFormat(snapshot, "Show Deploy Detail");
    expect(searchResult).not.toBeNull();
    expect(searchResult).toContain("Show Deploy Detail");
    expect(searchResult).not.toContain("No matches found");
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

  describe("textContent capture for interactive vs non-interactive elements", () => {
    it("captures textContent for interactive elements when different from name", () => {
      // Button with aria-label has name from aria-label, but textContent from inner text
      setHtml(`
        <button aria-label="Action">
          <span>Click</span>
          <span>Me</span>
        </button>
      `);

      const snapshot = collectDomSnapshot(document);
      const nodes = Object.values(snapshot.idToNode);
      const buttonNode = nodes.find((n) => n.tagName === "button");

      // Button is interactive and textContent differs from name (aria-label)
      expect(buttonNode?.name).toBe("Action");
      expect(buttonNode?.textContent).toBe("Click Me");
    });

    it("does NOT duplicate textContent when same as name for interactive elements", () => {
      // Simple button where textContent equals name
      setHtml(`<button>Click Me</button>`);

      const snapshot = collectDomSnapshot(document);
      const nodes = Object.values(snapshot.idToNode);
      const buttonNode = nodes.find((n) => n.tagName === "button");

      // name and textContent would be the same, so textContent is not stored
      expect(buttonNode?.name).toBe("Click Me");
      expect(buttonNode?.textContent).toBeUndefined();
    });

    it("does NOT capture textContent for non-interactive container elements (section)", () => {
      setHtml(`
        <section>
          <h1>Title</h1>
          <p>Some paragraph text</p>
          <button>Click</button>
        </section>
      `);

      const snapshot = collectDomSnapshot(document);
      const nodes = Object.values(snapshot.idToNode);
      const sectionNode = nodes.find((n) => n.tagName === "section");

      // Section is NOT interactive, so textContent should be undefined
      expect(sectionNode?.textContent).toBeUndefined();
    });

    it("does NOT capture textContent for non-interactive container elements (div)", () => {
      setHtml(`
        <div>
          <span>Text 1</span>
          <span>Text 2</span>
          <span>Text 3</span>
        </div>
      `);

      const snapshot = collectDomSnapshot(document);
      const nodes = Object.values(snapshot.idToNode);
      const divNode = nodes.find((n) => n.tagName === "div");

      // Div is NOT interactive, so textContent should be undefined
      expect(divNode?.textContent).toBeUndefined();
    });

    it("does NOT capture textContent for main, nav, article elements", () => {
      setHtml(`
        <main>
          <nav>Navigation links</nav>
          <article>Article content</article>
        </main>
      `);

      const snapshot = collectDomSnapshot(document);
      const nodes = Object.values(snapshot.idToNode);

      const mainNode = nodes.find((n) => n.tagName === "main");
      const navNode = nodes.find((n) => n.tagName === "nav");
      const articleNode = nodes.find((n) => n.tagName === "article");

      expect(mainNode?.textContent).toBeUndefined();
      expect(navNode?.textContent).toBeUndefined();
      expect(articleNode?.textContent).toBeUndefined();
    });

    it("captures textContent for elements with interactive role when different from name", () => {
      setHtml(
        `<div role="button" aria-label="Action">Custom Button Text</div>`,
      );

      const snapshot = collectDomSnapshot(document);
      const nodes = Object.values(snapshot.idToNode);
      const customButton = nodes.find((n) => n.role === "button");

      // Element has interactive role, textContent differs from name (aria-label)
      expect(customButton?.name).toBe("Action");
      expect(customButton?.textContent).toBe("Custom Button Text");
    });

    it("text content is still captured via StaticText nodes for non-interactive containers", () => {
      setHtml(`
        <section>
          <p>Important text here</p>
        </section>
      `);

      const snapshot = collectDomSnapshot(document);
      const nodes = Object.values(snapshot.idToNode);

      // Section should NOT have textContent
      const sectionNode = nodes.find((n) => n.tagName === "section");
      expect(sectionNode?.textContent).toBeUndefined();

      // But StaticText nodes should capture the text
      const staticTextNodes = nodes.filter((n) => n.role === "StaticText");
      const textContent = staticTextNodes.map((n) => n.name).join(" ");
      expect(textContent).toContain("Important text here");
    });

    it("interactive elements can have textContent, container divs cannot", () => {
      setHtml(`
        <div>
          <button aria-label="Btn1">Button 1 Text</button>
          <a href="#" aria-label="Lnk1">Link 1 Text</a>
        </div>
      `);

      const snapshot = collectDomSnapshot(document);
      const nodes = Object.values(snapshot.idToNode);

      const buttonNode = nodes.find((n) => n.tagName === "button");
      const linkNode = nodes.find((n) => n.tagName === "a");
      const divNode = nodes.find((n) => n.tagName === "div");

      // Interactive elements have textContent when it differs from name
      expect(buttonNode?.name).toBe("Btn1");
      expect(buttonNode?.textContent).toBe("Button 1 Text");
      expect(linkNode?.name).toBe("Lnk1");
      expect(linkNode?.textContent).toBe("Link 1 Text");

      // Container div does NOT have textContent
      expect(divNode?.textContent).toBeUndefined();
    });

    it("label element (interactive tag) can have textContent", () => {
      setHtml(`
        <label aria-label="Terms">
          <input type="checkbox" />
          Accept terms and conditions
        </label>
      `);

      const snapshot = collectDomSnapshot(document);
      const nodes = Object.values(snapshot.idToNode);
      const labelNode = nodes.find((n) => n.tagName === "label");

      // Label is in INTERACTIVE_TAGS, textContent differs from aria-label
      expect(labelNode?.name).toBe("Terms");
      expect(labelNode?.textContent).toBe("Accept terms and conditions");
    });

    it("excludes script content from textContent extraction", () => {
      setHtml(`
        <button aria-label="Action">
          Click Me
          <script>const secret = "hidden";</script>
        </button>
      `);

      const snapshot = collectDomSnapshot(document);
      const nodes = Object.values(snapshot.idToNode);
      const buttonNode = nodes.find((n) => n.tagName === "button");

      // textContent should NOT include script content
      expect(buttonNode?.textContent).toBe("Click Me");
      expect(buttonNode?.textContent).not.toContain("secret");
      expect(buttonNode?.textContent).not.toContain("hidden");
    });

    it("excludes style content from textContent extraction", () => {
      setHtml(`
        <button aria-label="Action">
          Click Me
          <style>.btn { color: red; }</style>
        </button>
      `);

      const snapshot = collectDomSnapshot(document);
      const nodes = Object.values(snapshot.idToNode);
      const buttonNode = nodes.find((n) => n.tagName === "button");

      // textContent should NOT include style content
      expect(buttonNode?.textContent).toBe("Click Me");
      expect(buttonNode?.textContent).not.toContain("color");
      expect(buttonNode?.textContent).not.toContain("red");
    });

    it("excludes noscript and template content from textContent extraction", () => {
      setHtml(`
        <button aria-label="Action">
          Visible Text
          <noscript>No JS fallback</noscript>
          <template><div>Template content</div></template>
        </button>
      `);

      const snapshot = collectDomSnapshot(document);
      const nodes = Object.values(snapshot.idToNode);
      const buttonNode = nodes.find((n) => n.tagName === "button");

      expect(buttonNode?.textContent).toBe("Visible Text");
      expect(buttonNode?.textContent).not.toContain("fallback");
      expect(buttonNode?.textContent).not.toContain("Template");
    });
  });

  describe("StaticText nodes capture all visible text in non-interactive containers", () => {
    it("captures all text in section via StaticText nodes", () => {
      setHtml(`
        <section>
          <h1>Main Title</h1>
          <p>First paragraph content.</p>
          <p>Second paragraph content.</p>
          <span>Some span text</span>
        </section>
      `);

      const snapshot = collectDomSnapshot(document);
      const nodes = Object.values(snapshot.idToNode);

      // Section should NOT have textContent
      const sectionNode = nodes.find((n) => n.tagName === "section");
      expect(sectionNode?.textContent).toBeUndefined();

      // All text should be captured via StaticText nodes
      const staticTextNodes = nodes.filter((n) => n.role === "StaticText");
      const allStaticText = staticTextNodes.map((n) => n.name).join(" ");

      expect(allStaticText).toContain("Main Title");
      expect(allStaticText).toContain("First paragraph content.");
      expect(allStaticText).toContain("Second paragraph content.");
      expect(allStaticText).toContain("Some span text");
    });

    it("captures deeply nested text via StaticText nodes", () => {
      setHtml(`
        <div>
          <div>
            <div>
              <span>Deeply nested text</span>
            </div>
          </div>
        </div>
      `);

      const snapshot = collectDomSnapshot(document);
      const nodes = Object.values(snapshot.idToNode);

      // No div should have textContent
      const divNodes = nodes.filter((n) => n.tagName === "div");
      divNodes.forEach((div) => {
        expect(div.textContent).toBeUndefined();
      });

      // Text should still be captured via StaticText
      const staticTextNodes = nodes.filter((n) => n.role === "StaticText");
      const allStaticText = staticTextNodes.map((n) => n.name).join(" ");
      expect(allStaticText).toContain("Deeply nested text");
    });

    it("captures text in complex layout with mixed interactive and non-interactive elements", () => {
      setHtml(`
        <main>
          <header>
            <h1>Page Title</h1>
            <nav>
              <a href="/home">Home</a>
              <a href="/about">About</a>
            </nav>
          </header>
          <article>
            <p>Article intro text.</p>
            <section>
              <h2>Section Header</h2>
              <p>Section body text.</p>
              <button>Read More</button>
            </section>
          </article>
          <footer>
            <p>Footer text here.</p>
          </footer>
        </main>
      `);

      const snapshot = collectDomSnapshot(document);
      const nodes = Object.values(snapshot.idToNode);

      // Non-interactive containers should NOT have textContent
      const mainNode = nodes.find((n) => n.tagName === "main");
      const headerNode = nodes.find((n) => n.tagName === "header");
      const articleNode = nodes.find((n) => n.tagName === "article");
      const footerNode = nodes.find((n) => n.tagName === "footer");

      expect(mainNode?.textContent).toBeUndefined();
      expect(headerNode?.textContent).toBeUndefined();
      expect(articleNode?.textContent).toBeUndefined();
      expect(footerNode?.textContent).toBeUndefined();

      // All visible text should be captured via StaticText nodes
      const staticTextNodes = nodes.filter((n) => n.role === "StaticText");
      const allStaticText = staticTextNodes.map((n) => n.name).join(" ");

      expect(allStaticText).toContain("Page Title");
      expect(allStaticText).toContain("Article intro text.");
      expect(allStaticText).toContain("Section Header");
      expect(allStaticText).toContain("Section body text.");
      expect(allStaticText).toContain("Footer text here.");

      // Interactive elements (links, buttons) should have their text as name
      const links = nodes.filter((n) => n.tagName === "a");
      expect(links.map((l) => l.name)).toContain("Home");
      expect(links.map((l) => l.name)).toContain("About");

      const button = nodes.find((n) => n.tagName === "button");
      expect(button?.name).toBe("Read More");
    });

    it("formatted snapshot contains all text from non-interactive containers", () => {
      setHtml(`
        <section>
          <h1>Important Heading</h1>
          <p>Critical information that must not be lost.</p>
          <div>
            <span>More details here.</span>
          </div>
        </section>
      `);

      const snapshot = collectDomSnapshot(document);
      const textSnapshot = buildTextSnapshot(snapshot);
      const formatted = formatSnapshot(textSnapshot);

      // Formatted output should contain all text via StaticText entries
      expect(formatted).toContain("Important Heading");
      expect(formatted).toContain(
        "Critical information that must not be lost.",
      );
      expect(formatted).toContain("More details here.");
    });

    it("search can find text in non-interactive containers via StaticText", () => {
      setHtml(`
        <section>
          <p>Unique searchable content XYZ123.</p>
        </section>
      `);

      const snapshot = collectDomSnapshot(document);
      const result = searchAndFormat(snapshot, "XYZ123");

      expect(result).not.toBeNull();
      expect(result).toContain("XYZ123");
      expect(result).not.toContain("No matches found");
    });
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

  it("returns formatted results with matches", () => {
    const snapshot = createMockSnapshot();
    const result = searchAndFormat(snapshot, "Submit");

    expect(result).not.toBeNull();
    expect(result).toContain("Submit");
  });

  it("returns no matches message when query not found", () => {
    const snapshot = createMockSnapshot();
    const result = searchAndFormat(snapshot, "NonExistent");

    expect(result).toContain("No matches found");
  });

  it("returns null for null snapshot", () => {
    const result = searchAndFormat(
      null as unknown as SerializedDomSnapshot,
      "test",
    );

    expect(result).toBeNull();
  });

  it("respects contextLevels parameter", () => {
    const snapshot = createMockSnapshot();
    const result = searchAndFormat(snapshot, "Email", 2);

    expect(result).not.toBeNull();
    expect(result).toContain("Email");
  });

  it("passes search options through", () => {
    const snapshot = createMockSnapshot();
    const result = searchAndFormat(snapshot, "submit", 1, {
      caseSensitive: true,
    });

    expect(result).toContain("No matches found");
  });

  it("marks matched lines with checkmark", () => {
    const snapshot = createMockSnapshot();
    const result = searchAndFormat(snapshot, "Cancel");

    expect(result).not.toBeNull();
    expect(result).toContain("✓");
  });

  it("handles multiple search terms", () => {
    const snapshot = createMockSnapshot();
    const result = searchAndFormat(snapshot, "Submit | Cancel");

    expect(result).not.toBeNull();
    expect(result).toContain("Submit");
    expect(result).toContain("Cancel");
  });
});

describe("cursor: pointer detection", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("includes elements with cursor: pointer style as interactive", () => {
    // Add a style element with cursor: pointer
    document.body.innerHTML = `
      <style>
        .clickable-card { cursor: pointer; }
      </style>
      <div class="clickable-card">
        <span>Card Title</span>
        <span>Card Description</span>
      </div>
    `;

    const snapshot = collectDomSnapshot(document);
    const nodes = Object.values(snapshot.idToNode);

    // The clickable-card div should be captured as a node (not just its text children)
    const cardNode = nodes.find(
      (n) =>
        n.tagName === "div" &&
        n.children &&
        n.children.some(
          (c) => c.role === "StaticText" && c.name === "Card Title",
        ),
    );

    expect(cardNode).toBeDefined();
    expect(cardNode?.id).toBeTruthy();
  });

  it("includes inline cursor: pointer elements", () => {
    document.body.innerHTML = `
      <div style="cursor: pointer;">Clickable Inline</div>
    `;

    const snapshot = collectDomSnapshot(document);
    const nodes = Object.values(snapshot.idToNode);

    // Should capture the div with cursor: pointer
    const clickableDiv = nodes.find(
      (n) =>
        n.tagName === "div" &&
        n.children?.some(
          (c) => c.role === "StaticText" && c.name === "Clickable Inline",
        ),
    );

    expect(clickableDiv).toBeDefined();
  });

  it("assigns node IDs to cursor: pointer elements for automation", () => {
    document.body.innerHTML = `
      <style>.clickable { cursor: pointer; }</style>
      <div class="clickable">Click Me</div>
    `;

    const snapshot = collectDomSnapshot(document);
    const clickableEl = document.querySelector(".clickable");
    const nodeId = clickableEl?.getAttribute("data-aipex-nodeid");

    expect(nodeId).toBeTruthy();
    expect(snapshot.idToNode[nodeId!]).toBeDefined();
  });

  it("captures card component with cursor-pointer (simulating shadcn/ui card)", () => {
    document.body.innerHTML = `
      <style>.cursor-pointer { cursor: pointer; }</style>
      <div data-slot="card" class="cursor-pointer bg-card rounded-xl border shadow-sm">
        <div data-slot="card-header" class="flex flex-row items-center">
          <div class="p-2 rounded-md bg-gray-100">
            <svg class="size-4"></svg>
          </div>
          <div>
            <div data-slot="card-title" class="text-base font-semibold">
              deploy-k8s-workloads
            </div>
            <div class="text-sm text-gray-600 mt-1">
              Usage zam and kapp deploy k8s workloads
            </div>
          </div>
        </div>
      </div>
    `;

    const snapshot = collectDomSnapshot(document);
    const cardEl = document.querySelector('[data-slot="card"]');
    const nodeId = cardEl?.getAttribute("data-aipex-nodeid");

    expect(nodeId).toBeTruthy();
    expect(snapshot.idToNode[nodeId!]).toBeDefined();
    expect(snapshot.idToNode[nodeId!]?.tagName).toBe("div");
  });

  it("searchAndFormat finds text within cursor-pointer card", () => {
    document.body.innerHTML = `
      <style>.cursor-pointer { cursor: pointer; }</style>
      <div class="cursor-pointer">
        <span>deploy-k8s-workloads</span>
        <span>Usage zam and kapp deploy</span>
      </div>
    `;

    const snapshot = collectDomSnapshot(document);
    const result = searchAndFormat(snapshot, "deploy-k8s-workloads");

    expect(result).not.toBeNull();
    expect(result).toContain("deploy-k8s-workloads");
    expect(result).not.toContain("No matches found");
  });

  it("captures nested cursor-pointer elements with separate IDs", () => {
    document.body.innerHTML = `
      <style>
        .outer-card { cursor: pointer; }
        .inner-tag { cursor: pointer; }
      </style>
      <div class="outer-card">
        <h3>Card Title</h3>
        <span class="inner-tag">Clickable Tag</span>
      </div>
    `;

    collectDomSnapshot(document);
    const outerEl = document.querySelector(".outer-card");
    const innerEl = document.querySelector(".inner-tag");

    expect(outerEl?.getAttribute("data-aipex-nodeid")).toBeTruthy();
    expect(innerEl?.getAttribute("data-aipex-nodeid")).toBeTruthy();
    expect(outerEl?.getAttribute("data-aipex-nodeid")).not.toBe(
      innerEl?.getAttribute("data-aipex-nodeid"),
    );
  });

  it("captures ant-tag with cursor-pointer as clickable element", () => {
    document.body.innerHTML = `
      <style>.cursor-pointer { cursor: pointer; }</style>
      <span class="ant-tag cursor-pointer text-blue-500">
        dev/main/va1/meta
      </span>
    `;

    const snapshot = collectDomSnapshot(document);
    const tagEl = document.querySelector(".ant-tag");
    const nodeId = tagEl?.getAttribute("data-aipex-nodeid");

    expect(nodeId).toBeTruthy();
    expect(snapshot.idToNode[nodeId!]).toBeDefined();
    expect(snapshot.idToNode[nodeId!]?.tagName).toBe("span");
  });

  it("does not treat cursor: default elements as interactive", () => {
    document.body.innerHTML = `
      <style>.not-clickable { cursor: default; }</style>
      <div class="not-clickable">Not Clickable</div>
    `;

    const snapshot = collectDomSnapshot(document);
    const nodes = Object.values(snapshot.idToNode);

    // Should not include the div as a separate node since it has cursor: default
    // The text should still be captured as StaticText
    const staticTextNode = nodes.find(
      (n) => n.role === "StaticText" && n.name === "Not Clickable",
    );
    expect(staticTextNode).toBeDefined();
  });

  it("captures table row with cursor-pointer for row click actions", () => {
    document.body.innerHTML = `
      <style>.clickable-row { cursor: pointer; }</style>
      <table>
        <tbody>
          <tr class="clickable-row">
            <td>Row Data 1</td>
            <td>Row Data 2</td>
          </tr>
        </tbody>
      </table>
    `;

    const snapshot = collectDomSnapshot(document);
    const rowEl = document.querySelector(".clickable-row");
    const nodeId = rowEl?.getAttribute("data-aipex-nodeid");

    expect(nodeId).toBeTruthy();
    expect(snapshot.idToNode[nodeId!]).toBeDefined();
    expect(snapshot.idToNode[nodeId!]?.tagName).toBe("tr");
  });

  describe("iframe support", () => {
    it("captures same-origin iframe content", () => {
      document.body.innerHTML = `
        <div>
          <h1>Main Page</h1>
        </div>
      `;

      const iframe = document.createElement("iframe");
      const iframeDoc = document.implementation.createHTMLDocument("iframe");
      iframeDoc.body.innerHTML =
        "<p>Iframe content</p><button>Iframe Button</button>";
      Object.defineProperty(iframe, "contentDocument", {
        get: () => iframeDoc,
        configurable: true,
      });
      Object.defineProperty(iframe, "contentWindow", {
        get: () => ({ document: iframeDoc }),
        configurable: true,
      });
      document.body.appendChild(iframe);

      const snapshot = collectDomSnapshot(document);
      const nodes = Object.values(snapshot.idToNode);
      const allText = nodes.map((n) => n.name || "").join(" ");

      expect(allText).toContain("Iframe content");
      expect(allText).toContain("Iframe Button");
      expect(allText).toContain("Main Page");

      const iframeNode = nodes.find((n) => n.tagName === "iframe");
      expect(iframeNode).toBeDefined();
      expect(iframeNode?.children.length).toBeGreaterThan(0);
    });

    it("captures nested iframes with same-origin content", () => {
      document.body.innerHTML = `
        <div>
          <h1>Outer Page</h1>
        </div>
      `;

      const innerDoc =
        document.implementation.createHTMLDocument("inner-iframe");
      innerDoc.body.innerHTML =
        "<p>Inner iframe</p><button>Inner Button</button>";

      const outerDoc =
        document.implementation.createHTMLDocument("outer-iframe");
      outerDoc.body.innerHTML = "<p>Outer iframe</p>";
      const innerFrame = outerDoc.createElement("iframe");
      Object.defineProperty(innerFrame, "contentDocument", {
        get: () => innerDoc,
        configurable: true,
      });
      Object.defineProperty(innerFrame, "contentWindow", {
        get: () => ({ document: innerDoc }),
        configurable: true,
      });
      outerDoc.body.appendChild(innerFrame);

      const outerFrame = document.createElement("iframe");
      Object.defineProperty(outerFrame, "contentDocument", {
        get: () => outerDoc,
        configurable: true,
      });
      Object.defineProperty(outerFrame, "contentWindow", {
        get: () => ({ document: outerDoc }),
        configurable: true,
      });
      document.body.appendChild(outerFrame);

      const snapshot = collectDomSnapshot(document);
      const nodes = Object.values(snapshot.idToNode);
      const allText = nodes.map((n) => n.name || "").join(" ");

      expect(allText).toContain("Outer Page");
      expect(allText).toContain("Outer iframe");
      expect(allText).toContain("Inner iframe");
      expect(allText).toContain("Inner Button");
    });

    it("skips cross-origin iframe content but preserves iframe node", () => {
      document.body.innerHTML = `
        <div>
          <h1>Main Page</h1>
          <iframe id="cross-origin-iframe" src="https://example.com"></iframe>
        </div>
      `;

      const iframe = document.querySelector(
        "#cross-origin-iframe",
      ) as HTMLIFrameElement;
      if (iframe) {
        Object.defineProperty(iframe, "contentDocument", {
          get: () => {
            throw new DOMException(
              "Blocked a frame with origin",
              "SecurityError",
            );
          },
          configurable: true,
        });
        Object.defineProperty(iframe, "contentWindow", {
          get: () => ({
            document: null,
          }),
          configurable: true,
        });
      }

      const snapshot = collectDomSnapshot(document);
      const nodes = Object.values(snapshot.idToNode);
      const allText = nodes.map((n) => n.name || "").join(" ");

      expect(allText).toContain("Main Page");

      const iframeNode = nodes.find((n) => n.tagName === "iframe");
      expect(iframeNode).toBeDefined();
      expect(iframeNode?.children.length).toBe(0);
    });

    it("captures interactive elements inside same-origin iframe", () => {
      document.body.innerHTML = `
        <div>
          <button>Main Button</button>
        </div>
      `;

      const iframe = document.createElement("iframe");
      const iframeDoc = document.implementation.createHTMLDocument("iframe");
      iframeDoc.body.innerHTML =
        "<input type='text' placeholder='Iframe input'><button>Iframe Button</button>";
      Object.defineProperty(iframe, "contentDocument", {
        get: () => iframeDoc,
        configurable: true,
      });
      Object.defineProperty(iframe, "contentWindow", {
        get: () => ({ document: iframeDoc }),
        configurable: true,
      });
      document.body.appendChild(iframe);

      const snapshot = collectDomSnapshot(document);
      const nodes = Object.values(snapshot.idToNode);

      const iframeInput = nodes.find(
        (n) => n.role === "textbox" && n.placeholder === "Iframe input",
      );
      const iframeButton = nodes.find(
        (n) => n.role === "button" && n.name === "Iframe Button",
      );

      expect(iframeInput).toBeDefined();
      expect(iframeButton).toBeDefined();

      const mainButton = nodes.find(
        (n) => n.role === "button" && n.name === "Main Button",
      );
      expect(mainButton).toBeDefined();
    });

    it("handles iframe with hidden content correctly", () => {
      document.body.innerHTML = `
        <div>
          <h1>Main Page</h1>
        </div>
      `;

      const iframe = document.createElement("iframe");
      const iframeDoc = document.implementation.createHTMLDocument("iframe");
      iframeDoc.body.innerHTML =
        "<div hidden><p>Hidden content</p></div><p>Visible content</p>";
      Object.defineProperty(iframe, "contentDocument", {
        get: () => iframeDoc,
        configurable: true,
      });
      Object.defineProperty(iframe, "contentWindow", {
        get: () => ({ document: iframeDoc }),
        configurable: true,
      });
      document.body.appendChild(iframe);

      const snapshot = collectDomSnapshot(document);
      const nodes = Object.values(snapshot.idToNode);
      const allText = nodes.map((n) => n.name || "").join(" ");

      expect(allText).toContain("Visible content");
      expect(allText).toContain("Main Page");
      expect(allText).not.toContain("Hidden content");
    });
  });
});
