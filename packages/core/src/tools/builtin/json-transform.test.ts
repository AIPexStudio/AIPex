import { beforeEach, describe, expect, it } from "vitest";
import type { ToolContext } from "../types.js";
import { JsonTransformTool } from "./json-transform.js";

describe("JsonTransformTool", () => {
  let tool: JsonTransformTool;
  let context: ToolContext;

  beforeEach(() => {
    tool = new JsonTransformTool();
    context = {
      callId: "call-1",
      sessionId: "session-1",
      turnId: "turn-1",
    };
  });

  it("should parse JSON string", () => {
    const result = tool.execute(
      {
        data: '{"name": "Alice", "age": 30}',
        operation: "parse",
      },
      context,
    );

    expect(result.success).toBe(true);
    expect(result.result).toEqual({ name: "Alice", age: 30 });
  });

  it("should stringify JSON with formatting", () => {
    const result = tool.execute(
      {
        data: '{"name":"Alice","age":30}',
        operation: "stringify",
      },
      context,
    );

    expect(result.success).toBe(true);
    expect(typeof result.result).toBe("string");
    expect(result.result).toContain("\n");
  });

  it("should query nested path", () => {
    const result = tool.execute(
      {
        data: '{"user": {"name": "Alice", "age": 30}}',
        operation: "query",
        path: "user.name",
      },
      context,
    );

    expect(result.success).toBe(true);
    expect(result.result).toBe("Alice");
  });

  it("should query array with index", () => {
    const result = tool.execute(
      {
        data: '{"users": [{"name": "Alice"}, {"name": "Bob"}]}',
        operation: "query",
        path: "users[1].name",
      },
      context,
    );

    expect(result.success).toBe(true);
    expect(result.result).toBe("Bob");
  });

  it("should return undefined for non-existent path", () => {
    const result = tool.execute(
      {
        data: '{"name": "Alice"}',
        operation: "query",
        path: "age",
      },
      context,
    );

    expect(result.success).toBe(true);
    expect(result.result).toBeUndefined();
  });

  it("should merge two JSON objects", () => {
    const result = tool.execute(
      {
        data: '{"name": "Alice", "age": 30}',
        operation: "merge",
        mergeWith: '{"age": 31, "city": "Tokyo"}',
      },
      context,
    );

    expect(result.success).toBe(true);
    expect(result.result).toEqual({
      name: "Alice",
      age: 31,
      city: "Tokyo",
    });
  });

  it("should deep merge nested objects", () => {
    const result = tool.execute(
      {
        data: '{"user": {"name": "Alice", "age": 30}}',
        operation: "merge",
        mergeWith: '{"user": {"age": 31, "city": "Tokyo"}}',
      },
      context,
    );

    expect(result.success).toBe(true);
    const merged = result.result as any;
    expect(merged.user.name).toBe("Alice");
    expect(merged.user.age).toBe(31);
    expect(merged.user.city).toBe("Tokyo");
  });

  it("should filter array by key and value", () => {
    const result = tool.execute(
      {
        data: '[{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}, {"name": "Charlie", "age": 30}]',
        operation: "filter",
        filterKey: "age",
        filterValue: 30,
      },
      context,
    );

    expect(result.success).toBe(true);
    expect(Array.isArray(result.result)).toBe(true);
    expect((result.result as any[]).length).toBe(2);
  });

  it("should handle invalid JSON gracefully", () => {
    const result = tool.execute(
      {
        data: "invalid json",
        operation: "parse",
      },
      context,
    );

    expect(result.success).toBe(false);
    expect(typeof result.result).toBe("string");
  });

  it("should throw error when path is missing for query", () => {
    const result = tool.execute(
      {
        data: '{"name": "Alice"}',
        operation: "query",
      },
      context,
    );

    expect(result.success).toBe(false);
  });

  it("should throw error when mergeWith is missing for merge", () => {
    const result = tool.execute(
      {
        data: '{"name": "Alice"}',
        operation: "merge",
      },
      context,
    );

    expect(result.success).toBe(false);
  });

  it("should throw error when data is not array for filter", () => {
    const result = tool.execute(
      {
        data: '{"name": "Alice"}',
        operation: "filter",
        filterKey: "name",
      },
      context,
    );

    expect(result.success).toBe(false);
  });
});
