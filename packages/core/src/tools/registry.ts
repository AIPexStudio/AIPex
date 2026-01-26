import { type FunctionTool, tool as openAITool } from "@openai/agents";
import type { z } from "zod";

type AnyZodObject = z.ZodObject<any, any>;

export interface ToolExecutionContext {
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface ToolMetadata {
  category?: string;
  tags?: string[];
  permissions?: string[];
  visibility?: "public" | "private";
}

export interface UnifiedToolDefinition<
  TSchema extends AnyZodObject = AnyZodObject,
  TResult = unknown,
> {
  name: string;
  description: string;
  schema: TSchema;
  metadata?: ToolMetadata;
  handler: (
    input: z.infer<TSchema>,
    context?: ToolExecutionContext,
  ) => Promise<TResult> | TResult;
}

interface RegisteredTool {
  definition: UnifiedToolDefinition;
}

export class ToolRegistry {
  private tools = new Map<string, RegisteredTool>();

  register<TSchema extends AnyZodObject, TResult>(
    definition: UnifiedToolDefinition<TSchema, TResult>,
  ): () => void {
    if (this.tools.has(definition.name)) {
      throw new Error(`Tool ${definition.name} is already registered`);
    }
    this.tools.set(definition.name, { definition });
    return () => {
      this.tools.delete(definition.name);
    };
  }

  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  list(): UnifiedToolDefinition[] {
    return Array.from(this.tools.values()).map((item) => item.definition);
  }

  get(name: string): UnifiedToolDefinition | undefined {
    return this.tools.get(name)?.definition;
  }

  async execute(
    name: string,
    input: unknown,
    ctx: ToolExecutionContext = {},
  ): Promise<unknown> {
    const registered = this.tools.get(name);
    if (!registered) {
      throw new Error(`Tool ${name} has not been registered`);
    }

    const parsedInput = registered.definition.schema.parse(input);
    return await registered.definition.handler(parsedInput, ctx);
  }

  toOpenAIFunctions(): FunctionTool<unknown, AnyZodObject, unknown>[] {
    return this.list().map((definition) =>
      openAITool({
        name: definition.name,
        description: definition.description,
        parameters: definition.schema,
        execute: async ({ arguments: args }) => {
          const parsedArgs = definition.schema.parse(args);
          return definition.handler(parsedArgs, {});
        },
      }),
    );
  }
}
