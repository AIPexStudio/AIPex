/// <reference types="chrome" />
import "@testing-library/jest-dom/vitest";

const _globalThis = globalThis as typeof globalThis & {
  ResizeObserver: typeof ResizeObserver;
  chrome: typeof chrome;
};

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof _globalThis.ResizeObserver === "undefined") {
  _globalThis.ResizeObserver = ResizeObserver;
}

// Mock chrome API for browser extension tests
if (typeof _globalThis.chrome === "undefined") {
  _globalThis.chrome = {
    storage: {
      local: {
        get: () => Promise.resolve({}),
        set: () => Promise.resolve(),
        remove: () => Promise.resolve(),
        clear: () => Promise.resolve(),
      },
      sync: {
        get: () => Promise.resolve({}),
        set: () => Promise.resolve(),
        remove: () => Promise.resolve(),
        clear: () => Promise.resolve(),
      },
      onChanged: {
        addListener: () => {},
        removeListener: () => {},
      },
    },
    runtime: {
      onMessage: {
        addListener: () => {},
        removeListener: () => {},
      },
      sendMessage: () => Promise.resolve(),
    },
    debugger: {
      attach: () => Promise.resolve(),
      detach: () => Promise.resolve(),
      sendCommand: () => Promise.resolve(),
      onDetach: {
        addListener: () => {},
        removeListener: () => {},
      },
      onEvent: {
        addListener: () => {},
        removeListener: () => {},
      },
    },
    tabs: {
      query: () => Promise.resolve([]),
      get: () => Promise.resolve({}),
    },
  } as unknown as typeof chrome;
}
