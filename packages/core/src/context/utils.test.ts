import { describe, expect, it, vi } from "vitest";
import type { Context } from "./types.js";
import {
  formatContextsForPrompt,
  isContext,
  resolveContexts,
} from "./utils.js";

const createMockContext = (
  id: string,
  overrides?: Partial<Context>,
): Context => ({
  id,
  type: "custom",
  providerId: "test-provider",
  label: `Context ${id}`,
  value: `Value ${id}`,
  metadata: { test: true },
  timestamp: Date.now(),
  ...overrides,
});

describe("formatContextsForPrompt", () => {
  it("should return empty string for empty array", () => {
    const result = formatContextsForPrompt([]);
    expect(result).toBe("");
  });

  it("should format a single context", () => {
    const ctx = createMockContext("ctx1", {
      type: "page",
      label: "Homepage",
      value: "Welcome to the homepage",
    });

    const result = formatContextsForPrompt([ctx]);
    expect(result).toBe("[page: Homepage]\nWelcome to the homepage");
  });

  it("should format multiple contexts with double newlines", () => {
    const ctx1 = createMockContext("ctx1", {
      type: "page",
      label: "Page 1",
      value: "Content 1",
    });
    const ctx2 = createMockContext("ctx2", {
      type: "file",
      label: "File 1",
      value: "Content 2",
    });

    const result = formatContextsForPrompt([ctx1, ctx2]);
    expect(result).toBe(
      "[page: Page 1]\nContent 1\n\n[file: File 1]\nContent 2",
    );
  });

  it("should handle File objects", () => {
    const file = new File(["content"], "test.txt", { type: "text/plain" });
    const ctx = createMockContext("ctx1", {
      type: "file",
      label: "Test File",
      value: file,
    });

    const result = formatContextsForPrompt([ctx]);
    expect(result).toContain("[file: Test File]");
    expect(result).toContain("[File: test.txt, Size:");
  });

  it("should handle Blob objects", () => {
    const blob = new Blob(["content"], { type: "text/plain" });
    const ctx = createMockContext("ctx1", {
      type: "screenshot",
      label: "Screenshot",
      value: blob,
    });

    const result = formatContextsForPrompt([ctx]);
    expect(result).toContain("[screenshot: Screenshot]");
    expect(result).toContain("[Blob: Size:");
    expect(result).toContain("Type: text/plain");
  });

  it("should convert non-string values to string", () => {
    const ctx = createMockContext("ctx1", {
      value: 123 as any,
    });

    const result = formatContextsForPrompt([ctx]);
    expect(result).toContain("123");
  });

  it("should preserve newlines in content", () => {
    const ctx = createMockContext("ctx1", {
      label: "Multi-line",
      value: "Line 1\nLine 2\nLine 3",
    });

    const result = formatContextsForPrompt([ctx]);
    expect(result).toContain("Line 1\nLine 2\nLine 3");
  });
});

describe("isContext", () => {
  it("should return true for valid Context object", () => {
    const ctx = createMockContext("ctx1");
    expect(isContext(ctx)).toBe(true);
  });

  it("should return false for null", () => {
    expect(isContext(null)).toBe(false);
  });

  it("should return false for undefined", () => {
    expect(isContext(undefined)).toBe(false);
  });

  it("should return false for non-object", () => {
    expect(isContext("string")).toBe(false);
    expect(isContext(123)).toBe(false);
    expect(isContext(true)).toBe(false);
  });

  it("should return false for object missing id", () => {
    const obj = {
      type: "page",
      providerId: "test",
      label: "Test",
      value: "value",
    };
    expect(isContext(obj)).toBe(false);
  });

  it("should return false for object missing type", () => {
    const obj = {
      id: "ctx1",
      providerId: "test",
      label: "Test",
      value: "value",
    };
    expect(isContext(obj)).toBe(false);
  });

  it("should return false for object missing providerId", () => {
    const obj = {
      id: "ctx1",
      type: "page",
      label: "Test",
      value: "value",
    };
    expect(isContext(obj)).toBe(false);
  });

  it("should return false for object missing label", () => {
    const obj = {
      id: "ctx1",
      type: "page",
      providerId: "test",
      value: "value",
    };
    expect(isContext(obj)).toBe(false);
  });

  it("should return false for object missing value", () => {
    const obj = {
      id: "ctx1",
      type: "page",
      providerId: "test",
      label: "Test",
    };
    expect(isContext(obj)).toBe(false);
  });

  it("should accept File as value", () => {
    const file = new File(["content"], "test.txt");
    const ctx = createMockContext("ctx1", { value: file });
    expect(isContext(ctx)).toBe(true);
  });

  it("should accept Blob as value", () => {
    const blob = new Blob(["content"]);
    const ctx = createMockContext("ctx1", { value: blob });
    expect(isContext(ctx)).toBe(true);
  });

  it("should return false for invalid value type", () => {
    const obj = {
      id: "ctx1",
      type: "page",
      providerId: "test",
      label: "Test",
      value: 123,
    };
    expect(isContext(obj)).toBe(false);
  });

  it("should allow optional metadata and timestamp", () => {
    const ctx = {
      id: "ctx1",
      type: "page",
      providerId: "test",
      label: "Test",
      value: "value",
    };
    expect(isContext(ctx)).toBe(true);

    const ctxWithMeta = { ...ctx, metadata: { key: "value" } };
    expect(isContext(ctxWithMeta)).toBe(true);

    const ctxWithTimestamp = { ...ctx, timestamp: Date.now() };
    expect(isContext(ctxWithTimestamp)).toBe(true);
  });
});

