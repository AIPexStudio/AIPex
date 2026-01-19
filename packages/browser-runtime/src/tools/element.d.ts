import { z } from "zod";
export declare const clickTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    tabId: z.ZodNumber;
    uid: z.ZodString;
    dblClick: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>, string>;
export declare const fillElementByUidTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    tabId: z.ZodNumber;
    uid: z.ZodString;
    value: z.ZodString;
}, z.core.$strip>, string>;
export declare const hoverElementByUidTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    tabId: z.ZodNumber;
    uid: z.ZodString;
}, z.core.$strip>, string>;
export declare const getEditorValueTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    tabId: z.ZodNumber;
    uid: z.ZodString;
}, z.core.$strip>, string>;
export declare const fillFormTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    tabId: z.ZodNumber;
    elements: z.ZodArray<z.ZodObject<{
        uid: z.ZodString;
        value: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>, string>;
