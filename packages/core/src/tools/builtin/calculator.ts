import { z } from "zod";
import { Tool } from "../base.js";
import type { ToolContext } from "../types.js";

const CalculatorSchema = z.object({
  operation: z
    .enum(["add", "subtract", "multiply", "divide", "power", "sqrt", "abs"])
    .describe("The mathematical operation to perform"),
  a: z.number().describe("First operand"),
  b: z
    .number()
    .optional()
    .describe("Second operand (not required for sqrt and abs)"),
});

type CalculatorParams = z.input<typeof CalculatorSchema>;

interface CalculatorResult {
  result: number;
  operation: string;
  operands: number[];
}

export class CalculatorTool extends Tool<CalculatorParams, CalculatorResult> {
  readonly name = "calculator";
  readonly description =
    "Perform mathematical calculations. Supports: add, subtract, multiply, divide, power, sqrt (square root), abs (absolute value).";
  readonly schema = CalculatorSchema;

  execute(params: CalculatorParams, _context: ToolContext): CalculatorResult {
    const { operation, a, b } = params;
    let result: number;
    const operands: number[] = [a];

    switch (operation) {
      case "add":
        if (b === undefined)
          throw new Error("Second operand required for addition");
        result = a + b;
        operands.push(b);
        break;

      case "subtract":
        if (b === undefined)
          throw new Error("Second operand required for subtraction");
        result = a - b;
        operands.push(b);
        break;

      case "multiply":
        if (b === undefined)
          throw new Error("Second operand required for multiplication");
        result = a * b;
        operands.push(b);
        break;

      case "divide":
        if (b === undefined)
          throw new Error("Second operand required for division");
        if (b === 0) throw new Error("Division by zero");
        result = a / b;
        operands.push(b);
        break;

      case "power":
        if (b === undefined)
          throw new Error("Exponent required for power operation");
        result = a ** b;
        operands.push(b);
        break;

      case "sqrt":
        if (a < 0)
          throw new Error("Cannot calculate square root of negative number");
        result = Math.sqrt(a);
        break;

      case "abs":
        result = Math.abs(a);
        break;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    return {
      result,
      operation,
      operands,
    };
  }
}
