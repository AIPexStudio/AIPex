import { z } from "zod";
import { Tool } from "../base.js";
import type { ToolContext } from "../types.js";

const JsonTransformSchema = z.object({
  data: z.string().describe("JSON string to transform"),
  operation: z
    .enum(["parse", "stringify", "query", "merge", "filter"])
    .describe("The operation to perform"),
  path: z
    .string()
    .optional()
    .describe("JSONPath-like string for query operation (e.g., 'user.name')"),
  mergeWith: z
    .string()
    .optional()
    .describe("JSON string to merge with for merge operation"),
  filterKey: z
    .string()
    .optional()
    .describe("Key to filter by for filter operation"),
  filterValue: z
    .union([z.string(), z.number(), z.boolean()])
    .optional()
    .describe("Value to filter by for filter operation"),
});

type JsonTransformParams = z.input<typeof JsonTransformSchema>;

interface JsonTransformResult {
  success: boolean;
  result: unknown;
  operation: string;
}

export class JsonTransformTool extends Tool<
  JsonTransformParams,
  JsonTransformResult
> {
  readonly name = "json_transform";
  readonly description =
    "Transform and manipulate JSON data. Supports: parse, stringify, query (extract nested values), merge (combine objects), filter (filter arrays).";
  readonly schema = JsonTransformSchema;

  execute(
    params: JsonTransformParams,
    _context: ToolContext,
  ): JsonTransformResult {
    const { data, operation, path, mergeWith, filterKey, filterValue } = params;

    try {
      let result: unknown;

      switch (operation) {
        case "parse": {
          result = JSON.parse(data);
          break;
        }

        case "stringify": {
          const parsed = JSON.parse(data);
          result = JSON.stringify(parsed, null, 2);
          break;
        }

        case "query": {
          if (!path) throw new Error("Path is required for query operation");
          const parsed = JSON.parse(data);
          result = this.queryPath(parsed, path);
          break;
        }

        case "merge": {
          if (!mergeWith)
            throw new Error("mergeWith is required for merge operation");
          const parsed1 = JSON.parse(data);
          const parsed2 = JSON.parse(mergeWith);
          result = this.deepMerge(parsed1, parsed2);
          break;
        }

        case "filter": {
          if (!filterKey)
            throw new Error("filterKey is required for filter operation");
          const parsed = JSON.parse(data);
          if (!Array.isArray(parsed)) {
            throw new Error("Data must be an array for filter operation");
          }
          result = parsed.filter((item) => {
            if (typeof item !== "object" || item === null) return false;
            return item[filterKey] === filterValue;
          });
          break;
        }

        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      return {
        success: true,
        result,
        operation,
      };
    } catch (error) {
      return {
        success: false,
        result: error instanceof Error ? error.message : String(error),
        operation,
      };
    }
  }

  private queryPath(obj: unknown, path: string): unknown {
    const parts = path.split(".");
    let current: any = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }

      // Handle array index access
      const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, key, index] = arrayMatch;
        current = current[key];
        if (Array.isArray(current)) {
          current = current[Number.parseInt(index, 10)];
        } else {
          return undefined;
        }
      } else {
        current = current[part];
      }
    }

    return current;
  }

  private deepMerge(target: any, source: any): any {
    if (typeof target !== "object" || typeof source !== "object") {
      return source;
    }

    const result = { ...target };

    for (const key in source) {
      if (Object.hasOwn(source, key)) {
        if (
          typeof source[key] === "object" &&
          source[key] !== null &&
          !Array.isArray(source[key])
        ) {
          result[key] = this.deepMerge(result[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }

    return result;
  }
}
