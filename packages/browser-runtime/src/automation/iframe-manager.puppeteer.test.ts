/**
 * Iframe Manager Puppeteer Integration Tests
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { html, setupPuppeteerTest } from "./__tests__/puppeteer-test-utils";
import { CdpCommander } from "./cdp-commander";
import { IframeManager } from "./iframe-manager";
import type { AccessibilityTree } from "./types";

const complexFixtureUrl = new URL(
  "./__tests__/test-iframe.html",
  import.meta.url,
);
const iframeReadyTimeoutMs = 15000;

async function loadFixture(
  page: import("puppeteer").Page,
  fixtureUrl: URL,
): Promise<void> {
  const filePath = fileURLToPath(fixtureUrl);
  const htmlContent = await readFile(filePath, "utf-8");
  await page.setContent(htmlContent, { waitUntil: "domcontentloaded" });
}

async function waitForIframeReady(
  page: import("puppeteer").Page,
  selector: string,
): Promise<import("puppeteer").Frame> {
  const iframeHandle = await page.waitForSelector(selector, {
    timeout: iframeReadyTimeoutMs,
  });
  const frame = await iframeHandle?.contentFrame();
  if (!frame) {
    throw new Error(`Failed to resolve iframe for selector: ${selector}`);
  }
  await frame.waitForFunction(
    () => {
      const body = document.body;
      return !!body && (body.textContent || "").trim().length > 0;
    },
    { timeout: iframeReadyTimeoutMs },
  );
  return frame;
}

async function waitForNestedIframeReady(
  parentFrame: import("puppeteer").Frame,
  selector: string,
): Promise<import("puppeteer").Frame> {
  const iframeHandle = await parentFrame.waitForSelector(selector, {
    timeout: iframeReadyTimeoutMs,
  });
  const frame = await iframeHandle?.contentFrame();
  if (!frame) {
    throw new Error(
      `Failed to resolve nested iframe for selector: ${selector}`,
    );
  }
  await frame.waitForFunction(
    () => {
      const body = document.body;
      return !!body && (body.textContent || "").trim().length > 0;
    },
    { timeout: iframeReadyTimeoutMs },
  );
  return frame;
}

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

    await testContext.page.waitForSelector("iframe", {
      timeout: 10000,
      visible: true,
    });

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
    await loadFixture(testContext.page, complexFixtureUrl);
    const iframe2 = await waitForIframeReady(testContext.page, "#iframe2");
    await Promise.all([
      waitForIframeReady(testContext.page, "#iframe1"),
      waitForIframeReady(testContext.page, "#iframe3"),
      waitForNestedIframeReady(iframe2, "iframe"),
    ]);

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
