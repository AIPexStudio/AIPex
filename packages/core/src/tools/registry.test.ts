import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { ErrorCode, ToolError } from "../utils/errors.js";
import { Tool } from "./base.js";
import { ToolRegistry } from "./registry.js";
import type { ToolContext } from "./types.js";

class SimpleTool extends Tool<{ value: number }, number> {
  readonly name = "simple_tool";
  readonly description = "A simple test tool";
  readonly schema = z.object({ value: z.number() });

  execute(params: { value: number }): number {
    return params.value * 2;
  }
}

class SlowTool extends Tool<{ delay: number }, string> {
  readonly name = "slow_tool";
  readonly description = "A slow tool";
  readonly schema = z.object({ delay: z.number() });

  async execute(params: { delay: number }): Promise<string> {
    await new Promise((resolve) => setTimeout(resolve, params.delay));
    return "done";
  }
}

describe("ToolRegistry", () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  describe("register", () => {
    it("should register a tool", () => {
      const tool = new SimpleTool();
      registry.register(tool);

      expect(registry.getTool("simple_tool")).toBe(tool);
    });

    it("should overwrite existing tool", () => {
      const tool1 = new SimpleTool();
      const tool2 = new SimpleTool();

      registry.register(tool1);
      registry.register(tool2);

      expect(registry.getTool("simple_tool")).toBe(tool2);
    });
  });

  describe("unregister", () => {
    it("should unregister a tool", () => {
      const tool = new SimpleTool();
      registry.register(tool);

      const result = registry.unregister("simple_tool");

      expect(result).toBe(true);
      expect(registry.getTool("simple_tool")).toBeUndefined();
    });

    it("should return false for non-existent tool", () => {
      const result = registry.unregister("non_existent");
      expect(result).toBe(false);
    });
  });

  describe("getAllDeclarations", () => {
    it("should return function declarations for all tools", () => {
      registry.register(new SimpleTool());
      registry.register(new SlowTool());

      const declarations = registry.getAllDeclarations();

      expect(declarations).toHaveLength(2);
      expect(declarations[0].name).toBe("simple_tool");
      expect(declarations[1].name).toBe("slow_tool");
    });

    it("should return empty array when no tools registered", () => {
      const declarations = registry.getAllDeclarations();
      expect(declarations).toEqual([]);
    });
  });

  describe("getToolNames", () => {
    it("should return all tool names", () => {
      registry.register(new SimpleTool());
      registry.register(new SlowTool());

      const names = registry.getToolNames();

      expect(names).toEqual(["simple_tool", "slow_tool"]);
    });
  });

  describe("execute", () => {
    it("should execute a tool successfully", async () => {
      registry.register(new SimpleTool());

      const context: ToolContext = {
        callId: "call-1",
        sessionId: "session-1",
        turnId: "turn-1",
      };

      const result = await registry.execute(
        "simple_tool",
        { value: 5 },
        context,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(10);
    });

    it("should throw ToolError for non-existent tool", async () => {
      const context: ToolContext = {
        callId: "call-1",
        sessionId: "session-1",
        turnId: "turn-1",
      };

      await expect(
        registry.execute("non_existent", {}, context),
      ).rejects.toThrow(ToolError);

      try {
        await registry.execute("non_existent", {}, context);
      } catch (error) {
        expect(error).toBeInstanceOf(ToolError);
        expect((error as ToolError).code).toBe(ErrorCode.TOOL_NOT_FOUND);
      }
    });

    it("should handle execution timeout", async () => {
      registry.register(new SlowTool());

      const context: ToolContext = {
        callId: "call-1",
        sessionId: "session-1",
        turnId: "turn-1",
        timeoutMs: 100,
      };

      await expect(
        registry.execute("slow_tool", { delay: 500 }, context),
      ).rejects.toThrow();
    });

    it("should record metrics after execution", async () => {
      registry.register(new SimpleTool());

      const context: ToolContext = {
        callId: "call-1",
        sessionId: "session-1",
        turnId: "turn-1",
      };

      await registry.execute("simple_tool", { value: 5 }, context);

      const metrics = registry.getMetrics("simple_tool");

      expect(metrics).toHaveLength(1);
      expect(metrics[0].toolName).toBe("simple_tool");
      expect(metrics[0].totalCalls).toBe(1);
      expect(metrics[0].successCount).toBe(1);
    });
  });

  describe("getMetrics", () => {
    it("should return metrics for specific tool", async () => {
      registry.register(new SimpleTool());

      const context: ToolContext = {
        callId: "call-1",
        sessionId: "session-1",
        turnId: "turn-1",
      };

      await registry.execute("simple_tool", { value: 5 }, context);
      await registry.execute("simple_tool", { value: 10 }, context);

      const metrics = registry.getMetrics("simple_tool");

      expect(metrics).toHaveLength(1);
      expect(metrics[0].totalCalls).toBe(2);
      expect(metrics[0].successCount).toBe(2);
    });

    it("should return metrics for all tools", async () => {
      registry.register(new SimpleTool());
      registry.register(new SlowTool());

      const context: ToolContext = {
        callId: "call-1",
        sessionId: "session-1",
        turnId: "turn-1",
      };

      await registry.execute("simple_tool", { value: 5 }, context);
      await registry.execute("slow_tool", { delay: 10 }, context);

      const metrics = registry.getMetrics();

      expect(metrics).toHaveLength(2);
    });
  });

  describe("clearMetrics", () => {
    it("should clear metrics for specific tool", async () => {
      registry.register(new SimpleTool());

      const context: ToolContext = {
        callId: "call-1",
        sessionId: "session-1",
        turnId: "turn-1",
      };

      await registry.execute("simple_tool", { value: 5 }, context);
      registry.clearMetrics("simple_tool");

      const metrics = registry.getMetrics("simple_tool");
      expect(metrics).toEqual([]);
    });

    it("should clear all metrics", async () => {
      registry.register(new SimpleTool());
      registry.register(new SlowTool());

      const context: ToolContext = {
        callId: "call-1",
        sessionId: "session-1",
        turnId: "turn-1",
      };

      await registry.execute("simple_tool", { value: 5 }, context);
      await registry.execute("slow_tool", { delay: 10 }, context);

      registry.clearMetrics();

      const metrics = registry.getMetrics();
      expect(metrics).toEqual([]);
    });
  });
});
