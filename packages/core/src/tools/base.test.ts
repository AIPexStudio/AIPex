import { describe, expect, it } from "vitest";
import { z } from "zod";
import { Tool } from "./base.js";
import type { ToolContext } from "./types.js";

class TestTool extends Tool<{ input: string }, string> {
  readonly name = "test_tool";
  readonly description = "A test tool";
  readonly schema = z.object({
    input: z.string().describe("Test input"),
  });

  execute(params: { input: string }): string {
    return `Result: ${params.input}`;
  }
}

class ErrorTool extends Tool<{ shouldFail: boolean }, string> {
  readonly name = "error_tool";
  readonly description = "A tool that can fail";
  readonly schema = z.object({
    shouldFail: z.boolean(),
  });

  execute(params: { shouldFail: boolean }): string {
    if (params.shouldFail) {
      throw new Error("Tool failed");
    }
    return "success";
  }
}

describe("Tool", () => {
  it("should validate params correctly", () => {
    const tool = new TestTool();

    const result = tool.validate({ input: "hello" });
    expect(result).toEqual({ input: "hello" });
  });

  it("should throw on invalid params", () => {
    const tool = new TestTool();

    expect(() => tool.validate({ invalid: "data" })).toThrow();
  });

  it("should generate function declaration", () => {
    const tool = new TestTool();
    const declaration = tool.toFunctionDeclaration();

    expect(declaration.name).toBe("test_tool");
    expect(declaration.description).toBe("A test tool");
    expect(declaration.parameters).toMatchObject({
      type: "object",
      properties: {
        input: {
          type: "string",
          description: "Test input",
        },
      },
    });
  });

  it("should execute successfully", async () => {
    const tool = new TestTool();
    const context: ToolContext = {
      callId: "test-1",
      sessionId: "session-1",
      turnId: "turn-1",
    };

    const result = await tool.executeWithResult({ input: "test" }, context);

    expect(result.success).toBe(true);
    expect(result.data).toBe("Result: test");
    expect(result.metadata?.duration).toBeGreaterThanOrEqual(0);
  });

  it("should handle execution errors", async () => {
    const tool = new ErrorTool();
    const context: ToolContext = {
      callId: "test-1",
      sessionId: "session-1",
      turnId: "turn-1",
    };

    const result = await tool.executeWithResult({ shouldFail: true }, context);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Tool failed");
    expect(result.errorType).toBe("Error");
  });

  it("should handle validation errors", async () => {
    const tool = new TestTool();
    const context: ToolContext = {
      callId: "test-1",
      sessionId: "session-1",
      turnId: "turn-1",
    };

    const result = await tool.executeWithResult({ invalid: "data" }, context);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
