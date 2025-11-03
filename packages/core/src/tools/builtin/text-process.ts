import { z } from "zod";
import { Tool } from "../base.js";
import type { ToolContext } from "../types.js";

const TextProcessSchema = z.object({
  text: z.string().describe("The text to process"),
  operation: z
    .enum([
      "uppercase",
      "lowercase",
      "trim",
      "reverse",
      "word_count",
      "char_count",
      "split",
      "replace",
      "substring",
    ])
    .describe("The text processing operation to perform"),
  delimiter: z
    .string()
    .optional()
    .describe("Delimiter for split operation (default: space)"),
  searchValue: z
    .string()
    .optional()
    .describe("Value to search for in replace operation"),
  replaceValue: z
    .string()
    .optional()
    .describe("Value to replace with in replace operation"),
  start: z.number().optional().describe("Start index for substring operation"),
  end: z.number().optional().describe("End index for substring operation"),
});

type TextProcessParams = z.input<typeof TextProcessSchema>;

interface TextProcessResult {
  result: string | number | string[];
  operation: string;
  originalLength: number;
}

export class TextProcessTool extends Tool<
  TextProcessParams,
  TextProcessResult
> {
  readonly name = "text_process";
  readonly description =
    "Process and manipulate text. Supports: uppercase, lowercase, trim, reverse, word_count, char_count, split, replace, substring.";
  readonly schema = TextProcessSchema;

  execute(params: TextProcessParams, _context: ToolContext): TextProcessResult {
    const {
      text,
      operation,
      delimiter,
      searchValue,
      replaceValue,
      start,
      end,
    } = params;
    const originalLength = text.length;
    let result: string | number | string[];

    switch (operation) {
      case "uppercase":
        result = text.toUpperCase();
        break;

      case "lowercase":
        result = text.toLowerCase();
        break;

      case "trim":
        result = text.trim();
        break;

      case "reverse":
        result = text.split("").reverse().join("");
        break;

      case "word_count":
        result = text
          .trim()
          .split(/\s+/)
          .filter((word) => word.length > 0).length;
        break;

      case "char_count":
        result = text.length;
        break;

      case "split":
        result = text.split(delimiter || " ");
        break;

      case "replace":
        if (searchValue === undefined) {
          throw new Error("searchValue is required for replace operation");
        }
        result = text.replace(
          new RegExp(this.escapeRegex(searchValue), "g"),
          replaceValue || "",
        );
        break;

      case "substring":
        if (start === undefined) {
          throw new Error("start index is required for substring operation");
        }
        result = text.substring(start, end);
        break;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    return {
      result,
      operation,
      originalLength,
    };
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
