import { z } from "zod";
export declare const captureScreenshotTool: import("@openai/agents").FunctionTool<
  unknown,
  z.ZodObject<
    {
      sendToLLM: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodBoolean>>>;
    },
    z.core.$strip
  >,
  string
>;
export declare const captureTabScreenshotTool: import("@openai/agents").FunctionTool<
  unknown,
  z.ZodObject<
    {
      tabId: z.ZodNumber;
      sendToLLM: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodBoolean>>>;
    },
    z.core.$strip
  >,
  string
>;
export declare const captureScreenshotToClipboardTool: import("@openai/agents").FunctionTool<
  unknown,
  z.ZodObject<{}, z.core.$strip>,
  string
>;
