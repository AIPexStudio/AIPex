/**
 * Puppeteer Test Utilities
 *
 * Provides Chrome debugger API shim for testing CDP-based automation code
 * without requiring a real Chrome extension environment
 */

import type { Browser, Page } from "puppeteer";
import puppeteer from "puppeteer";

interface ChromeDebuggerShim {
  sendCommand: (
    target: { tabId: number },
    method: string,
    params?: Record<string, unknown>,
    callback?: (result: unknown) => void,
  ) => void;
  attach: (
    target: { tabId: number },
    requiredVersion: string,
    callback?: () => void,
  ) => void;
  detach: (target: { tabId: number }, callback?: () => void) => void;
  onDetach: {
    addListener: (callback: (source: { tabId?: number }, reason: string) => void) => void;
  };
}

interface TestContext {
  browser: Browser;
  page: Page;
  tabId: number;
  chrome: {
    debugger: ChromeDebuggerShim;
    runtime: {
      lastError: { message: string } | undefined;
    };
  };
  cleanup: () => Promise<void>;
}

const tabIdToCdpSession = new Map<number, any>();
const isCI = process.env.CI === "true";

/**
 * Create a Chrome debugger shim that forwards commands to Puppeteer CDP session
 */
async function createChromeDebuggerShim(
  page: Page,
  tabId: number,
): Promise<ChromeDebuggerShim> {
  const cdpSession = await page.target().createCDPSession();
  tabIdToCdpSession.set(tabId, cdpSession);

  const sendCommand = (
    target: { tabId: number },
    method: string,
    params: Record<string, unknown> = {},
    callback?: (result: unknown) => void,
  ) => {
    const session = tabIdToCdpSession.get(target.tabId);
    if (!session) {
      if (callback) {
        setTimeout(() => {
          (globalThis.chrome as any).runtime.lastError = {
            message: `No CDP session found for tabId ${target.tabId}`,
          };
          callback(undefined);
          (globalThis.chrome as any).runtime.lastError = undefined;
        }, 0);
      }
      return;
    }

    session
      .send(method, params)
      .then((result: unknown) => {
        if (callback) {
          setTimeout(() => {
            (globalThis.chrome as any).runtime.lastError = undefined;
            callback(result);
          }, 0);
        }
      })
      .catch((error: Error) => {
        if (callback) {
          setTimeout(() => {
            (globalThis.chrome as any).runtime.lastError = {
              message: error.message || String(error),
            };
            callback(undefined);
            (globalThis.chrome as any).runtime.lastError = undefined;
          }, 0);
        }
      });
  };

  const attachedTabs = new Set<number>();

  const attach = (
    target: { tabId: number },
    requiredVersion: string,
    callback?: () => void,
  ) => {
    const session = tabIdToCdpSession.get(target.tabId);
    if (!session) {
      if (callback) {
        setTimeout(() => {
          (globalThis.chrome as any).runtime.lastError = {
            message: `No CDP session found for tabId ${target.tabId}`,
          };
          callback();
          (globalThis.chrome as any).runtime.lastError = undefined;
        }, 0);
      }
      return;
    }

    attachedTabs.add(target.tabId);
    if (callback) {
      setTimeout(() => {
        (globalThis.chrome as any).runtime.lastError = undefined;
        callback();
      }, 0);
    }
  };

  const detach = (
    target: { tabId: number },
    callback?: () => void,
  ) => {
    const session = tabIdToCdpSession.get(target.tabId);
    if (session) {
      session.detach().catch(() => { });
      attachedTabs.delete(target.tabId);
    }
    if (callback) {
      setTimeout(() => {
        (globalThis.chrome as any).runtime.lastError = undefined;
        callback();
      }, 0);
    }
  };

  const onDetachListeners: Array<(source: { tabId?: number }, reason: string) => void> = [];

  return {
    sendCommand,
    attach,
    detach,
    onDetach: {
      addListener: (callback: (source: { tabId?: number }, reason: string) => void) => {
        onDetachListeners.push(callback);
      },
    },
  };
}

/**
 * Setup Puppeteer test environment with Chrome debugger shim
 */
export async function setupPuppeteerTest(): Promise<TestContext> {

  const launchArgs = [
    "--disable-crashpad",
    "--disable-crashpad-for-testing",
    "--disable-crash-reporter",
    "--disable-breakpad",
    "--no-first-run",
    "--no-default-browser-check",
    ...(isCI
      ? [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ]
      : []),
  ];

  const browser = await puppeteer.launch({
    headless: true,
    args: launchArgs,
    env: {
      ...process.env,
    },
  });

  const page = await browser.newPage();
  const tabId = 1;

  const chromeDebugger = await createChromeDebuggerShim(page, tabId);

  let runtimeLastError: { message: string } | undefined;
  const chrome = {
    debugger: chromeDebugger,
    runtime: {
      get lastError() {
        return runtimeLastError;
      },
      set lastError(value: { message: string } | undefined) {
        runtimeLastError = value;
      },
    },
    scripting: {
      executeScript: async (options: {
        target: { tabId: number };
        func: () => unknown;
      }) => {
        const result = await page.evaluate(options.func);
        return [{ result }];
      },
    },
  };

  globalThis.chrome = chrome as typeof globalThis.chrome;

  const cleanup = async () => {
    const session = tabIdToCdpSession.get(tabId);
    if (session) {
      try {
        await session.detach();
      } catch {
        // Ignore detach errors
      }
      tabIdToCdpSession.delete(tabId);
    }
    runtimeLastError = undefined;
    await page.close();
    await browser.close();
    delete (globalThis as any).chrome;
  };

  return {
    browser,
    page,
    tabId,
    chrome,
    cleanup,
  };
}

/**
 * Helper to create HTML content with iframes for testing
 */
export function html(
  strings: TemplateStringsArray,
  ...values: unknown[]
): string {
  return strings.reduce((result, str, i) => {
    const value = values[i];
    return result + str + (value !== undefined ? String(value) : "");
  }, "");
}
