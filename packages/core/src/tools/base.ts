import type { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";
import type { FunctionDeclaration } from "../llm/types.js";
import type { ToolContext, ToolResult } from "./types.js";

export abstract class Tool<TParams = unknown, TResult = unknown> {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly schema: z.ZodType<TParams>;

  validate(params: unknown): TParams {
    return this.schema.parse(params);
  }

  abstract execute(
    params: TParams,
    context: ToolContext,
  ): Promise<TResult> | TResult;

  toFunctionDeclaration(): FunctionDeclaration {
    const jsonSchema = zodToJsonSchema(this.schema, {
      name: this.name,
      $refStrategy: "none",
    });

    // Extract the actual schema (remove the root wrapper)
    const parameters =
      typeof jsonSchema === "object" && jsonSchema !== null
        ? (jsonSchema as Record<string, unknown>)
        : {};

    return {
      name: this.name,
      description: this.description,
      parameters,
    };
  }

  async executeWithResult(
    params: unknown,
    context: ToolContext,
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      const validatedParams = this.validate(params);
      const result = await this.execute(validatedParams, context);

      return {
        success: true,
        data: result,
        metadata: {
          duration: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.constructor.name : "Unknown",
        metadata: {
          duration: Date.now() - startTime,
        },
      };
    }
  }
}
