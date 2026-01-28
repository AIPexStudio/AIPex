/**
 * Iframe Manager Puppeteer Integration Tests
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { html, setupPuppeteerTest } from "./__tests__/puppeteer-test-utils";
import { CdpCommander } from "./cdp-commander";
import { IframeManager } from "./iframe-manager";
import type { AccessibilityTree } from "./types";

const complexFixtureUrl = new URL(
  "./__tests__/test-iframe.html",
  import.meta.url,
);
console.log("[DEBUG] complexFixtureUrl:", complexFixtureUrl.toString());

describe("IframeManager (Puppeteer)", () => {
  let testContext: Awaited<ReturnType<typeof setupPuppeteerTest>>;
  let iframeManager: IframeManager;

  beforeEach(async () => {
    testContext = await setupPuppeteerTest();
    iframeManager = new IframeManager();
  });

  afterEach(async () => {
    await testContext.cleanup();
  });

  it("should populate iframe content in accessibility tree", async () => {
    await testContext.page.setContent(
      html`<h1>Top level</h1>
        <iframe srcdoc="<p>Hello iframe</p>"></iframe>`,
    );

    await testContext.page.waitForSelector("iframe", { timeout: 10000, visible: true });

    const cdpCommander = new CdpCommander(testContext.tabId);

    await cdpCommander.sendCommand("Accessibility.enable", {});
    const mainTree = await cdpCommander.sendCommand<AccessibilityTree>(
      "Accessibility.getFullAXTree",
      {},
    );

    expect(mainTree).toBeDefined();
    expect(mainTree.nodes).toBeDefined();
    expect(mainTree.nodes.length).toBeGreaterThan(0);

    const treeWithIframes = await iframeManager.populateIframes(
      cdpCommander,
      mainTree,
    );

    const iframeTextNodes = treeWithIframes.nodes.filter(
      (node) =>
        node.role?.value === "StaticText" &&
        node.name?.value === "Hello iframe",
    );

    expect(iframeTextNodes.length).toBeGreaterThan(0);
  });

  it("should handle nested iframes", async () => {
    await testContext.page.setContent(
      html`<h1>Top level</h1>
        <iframe
          srcdoc="<p>Outer iframe</p><iframe srcdoc='<p>Inner iframe</p>'></iframe>"
        ></iframe>`,
    );

    await testContext.page.waitForSelector("iframe");
    await new Promise((resolve) => setTimeout(resolve, 500));

    const cdpCommander = new CdpCommander(testContext.tabId);

    await cdpCommander.sendCommand("Accessibility.enable", {});
    const mainTree = await cdpCommander.sendCommand<AccessibilityTree>(
      "Accessibility.getFullAXTree",
      {},
    );

    const treeWithIframes = await iframeManager.populateIframes(
      cdpCommander,
      mainTree,
    );

    const outerTextNodes = treeWithIframes.nodes.filter(
      (node) =>
        node.role?.value === "StaticText" &&
        node.name?.value === "Outer iframe",
    );
    const innerTextNodes = treeWithIframes.nodes.filter(
      (node) =>
        node.role?.value === "StaticText" &&
        node.name?.value === "Inner iframe",
    );

    expect(outerTextNodes.length).toBeGreaterThan(0);
    expect(innerTextNodes.length).toBeGreaterThan(0);
  });

  it("should handle pages without iframes", async () => {
    await testContext.page.setContent(html`<h1>No iframes here</h1>`);

    const cdpCommander = new CdpCommander(testContext.tabId);

    await cdpCommander.sendCommand("Accessibility.enable", {});
    const mainTree = await cdpCommander.sendCommand<AccessibilityTree>(
      "Accessibility.getFullAXTree",
      {},
    );

    const treeWithIframes = await iframeManager.populateIframes(
      cdpCommander,
      mainTree,
    );

    expect(treeWithIframes.nodes.length).toBe(mainTree.nodes.length);
  });

  it("should prefix iframe node IDs to avoid conflicts", async () => {
    await testContext.page.setContent(
      html`<h1>Top level</h1>
        <iframe srcdoc="<p>Iframe content</p>"></iframe>`,
    );

    const cdpCommander = new CdpCommander(testContext.tabId);

    await cdpCommander.sendCommand("Accessibility.enable", {});
    const mainTree = await cdpCommander.sendCommand<AccessibilityTree>(
      "Accessibility.getFullAXTree",
      {},
    );

    const treeWithIframes = await iframeManager.populateIframes(
      cdpCommander,
      mainTree,
    );

    const nodeIds = new Set(treeWithIframes.nodes.map((n) => n.nodeId));
    expect(nodeIds.size).toBe(treeWithIframes.nodes.length);

    const iframeNodes = treeWithIframes.nodes.filter((node) =>
      node.nodeId.includes(":"),
    );
    expect(iframeNodes.length).toBeGreaterThan(0);
  });

  it("should populate iframe content from complex fixture", async () => {
    console.log(`[${new Date().toISOString()}] Before page.goto complexFixtureUrl`);
    await testContext.page.goto(complexFixtureUrl.toString(), {
      waitUntil: "load",
    });
    console.log(`[${new Date().toISOString()}] After page.goto, before waitForSelector`);
    await testContext.page.waitForSelector("#iframe3");
    console.log(`[${new Date().toISOString()}] After waitForSelector`);
    await new Promise((resolve) => setTimeout(resolve, 500));

    const cdpCommander = new CdpCommander(testContext.tabId);

    await cdpCommander.sendCommand("Accessibility.enable", {});
    const mainTree = await cdpCommander.sendCommand<AccessibilityTree>(
      "Accessibility.getFullAXTree",
      {},
    );

    const treeWithIframes = await iframeManager.populateIframes(
      cdpCommander,
      mainTree,
    );

    const expectedNames = [
      "Iframe 1 Content",
      "Iframe 2 Content",
      "Nested Iframe Content",
      "Complex Iframe Content",
      "Nested Button",
    ];

    for (const name of expectedNames) {
      const exists = treeWithIframes.nodes.some(
        (node) => node.name?.value === name,
      );
      expect(exists).toBe(true);
    }
  });
});
