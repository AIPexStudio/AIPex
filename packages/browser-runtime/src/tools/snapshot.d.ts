import { z } from "zod";
export declare const takeSnapshotTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{}, z.core.$strip>, string>;
export declare const searchElementsTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    tabId: z.ZodNumber;
    query: z.ZodString;
    contextLevels: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>, string>;
