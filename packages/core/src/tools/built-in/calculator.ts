import { z } from "zod";
import { tool } from "../index.js";

const calculatorParameters = z.object({
  operation: z
    .enum(["add", "subtract", "multiply", "divide"])
    .describe("The operation to perform"),
  a: z.number().describe("First number"),
  b: z.number().describe("Second number"),
});

type CalculatorInput = z.infer<typeof calculatorParameters>;

export const calculatorTool = tool({
  name: "calculator",
  description: "Perform basic arithmetic operations",
  parameters: calculatorParameters,
  execute: async (input: CalculatorInput) => {
    switch (input.operation) {
      case "add":
        return input.a + input.b;
      case "subtract":
        return input.a - input.b;
      case "multiply":
        return input.a * input.b;
      case "divide":
        if (input.b === 0) {
          throw new Error("Division by zero");
        }
        return input.a / input.b;
      default:
        throw new Error(`Unknown operation: ${input.operation}`);
    }
  },
});
