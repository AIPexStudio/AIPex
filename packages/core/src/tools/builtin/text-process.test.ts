import { beforeEach, describe, expect, it } from "vitest";
import type { ToolContext } from "../types.js";
import { TextProcessTool } from "./text-process.js";

describe("TextProcessTool", () => {
  let tool: TextProcessTool;
  let context: ToolContext;

  beforeEach(() => {
    tool = new TextProcessTool();
    context = {
      callId: "call-1",
      sessionId: "session-1",
      turnId: "turn-1",
    };
  });

  it("should convert text to uppercase", () => {
    const result = tool.execute(
      {
        text: "hello world",
        operation: "uppercase",
      },
      context,
    );

    expect(result.result).toBe("HELLO WORLD");
    expect(result.operation).toBe("uppercase");
  });

  it("should convert text to lowercase", () => {
    const result = tool.execute(
      {
        text: "HELLO WORLD",
        operation: "lowercase",
      },
      context,
    );

    expect(result.result).toBe("hello world");
  });

  it("should trim whitespace", () => {
    const result = tool.execute(
      {
        text: "  hello world  ",
        operation: "trim",
      },
      context,
    );

    expect(result.result).toBe("hello world");
  });

  it("should reverse text", () => {
    const result = tool.execute(
      {
        text: "hello",
        operation: "reverse",
      },
      context,
    );

    expect(result.result).toBe("olleh");
  });

  it("should count words", () => {
    const result = tool.execute(
      {
        text: "hello world this is a test",
        operation: "word_count",
      },
      context,
    );

    expect(result.result).toBe(6);
  });

  it("should count characters", () => {
    const result = tool.execute(
      {
        text: "hello",
        operation: "char_count",
      },
      context,
    );

    expect(result.result).toBe(5);
  });

  it("should split text by delimiter", () => {
    const result = tool.execute(
      {
        text: "hello,world,test",
        operation: "split",
        delimiter: ",",
      },
      context,
    );

    expect(result.result).toEqual(["hello", "world", "test"]);
  });

  it("should split by space by default", () => {
    const result = tool.execute(
      {
        text: "hello world test",
        operation: "split",
      },
      context,
    );

    expect(result.result).toEqual(["hello", "world", "test"]);
  });

  it("should replace text", () => {
    const result = tool.execute(
      {
        text: "hello world hello",
        operation: "replace",
        searchValue: "hello",
        replaceValue: "hi",
      },
      context,
    );

    expect(result.result).toBe("hi world hi");
  });

  it("should extract substring", () => {
    const result = tool.execute(
      {
        text: "hello world",
        operation: "substring",
        start: 0,
        end: 5,
      },
      context,
    );

    expect(result.result).toBe("hello");
  });

  it("should extract substring without end", () => {
    const result = tool.execute(
      {
        text: "hello world",
        operation: "substring",
        start: 6,
      },
      context,
    );

    expect(result.result).toBe("world");
  });

  it("should include original length in result", () => {
    const result = tool.execute(
      {
        text: "hello",
        operation: "uppercase",
      },
      context,
    );

    expect(result.originalLength).toBe(5);
  });

  it("should throw error when searchValue is missing for replace", () => {
    expect(() =>
      tool.execute(
        {
          text: "hello",
          operation: "replace",
        },
        context,
      ),
    ).toThrow("searchValue is required");
  });

  it("should throw error when start is missing for substring", () => {
    expect(() =>
      tool.execute(
        {
          text: "hello",
          operation: "substring",
        },
        context,
      ),
    ).toThrow("start index is required");
  });

  it("should escape regex special characters in replace", () => {
    const result = tool.execute(
      {
        text: "test (hello) test",
        operation: "replace",
        searchValue: "(hello)",
        replaceValue: "[hi]",
      },
      context,
    );

    expect(result.result).toBe("test [hi] test");
  });
});
