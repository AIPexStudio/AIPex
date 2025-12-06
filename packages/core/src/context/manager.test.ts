import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContextManager } from "./manager.js";
import type { Context, ContextProvider, ContextQuery } from "./types.js";

// Mock provider for testing
class MockProvider implements ContextProvider {
  id: string;
  name: string;
  description?: string;
  capabilities = {
    canList: true,
    canSearch: true,
    canWatch: false,
    types: ["custom" as const],
  };

  initialize = vi.fn().mockResolvedValue(undefined);
  dispose = vi.fn().mockResolvedValue(undefined);
  getContexts = vi.fn().mockResolvedValue([]);
  getContext = vi.fn().mockResolvedValue(null);

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }
}

// Mock provider with watch capability
class MockWatchProvider extends MockProvider {
  override capabilities = {
    canList: true,
    canSearch: false,
    canWatch: true,
    types: ["custom" as const],
  };

  watch = vi.fn().mockReturnValue(() => {});
}

const createMockContext = (
  id: string,
  providerId: string,
  overrides?: Partial<Context>,
): Context => ({
  id,
  type: "custom",
  providerId,
  label: `Context ${id}`,
  value: `Value ${id}`,
  metadata: {},
  timestamp: Date.now(),
  ...overrides,
});

describe("ContextManager", () => {
  let manager: ContextManager;
  let provider1: MockProvider;
  let provider2: MockProvider;

  beforeEach(() => {
    provider1 = new MockProvider("provider1", "Provider 1");
    provider2 = new MockProvider("provider2", "Provider 2");
    manager = new ContextManager();
  });

  describe("provider registration", () => {
    it("should register a provider", async () => {
      await manager.registerProvider(provider1);
      const providers = manager.getProviders();
      expect(providers).toHaveLength(1);
      expect(providers[0]?.id).toBe("provider1");
    });

    it("should not initialize provider if autoInitialize is false", async () => {
      await manager.registerProvider(provider1);
      expect(provider1.initialize).not.toHaveBeenCalled();
    });

    it("should initialize provider if autoInitialize is true", async () => {
      const managerWithInit = new ContextManager({
        autoInitialize: true,
      });
      await managerWithInit.registerProvider(provider1);
      expect(provider1.initialize).toHaveBeenCalled();
    });

    it("should throw error when registering duplicate provider id", async () => {
      await manager.registerProvider(provider1);
      await expect(manager.registerProvider(provider1)).rejects.toThrow(
        'Provider with id "provider1" is already registered',
      );
    });

    it("should register multiple providers at construction", async () => {
      const manager = new ContextManager({
        providers: [provider1, provider2],
      });
      expect(manager.getProviders()).toHaveLength(2);
    });
  });

  describe("provider unregistration", () => {
    it("should unregister a provider", async () => {
      await manager.registerProvider(provider1);
      await manager.unregisterProvider("provider1");
      expect(manager.getProviders()).toHaveLength(0);
    });

    it("should call dispose when unregistering", async () => {
      await manager.registerProvider(provider1);
      await manager.unregisterProvider("provider1");
      expect(provider1.dispose).toHaveBeenCalled();
    });

    it("should handle unregistering non-existent provider", async () => {
      await expect(
        manager.unregisterProvider("non-existent"),
      ).resolves.not.toThrow();
    });
  });

  describe("getProviders", () => {
    it("should return all registered providers", async () => {
      await manager.registerProvider(provider1);
      await manager.registerProvider(provider2);
      const providers = manager.getProviders();
      expect(providers).toHaveLength(2);
      expect(providers.map((p) => p.id)).toEqual(["provider1", "provider2"]);
    });
  });

  describe("getProvider", () => {
    it("should get a specific provider by id", async () => {
      await manager.registerProvider(provider1);
      const provider = manager.getProvider("provider1");
      expect(provider?.id).toBe("provider1");
    });

    it("should return undefined for non-existent provider", () => {
      const provider = manager.getProvider("non-existent");
      expect(provider).toBeUndefined();
    });
  });

  describe("getContexts", () => {
    it("should get contexts from all providers", async () => {
      const ctx1 = createMockContext("ctx1", "provider1");
      const ctx2 = createMockContext("ctx2", "provider2");

      provider1.getContexts.mockResolvedValue([ctx1]);
      provider2.getContexts.mockResolvedValue([ctx2]);

      await manager.registerProvider(provider1);
      await manager.registerProvider(provider2);

      const contexts = await manager.getContexts();
      expect(contexts).toHaveLength(2);
      expect(contexts.map((c) => c.id)).toEqual(["ctx1", "ctx2"]);
    });

    it("should filter by provider id", async () => {
      const ctx1 = createMockContext("ctx1", "provider1");
      provider1.getContexts.mockResolvedValue([ctx1]);

      await manager.registerProvider(provider1);
      await manager.registerProvider(provider2);

      const contexts = await manager.getContexts({ providerId: "provider1" });
      expect(contexts).toHaveLength(1);
      expect(contexts[0]?.id).toBe("ctx1");
      expect(provider1.getContexts).toHaveBeenCalled();
      expect(provider2.getContexts).not.toHaveBeenCalled();
    });

    it("should filter by types", async () => {
      const ctx1 = createMockContext("ctx1", "provider1", { type: "page" });
      const ctx2 = createMockContext("ctx2", "provider1", { type: "file" });

      provider1.getContexts.mockResolvedValue([ctx1, ctx2]);
      await manager.registerProvider(provider1);

      const contexts = await manager.getContexts({ types: ["page"] });
      expect(contexts).toHaveLength(1);
      expect(contexts[0]?.type).toBe("page");
    });

    it("should filter by search query", async () => {
      const ctx1 = createMockContext("ctx1", "provider1", {
        label: "Hello World",
      });
      const ctx2 = createMockContext("ctx2", "provider1", {
        label: "Goodbye",
      });

      provider1.getContexts.mockResolvedValue([ctx1, ctx2]);
      await manager.registerProvider(provider1);

      const contexts = await manager.getContexts({ search: "hello" });
      expect(contexts).toHaveLength(1);
      expect(contexts[0]?.label).toBe("Hello World");
    });

    it("should filter by search in value", async () => {
      const ctx1 = createMockContext("ctx1", "provider1", {
        value: "This contains test data",
      });
      const ctx2 = createMockContext("ctx2", "provider1", {
        value: "Other content",
      });

      provider1.getContexts.mockResolvedValue([ctx1, ctx2]);
      await manager.registerProvider(provider1);

      const contexts = await manager.getContexts({ search: "test" });
      expect(contexts).toHaveLength(1);
      expect(contexts[0]?.value).toContain("test");
    });

    it("should apply limit", async () => {
      const ctx1 = createMockContext("ctx1", "provider1");
      const ctx2 = createMockContext("ctx2", "provider1");
      const ctx3 = createMockContext("ctx3", "provider1");

      provider1.getContexts.mockResolvedValue([ctx1, ctx2, ctx3]);
      await manager.registerProvider(provider1);

      const contexts = await manager.getContexts({ limit: 2 });
      expect(contexts).toHaveLength(2);
    });

    it("should handle provider errors gracefully", async () => {
      provider1.getContexts.mockRejectedValue(new Error("Provider error"));
      provider2.getContexts.mockResolvedValue([
        createMockContext("ctx2", "provider2"),
      ]);

      await manager.registerProvider(provider1);
      await manager.registerProvider(provider2);

      const contexts = await manager.getContexts();
      expect(contexts).toHaveLength(1);
      expect(contexts[0]?.id).toBe("ctx2");
    });

    it("should pass query to providers", async () => {
      await manager.registerProvider(provider1);

      const query: ContextQuery = { search: "test", limit: 5 };
      await manager.getContexts(query);

      expect(provider1.getContexts).toHaveBeenCalledWith(query);
    });
  });

  describe("getContext", () => {
    it("should get a specific context by id", async () => {
      const ctx = createMockContext("ctx1", "provider1");
      provider1.getContext.mockResolvedValue(ctx);

      await manager.registerProvider(provider1);

      const result = await manager.getContext("ctx1");
      expect(result?.id).toBe("ctx1");
      expect(provider1.getContext).toHaveBeenCalledWith("ctx1");
    });

    it("should try all providers until context is found", async () => {
      const ctx = createMockContext("ctx1", "provider2");
      provider1.getContext.mockResolvedValue(null);
      provider2.getContext.mockResolvedValue(ctx);

      await manager.registerProvider(provider1);
      await manager.registerProvider(provider2);

      const result = await manager.getContext("ctx1");
      expect(result?.id).toBe("ctx1");
      expect(provider1.getContext).toHaveBeenCalledWith("ctx1");
      expect(provider2.getContext).toHaveBeenCalledWith("ctx1");
    });

    it("should return null if context not found", async () => {
      provider1.getContext.mockResolvedValue(null);
      await manager.registerProvider(provider1);

      const result = await manager.getContext("non-existent");
      expect(result).toBeNull();
    });
  });

  describe("watchProvider", () => {
    it("should watch a provider for changes", async () => {
      const watchProvider = new MockWatchProvider("watch1", "Watch Provider");
      await manager.registerProvider(watchProvider);

      const callback = vi.fn();
      manager.watchProvider("watch1", callback);

      expect(watchProvider.watch).toHaveBeenCalled();
    });

    it("should throw error if provider does not exist", () => {
      expect(() => manager.watchProvider("non-existent", vi.fn())).toThrow(
        'Provider "non-existent" not found',
      );
    });

    it("should throw error if provider does not support watching", async () => {
      await manager.registerProvider(provider1);
      expect(() => manager.watchProvider("provider1", vi.fn())).toThrow(
        'Provider "provider1" does not support watching',
      );
    });

    it("should call callback when provider emits changes", async () => {
      const watchProvider = new MockWatchProvider("watch1", "Watch Provider");
      let watchCallback: ((contexts: Context[]) => void) | undefined;

      watchProvider.watch.mockImplementation((cb) => {
        watchCallback = cb;
        return () => {};
      });

      await manager.registerProvider(watchProvider);

      const userCallback = vi.fn();
      manager.watchProvider("watch1", userCallback);

      const contexts = [createMockContext("ctx1", "watch1")];
      watchCallback?.(contexts);

      expect(userCallback).toHaveBeenCalledWith(contexts);
    });

    it("should unsubscribe when returned function is called", async () => {
      const watchProvider = new MockWatchProvider("watch1", "Watch Provider");
      const unsubscribe = vi.fn();
      watchProvider.watch.mockReturnValue(unsubscribe);

      await manager.registerProvider(watchProvider);

      const callback = vi.fn();
      const unsub = manager.watchProvider("watch1", callback);
      unsub();

      expect(unsubscribe).toHaveBeenCalled();
    });

    it("should support multiple callbacks for same provider", async () => {
      const watchProvider = new MockWatchProvider("watch1", "Watch Provider");
      let watchCallback: ((contexts: Context[]) => void) | undefined;

      watchProvider.watch.mockImplementation((cb) => {
        watchCallback = cb;
        return () => {};
      });

      await manager.registerProvider(watchProvider);

      const callback1 = vi.fn();
      const callback2 = vi.fn();

      manager.watchProvider("watch1", callback1);
      manager.watchProvider("watch1", callback2);

      const contexts = [createMockContext("ctx1", "watch1")];
      watchCallback?.(contexts);

      expect(callback1).toHaveBeenCalledWith(contexts);
      expect(callback2).toHaveBeenCalledWith(contexts);
    });

    it("should only start watching once for multiple callbacks", async () => {
      const watchProvider = new MockWatchProvider("watch1", "Watch Provider");
      await manager.registerProvider(watchProvider);

      manager.watchProvider("watch1", vi.fn());
      manager.watchProvider("watch1", vi.fn());

      expect(watchProvider.watch).toHaveBeenCalledTimes(1);
    });

    it("should stop watching when all callbacks unsubscribe", async () => {
      const watchProvider = new MockWatchProvider("watch1", "Watch Provider");
      const unsubscribe = vi.fn();
      watchProvider.watch.mockReturnValue(unsubscribe);

      await manager.registerProvider(watchProvider);

      const unsub1 = manager.watchProvider("watch1", vi.fn());
      const unsub2 = manager.watchProvider("watch1", vi.fn());

      unsub1();
      expect(unsubscribe).not.toHaveBeenCalled();

      unsub2();
      expect(unsubscribe).toHaveBeenCalled();
    });
  });

  describe("initialize", () => {
    it("should initialize all providers", async () => {
      await manager.registerProvider(provider1);
      await manager.registerProvider(provider2);

      await manager.initialize();

      expect(provider1.initialize).toHaveBeenCalled();
      expect(provider2.initialize).toHaveBeenCalled();
    });

    it("should skip providers without initialize method", async () => {
      const providerWithoutInit: ContextProvider = {
        id: "no-init",
        name: "No Init",
        capabilities: {
          canList: true,
          canSearch: false,
          canWatch: false,
          types: ["custom"],
        },
        getContexts: vi.fn().mockResolvedValue([]),
        getContext: vi.fn().mockResolvedValue(null),
      };

      await manager.registerProvider(providerWithoutInit);
      await expect(manager.initialize()).resolves.not.toThrow();
    });
  });

  describe("dispose", () => {
    it("should dispose all providers", async () => {
      await manager.registerProvider(provider1);
      await manager.registerProvider(provider2);

      await manager.dispose();

      expect(provider1.dispose).toHaveBeenCalled();
      expect(provider2.dispose).toHaveBeenCalled();
    });

    it("should clear all watches", async () => {
      const watchProvider = new MockWatchProvider("watch1", "Watch Provider");
      const unsubscribe = vi.fn();
      watchProvider.watch?.mockReturnValue(unsubscribe);

      await manager.registerProvider(watchProvider);
      manager.watchProvider("watch1", vi.fn());

      await manager.dispose();

      expect(unsubscribe).toHaveBeenCalled();
    });

    it("should clear all providers", async () => {
      await manager.registerProvider(provider1);
      await manager.dispose();

      expect(manager.getProviders()).toHaveLength(0);
    });

    it("should skip providers without dispose method", async () => {
      const providerWithoutDispose: ContextProvider = {
        id: "no-dispose",
        name: "No Dispose",
        capabilities: {
          canList: true,
          canSearch: false,
          canWatch: false,
          types: ["custom"],
        },
        getContexts: vi.fn().mockResolvedValue([]),
        getContext: vi.fn().mockResolvedValue(null),
      };

      await manager.registerProvider(providerWithoutDispose);
      await expect(manager.dispose()).resolves.not.toThrow();
    });
  });
});
