/**
 * Snapshot Manager Puppeteer Integration Tests
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { html, setupPuppeteerTest } from "./__tests__/puppeteer-test-utils";
import { SnapshotManager } from "./snapshot-manager";

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
