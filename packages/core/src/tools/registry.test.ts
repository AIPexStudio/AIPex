import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ToolRegistry } from "./registry.js";

describe("ToolRegistry", () => {
  it("registers and executes tools", async () => {
    const registry = new ToolRegistry();
    const unregister = registry.register({
      name: "echo_tool",
      description: "Echo text back",
      schema: z.object({ text: z.string() }),
      handler: async ({ text }) => `echo:${text}`,
    });

    await expect(
      registry.execute("echo_tool", { text: "hello" }),
    ).resolves.toBe("echo:hello");

    unregister();
    await expect(
      registry.execute("echo_tool", { text: "hello" }),
    ).rejects.toThrow(/has not been registered/);
  });

  it("prevents duplicate registrations", () => {
    const registry = new ToolRegistry();
    registry.register({
      name: "duplicate",
      description: "first",
      schema: z.object({}),
      handler: () => "ok",
    });

    expect(() =>
      registry.register({
        name: "duplicate",
        description: "second",
        schema: z.object({}),
        handler: () => "fail",
      }),
    ).toThrow(/already registered/);
  });

  it("converts tools to OpenAI Function definitions", () => {
    const registry = new ToolRegistry();
    registry.register({
      name: "sum",
      description: "Add numbers",
      schema: z.object({ a: z.number(), b: z.number() }),
      handler: ({ a, b }) => a + b,
    });

    const functions = registry.toOpenAIFunctions();
    expect(functions).toHaveLength(1);
    expect(functions[0]?.name).toBe("sum");
    expect(functions[0]?.description).toContain("Add numbers");
  });
});
