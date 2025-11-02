import type { FunctionDeclaration } from "../llm/types.js";
import { ErrorCode, ToolError, ToolTimeoutError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";
import type { Tool } from "./base.js";
import { ToolMonitor } from "./monitor.js";
import type { ToolContext, ToolResult } from "./types.js";

export class ToolRegistry {
  private tools = new Map<string, Tool>();
  private monitor = new ToolMonitor();

  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      logger.warn(`Tool ${tool.name} already registered, overwriting`);
    }

    this.tools.set(tool.name, tool);
    logger.info(`Tool registered: ${tool.name}`);
  }

  unregister(toolName: string): boolean {
    return this.tools.delete(toolName);
  }

  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  getAllDeclarations(): FunctionDeclaration[] {
    return Array.from(this.tools.values()).map((tool) =>
      tool.toFunctionDeclaration(),
    );
  }

  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  async execute(
    toolName: string,
    params: unknown,
    context: ToolContext,
  ): Promise<ToolResult> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new ToolError(
        `Tool not found: ${toolName}`,
        ErrorCode.TOOL_NOT_FOUND,
        toolName,
        false,
      );
    }

    const startTime = Date.now();

    try {
      logger.debug(`Executing tool: ${toolName}`, { params });

      // Execute with timeout if specified
      const result = context.timeoutMs
        ? await this.executeWithTimeout(tool, params, context)
        : await tool.executeWithResult(params, context);

      const duration = Date.now() - startTime;
      this.monitor.recordCall(toolName, result.success, duration);

      logger.debug(`Tool execution completed: ${toolName}`, {
        success: result.success,
        duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.monitor.recordCall(toolName, false, duration);

      if (error instanceof ToolError) {
        throw error;
      }

      throw new ToolError(
        error instanceof Error ? error.message : String(error),
        ErrorCode.TOOL_EXECUTION_ERROR,
        toolName,
        true,
      );
    }
  }

  private async executeWithTimeout(
    tool: Tool,
    params: unknown,
    context: ToolContext,
  ): Promise<ToolResult> {
    return new Promise((resolve, reject) => {
      const timeoutMs = context.timeoutMs ?? 30000; // Default to 30 seconds
      const timeoutId = setTimeout(() => {
        reject(new ToolTimeoutError(tool.name, timeoutMs));
      }, timeoutMs);

      tool
        .executeWithResult(params, context)
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  getMetrics(toolName?: string) {
    return this.monitor.getMetrics(toolName);
  }

  clearMetrics(toolName?: string): void {
    this.monitor.clear(toolName);
  }
}
