/**
 * SmartLocator Puppeteer Integration Tests
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { html, setupPuppeteerTest } from "./__tests__/puppeteer-test-utils";
import { SmartLocator } from "./smart-locator";
import { SnapshotManager } from "./snapshot-manager";

const complexFixtureUrl = new URL(
  "./__tests__/test-iframe.html",
  import.meta.url,
);

describe("SmartLocator (Puppeteer)", () => {
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

  async function findFrameByText(
    text: string,
  ): Promise<import("puppeteer").Frame> {
    const frames = testContext.page.frames();
    for (const frame of frames) {
      const content = await frame.evaluate(
        () => document.body?.textContent || "",
      );
      if (content.includes(text)) {
        return frame;
      }
    }
    throw new Error(`Frame with text "${text}" not found`);
  }

  it("should click element inside iframe and compute top-level bounding box", async () => {
    const iframeContent = html`
      <style>
        html,
        body {
          margin: 0;
          padding: 0;
        }
        #btn {
          position: absolute;
          left: 10px;
          top: 20px;
          width: 120px;
          height: 40px;
          padding: 0;
          border: 0;
        }
      </style>
      <button id="btn">Iframe Button</button>
      <script>
        window.__clicked = false;
        document.getElementById("btn").addEventListener("click", () => {
          window.__clicked = true;
        });
      </script>
    `;

    await testContext.page.setContent(html`
      <style>
        html,
        body {
          margin: 0;
          padding: 0;
        }
        #frame {
          position: absolute;
          left: 100px;
          top: 150px;
          width: 300px;
          height: 200px;
          border: 0;
        }
      </style>
      <iframe id="frame" srcdoc='${iframeContent}'></iframe>
    `);

    await testContext.page.waitForSelector("#frame");
    const frame = testContext.page
      .frames()
      .find((item) => item.parentFrame() === testContext.page.mainFrame());
    expect(frame).toBeDefined();
    await frame!.waitForSelector("#btn");

    const snapshot = await snapshotManager.createSnapshot(
      testContext.tabId,
      true,
    );
    const buttonNode = Array.from(snapshot.idToNode.values()).find(
      (node) => node.role === "button" && node.name === "Iframe Button",
    );

    expect(buttonNode).toBeDefined();
    expect(buttonNode?.backendDOMNodeId).toBeDefined();
    expect(buttonNode?.frameId).toBeDefined();

    const locator = new SmartLocator(
      testContext.tabId,
      buttonNode!,
      buttonNode!.backendDOMNodeId!,
    );

    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeCloseTo(110, 0);
    expect(box!.y).toBeCloseTo(170, 0);
    expect(box!.width).toBeGreaterThan(80);
    expect(box!.height).toBeGreaterThan(20);

    await locator.click();

    const clicked = await frame!.evaluate(() => (window as any).__clicked);
    expect(clicked).toBe(true);
  });

  it("should click elements across fixture iframes", async () => {
    await testContext.page.goto(complexFixtureUrl.toString(), {
      waitUntil: "load",
    });
    await testContext.page.waitForSelector("#iframe3");
    await new Promise((resolve) => setTimeout(resolve, 500));

    const iframe1 = await findFrameByText("Iframe 1 Content");
    await iframe1.evaluate(() => {
      (window as any).__clicked = false;
      const button = document.querySelector("button");
      if (button) {
        button.addEventListener("click", () => {
          (window as any).__clicked = true;
        });
      }
    });

    const nestedFrame = await findFrameByText("Nested Iframe Content");
    await nestedFrame.evaluate(() => {
      (window as any).__clicked = false;
      const button = document.querySelector("button");
      if (button) {
        button.addEventListener("click", () => {
          (window as any).__clicked = true;
        });
      }
    });

    const iframe3 = await findFrameByText("Complex Iframe Content");
    await iframe3.evaluate(() => {
      (window as any).__clicked = false;
      const button = document.querySelector("button[type='submit']");
      if (button) {
        button.addEventListener("click", (event) => {
          event.preventDefault();
          (window as any).__clicked = true;
        });
      }
    });

    const snapshot = await snapshotManager.createSnapshot(
      testContext.tabId,
      true,
    );

    const iframe1Button = Array.from(snapshot.idToNode.values()).find(
      (node) => node.role === "button" && node.name === "Iframe 1 Button",
    );
    const nestedButton = Array.from(snapshot.idToNode.values()).find(
      (node) => node.role === "button" && node.name === "Nested Button",
    );
    const submitButton = Array.from(snapshot.idToNode.values()).find(
      (node) => node.role === "button" && node.name === "Submit",
    );

    expect(iframe1Button?.backendDOMNodeId).toBeDefined();
    expect(nestedButton?.backendDOMNodeId).toBeDefined();
    expect(submitButton?.backendDOMNodeId).toBeDefined();

    const iframe1Locator = new SmartLocator(
      testContext.tabId,
      iframe1Button!,
      iframe1Button!.backendDOMNodeId!,
    );
    const nestedLocator = new SmartLocator(
      testContext.tabId,
      nestedButton!,
      nestedButton!.backendDOMNodeId!,
    );
    const submitLocator = new SmartLocator(
      testContext.tabId,
      submitButton!,
      submitButton!.backendDOMNodeId!,
    );

    await iframe1Locator.click();
    await nestedLocator.click();
    await submitLocator.click();

    const iframe1Clicked = await iframe1.evaluate(
      () => (window as any).__clicked,
    );
    const nestedClicked = await nestedFrame.evaluate(
      () => (window as any).__clicked,
    );
    const iframe3Clicked = await iframe3.evaluate(
      () => (window as any).__clicked,
    );

    expect(iframe1Clicked).toBe(true);
    expect(nestedClicked).toBe(true);
    expect(iframe3Clicked).toBe(true);
  });

  it("should fill inputs inside fixture iframes", async () => {
    await testContext.page.goto(complexFixtureUrl.toString(), {
      waitUntil: "load",
    });
    await testContext.page.waitForSelector("#iframe3");
    await new Promise((resolve) => setTimeout(resolve, 500));

    const iframe1 = await findFrameByText("Iframe 1 Content");
    const iframe3 = await findFrameByText("Complex Iframe Content");

    const snapshot = await snapshotManager.createSnapshot(
      testContext.tabId,
      true,
    );

    const iframe1FrameId = Array.from(snapshot.idToNode.values()).find(
      (node) => node.role === "heading" && node.name === "Iframe 1 Content",
    )?.frameId;
    const iframe3FrameId = Array.from(snapshot.idToNode.values()).find(
      (node) =>
        node.role === "heading" && node.name === "Complex Iframe Content",
    )?.frameId;

    expect(iframe1FrameId).toBeDefined();
    expect(iframe3FrameId).toBeDefined();

    const iframe1Input = Array.from(snapshot.idToNode.values()).find(
      (node) => node.role === "textbox" && node.frameId === iframe1FrameId,
    );
    const iframe3Inputs = Array.from(snapshot.idToNode.values()).filter(
      (node) => node.role === "textbox" && node.frameId === iframe3FrameId,
    );
    const iframe3Input =
      iframe3Inputs.find((node) =>
        (node.name || "").toLowerCase().includes("email"),
      ) ?? iframe3Inputs[0];

    expect(iframe1Input?.backendDOMNodeId).toBeDefined();
    expect(iframe3Input?.backendDOMNodeId).toBeDefined();

    const iframe1Locator = new SmartLocator(
      testContext.tabId,
      iframe1Input!,
      iframe1Input!.backendDOMNodeId!,
    );
    const iframe3Locator = new SmartLocator(
      testContext.tabId,
      iframe3Input!,
      iframe3Input!.backendDOMNodeId!,
    );

    await iframe1Locator.fill("iframe-1-value");
    await iframe3Locator.fill("iframe-3-email");

    const iframe1Value = await iframe1.evaluate(() => {
      const input = document.querySelector(
        "input[placeholder='Iframe 1 input']",
      );
      return (input as HTMLInputElement | null)?.value;
    });
    const iframe3Value = await iframe3.evaluate(() => {
      const input = document.querySelector("input[name='email']");
      return (input as HTMLInputElement | null)?.value;
    });

    expect(iframe1Value).toBe("iframe-1-value");
    expect(iframe3Value).toBe("iframe-3-email");
  }, 15000);
});
