import { z } from "zod";
export declare const loadSkillTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    name: z.ZodString;
}, z.core.$strip>, string>;
export declare const executeSkillScriptTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    skillName: z.ZodString;
    scriptPath: z.ZodString;
    args: z.ZodOptional<z.ZodNullable<z.ZodUnknown>>;
}, z.core.$strip>, string>;
export declare const readSkillReferenceTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    skillName: z.ZodString;
    refPath: z.ZodString;
}, z.core.$strip>, string>;
export declare const getSkillAssetTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    skillName: z.ZodString;
    assetPath: z.ZodString;
}, z.core.$strip>, string>;
export declare const listSkillsTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    enabledOnly: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
}, z.core.$strip>, string>;
export declare const getSkillInfoTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    skillName: z.ZodString;
}, z.core.$strip>, string>;
export declare const skillTools: readonly [import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    name: z.ZodString;
}, z.core.$strip>, string>, import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    skillName: z.ZodString;
    scriptPath: z.ZodString;
    args: z.ZodOptional<z.ZodNullable<z.ZodUnknown>>;
}, z.core.$strip>, string>, import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    skillName: z.ZodString;
    refPath: z.ZodString;
}, z.core.$strip>, string>, import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    skillName: z.ZodString;
    assetPath: z.ZodString;
}, z.core.$strip>, string>, import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    enabledOnly: z.ZodOptional<z.ZodNullable<z.ZodBoolean>>;
}, z.core.$strip>, string>, import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    skillName: z.ZodString;
}, z.core.$strip>, string>];
