/**
 * Intervention Registry Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { InterventionImplementation } from "./types";

// Mock chrome API
vi.mock("chrome", () => ({
  tabs: {
    onActivated: { addListener: vi.fn() },
    onUpdated: { addListener: vi.fn() },
    query: vi.fn().mockResolvedValue([{ id: 1, url: "https://example.com" }]),
  },
}));

// Mock implementations to avoid dynamic imports
vi.mock("./implementations/monitor-operation.js", () => ({
  monitorOperationIntervention: {
    metadata: {
      name: "Monitor User Operation",
      type: "monitor-operation",
      description: "Monitor user click operations",
      enabled: true,
      inputSchema: { type: "object", properties: {} },
      outputSchema: { type: "object", properties: {} },
      examples: [],
    },
    execute: vi.fn().mockResolvedValue({ element: {}, context: {} }),
  },
}));

vi.mock("./implementations/voice-input.js", () => ({
  voiceInputIntervention: {
    metadata: {
      name: "Voice Input",
      type: "voice-input",
      description: "Voice input intervention",
      enabled: true,
      inputSchema: { type: "object", properties: {} },
      outputSchema: { type: "object", properties: {} },
      examples: [],
    },
    execute: vi.fn().mockResolvedValue({ text: "test" }),
  },
}));

vi.mock("./implementations/user-selection.js", () => ({
  userSelectionIntervention: {
    metadata: {
      name: "User Selection",
      type: "user-selection",
      description: "User selection intervention",
      enabled: true,
      inputSchema: { type: "object", properties: {} },
      outputSchema: { type: "object", properties: {} },
      examples: [],
    },
    execute: vi.fn().mockResolvedValue({ selected: "option1" }),
  },
}));

describe("InterventionRegistry", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Reset the singleton for each test
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should be a singleton", async () => {
    const { InterventionRegistry } = await import("./intervention-registry.js");
    const instance1 = InterventionRegistry.getInstance();
    const instance2 = InterventionRegistry.getInstance();
    expect(instance1).toBe(instance2);
  });

  it("should initialize and register all interventions", async () => {
    const { InterventionRegistry } = await import("./intervention-registry.js");
    const registry = InterventionRegistry.getInstance();

    await registry.initialize();

    expect(registry.isInitialized()).toBe(true);

    const allMetadata = registry.getAllMetadata();
    expect(allMetadata.length).toBe(3);

    const types = allMetadata.map((m) => m.type);
    expect(types).toContain("monitor-operation");
    expect(types).toContain("voice-input");
    expect(types).toContain("user-selection");
  });

  it("should return intervention metadata by type", async () => {
    const { InterventionRegistry } = await import("./intervention-registry.js");
    const registry = InterventionRegistry.getInstance();

    await registry.initialize();

    const metadata = registry.getMetadata("monitor-operation");
    expect(metadata).not.toBeNull();
    expect(metadata?.name).toBe("Monitor User Operation");
    expect(metadata?.enabled).toBe(true);
  });

  it("should check if intervention is available", async () => {
    const { InterventionRegistry } = await import("./intervention-registry.js");
    const registry = InterventionRegistry.getInstance();

    await registry.initialize();

    expect(registry.isAvailable("monitor-operation")).toBe(true);
    expect(registry.isAvailable("non-existent" as any)).toBe(false);
  });

  it("should register custom intervention", async () => {
    const { InterventionRegistry } = await import("./intervention-registry.js");
    const registry = InterventionRegistry.getInstance();

    const customIntervention: InterventionImplementation = {
      metadata: {
        name: "Custom Intervention",
        type: "custom" as any,
        description: "A custom test intervention",
        enabled: true,
        inputSchema: { type: "object", properties: {} },
        outputSchema: { type: "object", properties: {} },
        examples: [],
      },
      execute: vi.fn().mockResolvedValue({ result: "custom" }),
    };

    registry.register(customIntervention);

    const metadata = registry.getMetadata("custom" as any);
    expect(metadata?.name).toBe("Custom Intervention");
  });

  it("should filter enabled interventions only", async () => {
    const { InterventionRegistry } = await import("./intervention-registry.js");
    const registry = InterventionRegistry.getInstance();

    await registry.initialize();

    // Register a disabled intervention
    const disabledIntervention: InterventionImplementation = {
      metadata: {
        name: "Disabled Intervention",
        type: "disabled-test" as any,
        description: "A disabled test intervention",
        enabled: false,
        inputSchema: { type: "object", properties: {} },
        outputSchema: { type: "object", properties: {} },
        examples: [],
      },
      execute: vi.fn(),
    };

    registry.register(disabledIntervention);

    const allMetadata = registry.getAllMetadata();
    const enabledMetadata = registry.getAllMetadata(true);

    expect(allMetadata.length).toBeGreaterThan(enabledMetadata.length);
    expect(enabledMetadata.every((m) => m.enabled)).toBe(true);
  });
});