describe("resolveContexts", () => {
  it("should resolve Context objects directly", async () => {
    const ctx1 = createMockContext("ctx1");
    const ctx2 = createMockContext("ctx2");

    const getContext = vi.fn();
    const result = await resolveContexts([ctx1, ctx2], getContext);

    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe("ctx1");
    expect(result[1]?.id).toBe("ctx2");
    expect(getContext).not.toHaveBeenCalled();
  });

  it("should resolve string IDs via getContext", async () => {
    const ctx1 = createMockContext("ctx1");
    const getContext = vi.fn().mockResolvedValue(ctx1);

    const result = await resolveContexts(["ctx1"], getContext);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("ctx1");
    expect(getContext).toHaveBeenCalledWith("ctx1");
  });

  it("should handle mixed Context objects and string IDs", async () => {
    const ctx1 = createMockContext("ctx1");
    const ctx2 = createMockContext("ctx2");

    const getContext = vi.fn().mockResolvedValue(ctx2);

    const result = await resolveContexts([ctx1, "ctx2"], getContext);

    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe("ctx1");
    expect(result[1]?.id).toBe("ctx2");
    expect(getContext).toHaveBeenCalledWith("ctx2");
    expect(getContext).toHaveBeenCalledTimes(1);
  });

  it("should skip string IDs that return null", async () => {
    const ctx1 = createMockContext("ctx1");
    const getContext = vi.fn().mockResolvedValue(null);

    const result = await resolveContexts([ctx1, "ctx2"], getContext);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("ctx1");
    expect(getContext).toHaveBeenCalledWith("ctx2");
  });

  it("should handle empty array", async () => {
    const getContext = vi.fn();
    const result = await resolveContexts([], getContext);

    expect(result).toHaveLength(0);
    expect(getContext).not.toHaveBeenCalled();
  });

  it("should filter out invalid objects", async () => {
    const ctx1 = createMockContext("ctx1");
    const invalid = { id: "invalid", type: "test" }; // Missing required fields

    const getContext = vi.fn();
    const result = await resolveContexts([ctx1, invalid as any], getContext);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("ctx1");
  });

  it("should call getContext sequentially for multiple IDs", async () => {
    const ctx1 = createMockContext("ctx1");
    const ctx2 = createMockContext("ctx2");

    const getContext = vi
      .fn()
      .mockResolvedValueOnce(ctx1)
      .mockResolvedValueOnce(ctx2);

    const result = await resolveContexts(["ctx1", "ctx2"], getContext);

    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe("ctx1");
    expect(result[1]?.id).toBe("ctx2");
    expect(getContext).toHaveBeenCalledTimes(2);
  });

  it("should preserve order of resolved contexts", async () => {
    const ctx1 = createMockContext("ctx1", { label: "First" });
    const ctx2 = createMockContext("ctx2", { label: "Second" });
    const ctx3 = createMockContext("ctx3", { label: "Third" });

    const getContext = vi.fn().mockImplementation((id: string) => {
      if (id === "ctx2") return Promise.resolve(ctx2);
      if (id === "ctx3") return Promise.resolve(ctx3);
      return Promise.resolve(null);
    });

    const result = await resolveContexts([ctx1, "ctx2", "ctx3"], getContext);

    expect(result).toHaveLength(3);
    expect(result[0]?.label).toBe("First");
    expect(result[1]?.label).toBe("Second");
    expect(result[2]?.label).toBe("Third");
  });
});
