/**
 * Snapshot Manager Puppeteer Integration Tests
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { html, setupPuppeteerTest } from "./__tests__/puppeteer-test-utils";
import { SnapshotManager } from "./snapshot-manager";

async function buildDomSnapshot(
  frame: import("puppeteer").Frame,
  prefix: string = "dom",
) {
  return frame.evaluate((prefixValue) => {
    const NODE_ID_ATTR = "data-aipex-nodeid";
    let counter = 0;
    const ensureId = (element: Element) => {
      const existing = element.getAttribute(NODE_ID_ATTR);
      if (existing) {
        return existing;
      }
      const uid = `${prefixValue}_${counter++}`;
      element.setAttribute(NODE_ID_ATTR, uid);
      return uid;
    };

    const selector = "h1,h2,h3,p,button,input,textarea,a,iframe";
    const idToNode: Record<string, any> = Object.create(null);
    const interactiveTags = new Set(["button", "a", "input", "textarea"]);
    const normalizeText = (text: string) => text.replace(/\s+/g, " ").trim();

    const buildStaticTextNodes = (el: Element) => {
      const tagName = el.tagName.toLowerCase();
      if (interactiveTags.has(tagName)) {
        return [] as any[];
      }
      const nodes: any[] = [];
      const childNodes = Array.from(el.childNodes);
      childNodes.forEach((node, index) => {
        if (node.nodeType !== Node.TEXT_NODE) {
          return;
        }
        const text = normalizeText(node.textContent || "");
        if (!text) {
          return;
        }
        const id = `${ensureId(el)}::text-${index}`;
        const textNode = {
          id,
          role: "StaticText",
          name: text,
          children: [] as any[],
        };
        idToNode[id] = textNode;
        nodes.push(textNode);
      });
      return nodes;
    };

    const buildNode = (el: Element) => {
      const tagName = el.tagName.toLowerCase();
      let role = "generic";
      if (tagName === "button") role = "button";
      if (tagName === "a") role = "link";
      if (tagName === "input" || tagName === "textarea") role = "textbox";
      if (tagName === "iframe") role = "iframe";
      if (tagName === "h1" || tagName === "h2" || tagName === "h3") {
        role = "heading";
      }

      const isInput =
        el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
      const iframeLabel =
        tagName === "iframe"
          ? el.getAttribute("title") ||
            el.getAttribute("aria-label") ||
            el.getAttribute("name") ||
            el.getAttribute("src") ||
            "iframe"
          : undefined;
      const textName = normalizeText(el.textContent || "") || undefined;
      const name =
        iframeLabel ||
        el.getAttribute("aria-label") ||
        (isInput ? el.placeholder || el.value : undefined) ||
        (role === "heading" || role === "button" || role === "link"
          ? textName
          : undefined);

      const node = {
        id: ensureId(el),
        role,
        name,
        children: [] as any[],
        tagName,
        placeholder: isInput ? el.placeholder || undefined : undefined,
      };

      idToNode[node.id] = node;
      return node;
    };

    const buildChildren = (root: Element) => {
      const nodes: any[] = [];
      const elements = Array.from(root.querySelectorAll(selector));
      for (const el of elements) {
        const node = buildNode(el);
        const staticTextNodes = buildStaticTextNodes(el);
        node.children.push(...staticTextNodes);
        if (el instanceof HTMLIFrameElement) {
          let frameDoc: Document | null = null;
          try {
            frameDoc = el.contentDocument || el.contentWindow?.document || null;
          } catch {
            frameDoc = null;
          }
          const iframeRoot = frameDoc?.body || frameDoc?.documentElement;
          if (iframeRoot) {
            node.children.push(...buildChildren(iframeRoot));
          }
        }
        nodes.push(node);
      }
      return nodes;
    };

    const rootEl = document.body || document.documentElement;
    const rootNode = {
      id: rootEl ? ensureId(rootEl) : `${prefixValue}_root`,
      role: "RootWebArea",
      name: document.title || document.URL || "document",
      children: [] as any[],
      tagName: rootEl?.tagName.toLowerCase(),
    };

    idToNode[rootNode.id] = rootNode;
    if (rootEl) {
      rootNode.children = buildChildren(rootEl);
    }

    return {
      root: rootNode,
      idToNode,
      totalNodes: Object.keys(idToNode).length,
      timestamp: Date.now(),
      metadata: {
        title: document.title || "",
        url: document.URL || "",
        collectedAt: new Date().toISOString(),
        options: {},
      },
    };
  }, prefix);
}

describe("SnapshotManager (Puppeteer)", () => {
  let testContext: Awaited<ReturnType<typeof setupPuppeteerTest>>;
  let snapshotManager: SnapshotManager;

  beforeEach(async () => {
    testContext = await setupPuppeteerTest();
    snapshotManager = new SnapshotManager();
  });

  afterEach(async () => {
    snapshotManager.clearAllSnapshots();
    await testContext.cleanup();
  });

  it("should create snapshot with accessibility tree", async () => {
    await testContext.page.setContent(
      html`<main>
        <h1>Test Page</h1>
        <button>Click me</button>
        <input type="text" placeholder="Enter text" />
      </main>`,
    );

    await testContext.page.waitForSelector("button");

    const snapshot = await snapshotManager.createSnapshot(
      testContext.tabId,
      false,
    );

    expect(snapshot).toBeDefined();
    expect(snapshot.root).toBeDefined();
    expect(snapshot.idToNode.size).toBeGreaterThan(0);

    const buttonNode = Array.from(snapshot.idToNode.values()).find(
      (node) => node.role === "button" && node.name === "Click me",
    );
    expect(buttonNode).toBeDefined();
  });

  it("should inject data-aipex-nodeid attributes to page elements", async () => {
    await testContext.page.setContent(
      html`<main>
        <button id="test-btn">Test Button</button>
      </main>`,
    );

    await testContext.page.waitForSelector("#test-btn");

    const snapshot = await snapshotManager.createSnapshot(
      testContext.tabId,
      false,
    );

    expect(snapshot).toBeDefined();

    const buttonNode = Array.from(snapshot.idToNode.values()).find(
      (node) => node.role === "button" && node.name === "Test Button",
    );
    expect(buttonNode).toBeDefined();
    expect(buttonNode?.id).toBeDefined();

    const nodeIdInPage = await testContext.page.evaluate((_nodeId) => {
      const btn = document.querySelector("#test-btn");
      return btn?.getAttribute("data-aipex-nodeid");
    }, buttonNode?.id);

    expect(nodeIdInPage).toBe(buttonNode?.id);
  });

  it("should format snapshot to text", async () => {
    await testContext.page.setContent(
      html`<main>
        <h1>Title</h1>
        <button>Button</button>
      </main>`,
    );

    const snapshot = await snapshotManager.createSnapshot(
      testContext.tabId,
      false,
    );

    const formatted = snapshotManager.formatSnapshot(snapshot);

    expect(formatted).toContain("Title");
    expect(formatted).toContain("Button");
  });

  it("should search snapshot and format results", async () => {
    await testContext.page.setContent(
      html`<main>
        <h1>Search Test</h1>
        <button>Click Me</button>
        <input type="text" placeholder="Search input" />
      </main>`,
    );

    const _snapshot = await snapshotManager.createSnapshot(
      testContext.tabId,
      false,
    );

    const searchResult = await snapshotManager.searchAndFormat(
      testContext.tabId,
      "Click Me",
    );

    expect(searchResult).toBeDefined();
    expect(searchResult).toContain("Click Me");
    expect(searchResult).toContain("✓");
  });

  it("should search snapshot with dom strategy", async () => {
    await testContext.page.setContent(
      html`<main>
        <h1>Dom Snapshot</h1>
        <p>Searchable text</p>
        <button>Action</button>
      </main>`,
    );

    await testContext.page.waitForSelector("button");

    (globalThis as any).chrome.tabs = {
      sendMessage: async (
        _tabId: number,
        message: { request?: string },
      ): Promise<{ success: boolean; data?: unknown; error?: string }> => {
        if (message?.request !== "collect-dom-snapshot") {
          return { success: false, error: "Unsupported request" };
        }
        const snapshot = await buildDomSnapshot(
          testContext.page.mainFrame(),
          "main",
        );
        return { success: true, data: snapshot };
      },
    };

    const searchResult = await snapshotManager.searchAndFormat(
      testContext.tabId,
      "Searchable text",
      1,
      { snapshotStrategy: "dom" },
    );

    expect(searchResult).toBeDefined();
    expect(searchResult).toContain("Searchable text");
    expect(searchResult).toContain("✓");
  });

  it("should handle search with multiple terms", async () => {
    await testContext.page.setContent(
      html`<main>
        <h1>First Title</h1>
        <h2>Second Title</h2>
        <button>Action</button>
      </main>`,
    );

    await snapshotManager.createSnapshot(testContext.tabId, false);

    const searchResult = await snapshotManager.searchAndFormat(
      testContext.tabId,
      "First Title|Second Title",
    );

    expect(searchResult).toBeDefined();
    expect(searchResult).toContain("First Title");
    expect(searchResult).toContain("Second Title");
  });

  it("should return null when searching non-existent snapshot", async () => {
    const result = await snapshotManager.searchAndFormat(999, "test");
    expect(result).toBeNull();
  });

  it("should handle iframe content in snapshot", async () => {
    await testContext.page.setContent(
      html`<h1>Top level</h1>
        <iframe srcdoc="<p>Iframe content</p>"></iframe>`,
    );

    await testContext.page.waitForSelector("iframe");
    await new Promise((resolve) => setTimeout(resolve, 500));

    const snapshot = await snapshotManager.createSnapshot(
      testContext.tabId,
      true,
    );

    expect(snapshot).toBeDefined();

    const iframeTextNode = Array.from(snapshot.idToNode.values()).find(
      (node) => node.name === "Iframe content",
    );

    expect(iframeTextNode).toBeDefined();
  });

  it("should get snapshot by tabId", async () => {
    await testContext.page.setContent(html`<h1>Test</h1>`);

    await snapshotManager.createSnapshot(testContext.tabId, false);

    const snapshot = snapshotManager.getSnapshot(testContext.tabId);
    expect(snapshot).toBeDefined();
    expect(snapshot?.tabId).toBe(testContext.tabId);
  });

  it("should get node by uid", async () => {
    await testContext.page.setContent(
      html`<button id="test-btn">Test</button>`,
    );

    const snapshot = await snapshotManager.createSnapshot(
      testContext.tabId,
      false,
    );

    const buttonNode = Array.from(snapshot.idToNode.values()).find(
      (node) => node.role === "button",
    );

    expect(buttonNode).toBeDefined();

    const retrievedNode = snapshotManager.getNodeByUid(
      testContext.tabId,
      buttonNode!.id,
    );

    expect(retrievedNode).toBeDefined();
    expect(retrievedNode?.id).toBe(buttonNode!.id);
  });

  it("should validate uid", async () => {
    await testContext.page.setContent(html`<h1>Test</h1>`);

    const snapshot = await snapshotManager.createSnapshot(
      testContext.tabId,
      false,
    );

    const validUid = snapshot.root.id;
    const invalidUid = "invalid-uid";

    expect(snapshotManager.isValidUid(testContext.tabId, validUid)).toBe(true);
    expect(snapshotManager.isValidUid(testContext.tabId, invalidUid)).toBe(
      false,
    );
  });
});
