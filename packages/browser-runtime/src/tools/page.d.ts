import { z } from "zod";
/**
 * Get page metadata including title, description, keywords, etc.
 */
export declare const getPageMetadataTool: import("@openai/agents").FunctionTool<
  unknown,
  z.ZodObject<{}, z.core.$strip>,
  string
>;
/**
 * Scroll to a DOM element and center it in the viewport
 */
export declare const scrollToElementTool: import("@openai/agents").FunctionTool<
  unknown,
  z.ZodObject<
    {
      selector: z.ZodString;
    },
    z.core.$strip
  >,
  string
>;
/**
 * Permanently highlight DOM elements with drop shadow effect
 */
export declare const highlightElementTool: import("@openai/agents").FunctionTool<
  unknown,
  z.ZodObject<
    {
      selector: z.ZodString;
      color: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      duration: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
      intensity: z.ZodOptional<
        z.ZodNullable<
          z.ZodEnum<{
            strong: "strong";
            normal: "normal";
            subtle: "subtle";
          }>
        >
      >;
      persist: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    },
    z.core.$strip
  >,
  string
>;
/**
 * Highlight specific words or phrases within text content using inline styling
 */
export declare const highlightTextInlineTool: import("@openai/agents").FunctionTool<
  unknown,
  z.ZodObject<
    {
      selector: z.ZodString;
      searchText: z.ZodString;
      caseSensitive: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
      wholeWords: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
      highlightColor: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      backgroundColor: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      fontWeight: z.ZodOptional<z.ZodNullable<z.ZodString>>;
      persist: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
    },
    z.core.$strip
  >,
  string
>;
