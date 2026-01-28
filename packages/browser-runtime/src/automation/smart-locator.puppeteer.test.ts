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
console.log("[DEBUG] complexFixtureUrl:", complexFixtureUrl.toString());

const domSnapshotFixtureUrl = new URL(
  "./__tests__/test-dom-snapshot.html",
  import.meta.url,
);
console.log("[DEBUG] domSnapshotFixtureUrl:", domSnapshotFixtureUrl.toString());

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

  it("should click iframe element using dom snapshot", async () => {
    console.log(`[${new Date().toISOString()}] Before page.goto domSnapshotFixtureUrl`);
    await testContext.page.goto(domSnapshotFixtureUrl.toString(), {
      waitUntil: "load",
    });
    console.log(`[${new Date().toISOString()}] After page.goto, before waitForSelector`);
    await testContext.page.waitForSelector("#iframe3");
    console.log(`[${new Date().toISOString()}] After waitForSelector`);
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

    const iframe2 = await findFrameByText("Iframe 2 Content");
    await iframe2.evaluate(() => {
      (window as any).__nestedClicked = false;
      const buttons = document.querySelectorAll("button");
      const nestedButton = Array.from(buttons).find(
        (b) => b.textContent === "Nested Button",
      );
      if (nestedButton) {
        nestedButton.addEventListener("click", () => {
          (window as any).__nestedClicked = true;
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

    const snapshot = await snapshotManager.createSnapshot(
      testContext.tabId,
      true,
      "dom",
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

    expect(iframe1Button).toBeDefined();
    expect(nestedButton).toBeDefined();
    expect(submitButton).toBeDefined();

    const iframe1Handle = snapshotManager.getElementHandle(
      testContext.tabId,
      iframe1Button!.id,
    );
    const nestedHandle = snapshotManager.getElementHandle(
      testContext.tabId,
      nestedButton!.id,
    );
    const submitHandle = snapshotManager.getElementHandle(
      testContext.tabId,
      submitButton!.id,
    );

    expect(iframe1Handle).toBeDefined();
    expect(nestedHandle).toBeDefined();
    expect(submitHandle).toBeDefined();

    await iframe1Handle!.asLocator().click();
    await nestedHandle!.asLocator().click();
    await submitHandle!.asLocator().click();

    iframe1Handle?.dispose();
    nestedHandle?.dispose();
    submitHandle?.dispose();

    const iframe1Clicked = await iframe1.evaluate(
      () => (window as any).__clicked,
    );
    const nestedClicked = await iframe2.evaluate(
      () => (window as any).__nestedClicked,
    );
    const iframe3Clicked = await iframe3.evaluate(
      () => (window as any).__clicked,
    );

    expect(iframe1Clicked).toBe(true);
    expect(nestedClicked).toBe(true);
    expect(iframe3Clicked).toBe(true);
  });

  it("should verify dom snapshot cannot access cross-origin iframe content without frame collection", async () => {
    console.log(`[${new Date().toISOString()}] Before page.goto complexFixtureUrl`);
    await testContext.page.goto(complexFixtureUrl.toString(), {
      waitUntil: "load",
    });
    console.log(`[${new Date().toISOString()}] After page.goto, before waitForSelector`);
    await testContext.page.waitForSelector("#iframe3");
    console.log(`[${new Date().toISOString()}] After waitForSelector`);
    await new Promise((resolve) => setTimeout(resolve, 500));

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

    const snapshot = await snapshotManager.createSnapshot(
      testContext.tabId,
      true,
      "dom",
    );

    const mainPageButton = Array.from(snapshot.idToNode.values()).find(
      (node) => node.role === "button" && node.name === "Main Page Button",
    );
    expect(mainPageButton).toBeDefined();

    const iframeNodes = Array.from(snapshot.idToNode.values()).filter(
      (node) => node.role === "iframe",
    );
    expect(iframeNodes.length).toBe(3);

    const iframe1Button = Array.from(snapshot.idToNode.values()).find(
      (node) => node.role === "button" && node.name === "Iframe 1 Button",
    );
    const nestedButton = Array.from(snapshot.idToNode.values()).find(
      (node) => node.role === "button" && node.name === "Nested Button",
    );
    const submitButton = Array.from(snapshot.idToNode.values()).find(
      (node) => node.role === "button" && node.name === "Submit",
    );

    expect(iframe1Button).toBeUndefined();
    expect(nestedButton).toBeUndefined();
    expect(submitButton).toBeUndefined();

    for (const iframeNode of iframeNodes) {
      expect(iframeNode.children?.length || 0).toBe(0);
    }
  });

  it("should collect cross-origin iframe elements using dom snapshot with frame collection", async () => {
    console.log(`[${new Date().toISOString()}] Before page.goto domSnapshotFixtureUrl`);
    await testContext.page.goto(domSnapshotFixtureUrl.toString(), {
      waitUntil: "load",
    });
    console.log(`[${new Date().toISOString()}] After page.goto, before waitForSelector`);
    await testContext.page.waitForSelector("#iframe3");
    console.log(`[${new Date().toISOString()}] After waitForSelector`);
    await new Promise((resolve) => setTimeout(resolve, 500));

    const allFrames = testContext.page.frames();
    const frameIdMap = new Map<import("puppeteer").Frame, number>();
    allFrames.forEach((frame, index) => {
      frameIdMap.set(frame, index);
    });

    (globalThis as any).chrome.tabs = {
      sendMessage: async (
        _tabId: number,
        message: { request?: string },
        options?: { frameId?: number },
      ): Promise<{ success: boolean; data?: unknown; error?: string }> => {
        if (message?.request !== "collect-dom-snapshot") {
          return { success: false, error: "Unsupported request" };
        }

        const targetFrameId = options?.frameId ?? 0;
        const targetFrame =
          allFrames.find((f) => frameIdMap.get(f) === targetFrameId) ||
          testContext.page.mainFrame();

        const prefix = targetFrameId === 0 ? "main" : `frame_${targetFrameId}`;
        const snapshot = await buildDomSnapshot(targetFrame, prefix);
        return { success: true, data: snapshot };
      },
    };

    (globalThis as any).chrome.webNavigation = {
      getAllFrames: (
        _details: { tabId: number },
        callback: (
          frames: Array<{
            frameId: number;
            url: string;
            parentFrameId: number;
          }>,
        ) => void,
      ) => {
        const frames = allFrames.map((frame, index) => ({
          frameId: index,
          url: frame.url() || "about:blank",
          parentFrameId: frame.parentFrame()
            ? (frameIdMap.get(frame.parentFrame()!) ?? -1)
            : -1,
        }));
        callback(frames);
      },
    };

    (globalThis as any).chrome.scripting = {
      executeScript: async () => {
        const iframes = await testContext.page.$$eval("iframe", (frames) =>
          frames.map((f) => ({
            uid: f.getAttribute("data-aipex-nodeid") || "",
            src: f.getAttribute("src") || "",
            resolvedSrc: f.src || "",
          })),
        );
        return [{ result: iframes }];
      },
    };

    const snapshot = await snapshotManager.createSnapshot(
      testContext.tabId,
      true,
      "dom",
    );

    const mainPageButton = Array.from(snapshot.idToNode.values()).find(
      (node) => node.role === "button" && node.name === "Main Page Button",
    );
    expect(mainPageButton).toBeDefined();

    const iframe1Button = Array.from(snapshot.idToNode.values()).find(
      (node) => node.role === "button" && node.name === "Iframe 1 Button",
    );
    const nestedButton = Array.from(snapshot.idToNode.values()).find(
      (node) => node.role === "button" && node.name === "Nested Button",
    );
    const submitButton = Array.from(snapshot.idToNode.values()).find(
      (node) => node.role === "button" && node.name === "Submit",
    );

    expect(iframe1Button).toBeDefined();
    expect(nestedButton).toBeDefined();
    expect(submitButton).toBeDefined();

    const iframe1Handle = snapshotManager.getElementHandle(
      testContext.tabId,
      iframe1Button!.id,
    );
    const nestedHandle = snapshotManager.getElementHandle(
      testContext.tabId,
      nestedButton!.id,
    );
    const submitHandle = snapshotManager.getElementHandle(
      testContext.tabId,
      submitButton!.id,
    );

    expect(iframe1Handle).toBeDefined();
    expect(nestedHandle).toBeDefined();
    expect(submitHandle).toBeDefined();

    iframe1Handle?.dispose();
    nestedHandle?.dispose();
    submitHandle?.dispose();
  });

  it("should click elements across fixture iframes", async () => {
    console.log(`[${new Date().toISOString()}] Before page.goto complexFixtureUrl`);
    await testContext.page.goto(complexFixtureUrl.toString(), {
      waitUntil: "load",
    });
    console.log(`[${new Date().toISOString()}] After page.goto, before waitForSelector`);
    await testContext.page.waitForSelector("#iframe3");
    console.log(`[${new Date().toISOString()}] After waitForSelector`);
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
    console.log(`[${new Date().toISOString()}] Before page.goto complexFixtureUrl`);
    await testContext.page.goto(complexFixtureUrl.toString(), {
      waitUntil: "load",
    });
    console.log(`[${new Date().toISOString()}] After page.goto, before waitForSelector`);
    await testContext.page.waitForSelector("#iframe3");
    console.log(`[${new Date().toISOString()}] After waitForSelector`);
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
