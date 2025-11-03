import { beforeEach, describe, expect, it } from "vitest";
import type { ToolContext } from "../types.js";
import { CalculatorTool } from "./calculator.js";

describe("CalculatorTool", () => {
  let tool: CalculatorTool;
  let context: ToolContext;

  beforeEach(() => {
    tool = new CalculatorTool();
    context = {
      callId: "call-1",
      sessionId: "session-1",
      turnId: "turn-1",
    };
  });

  it("should have correct metadata", () => {
    expect(tool.name).toBe("calculator");
    expect(tool.description).toContain("mathematical");
  });

  it("should add two numbers", () => {
    const result = tool.execute({ operation: "add", a: 5, b: 3 }, context);

    expect(result.result).toBe(8);
    expect(result.operation).toBe("add");
    expect(result.operands).toEqual([5, 3]);
  });

  it("should subtract numbers", () => {
    const result = tool.execute(
      { operation: "subtract", a: 10, b: 3 },
      context,
    );

    expect(result.result).toBe(7);
    expect(result.operation).toBe("subtract");
  });

  it("should multiply numbers", () => {
    const result = tool.execute({ operation: "multiply", a: 4, b: 5 }, context);

    expect(result.result).toBe(20);
    expect(result.operation).toBe("multiply");
  });

  it("should divide numbers", () => {
    const result = tool.execute({ operation: "divide", a: 15, b: 3 }, context);

    expect(result.result).toBe(5);
    expect(result.operation).toBe("divide");
  });

  it("should throw on division by zero", () => {
    expect(() =>
      tool.execute({ operation: "divide", a: 10, b: 0 }, context),
    ).toThrow("Division by zero");
  });

  it("should calculate power", () => {
    const result = tool.execute({ operation: "power", a: 2, b: 3 }, context);

    expect(result.result).toBe(8);
    expect(result.operation).toBe("power");
  });

  it("should calculate square root", () => {
    const result = tool.execute({ operation: "sqrt", a: 16 }, context);

    expect(result.result).toBe(4);
    expect(result.operation).toBe("sqrt");
    expect(result.operands).toEqual([16]);
  });

  it("should throw on square root of negative number", () => {
    expect(() => tool.execute({ operation: "sqrt", a: -4 }, context)).toThrow(
      "Cannot calculate square root of negative number",
    );
  });

  it("should calculate absolute value", () => {
    const result = tool.execute({ operation: "abs", a: -10 }, context);

    expect(result.result).toBe(10);
    expect(result.operation).toBe("abs");
  });

  it("should throw when second operand is missing for binary operations", () => {
    expect(() => tool.execute({ operation: "add", a: 5 }, context)).toThrow(
      "Second operand required",
    );
  });

  it("should validate params with schema", () => {
    expect(() =>
      tool.validate({ operation: "add", a: "not a number" }),
    ).toThrow();
  });
});
