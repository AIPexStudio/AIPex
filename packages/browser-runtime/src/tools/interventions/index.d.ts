/**
 * Intervention MCP Tools
 *
 * Exposes intervention capabilities to AI as MCP tools:
 * - list_interventions: List available interventions
 * - get_intervention_info: Get detailed information
 * - request_intervention: Request intervention execution
 * - cancel_intervention: Cancel current intervention
 */
import { z } from "zod";
/**
 * List all available interventions
 */
export declare const listInterventionsTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    enabledOnly: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>, string>;
/**
 * Get detailed information about a specific intervention
 */
export declare const getInterventionInfoTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    type: z.ZodEnum<{
        "monitor-operation": "monitor-operation";
        "voice-input": "voice-input";
        "user-selection": "user-selection";
    }>;
}, z.core.$strip>, string>;
/**
 * Request intervention execution
 */
export declare const requestInterventionTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    type: z.ZodEnum<{
        "monitor-operation": "monitor-operation";
        "voice-input": "voice-input";
        "user-selection": "user-selection";
    }>;
    params: z.ZodDefault<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    timeout: z.ZodDefault<z.ZodNumber>;
    reason: z.ZodDefault<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>, string>;
/**
 * Cancel current intervention
 */
export declare const cancelInterventionTool: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    id: z.ZodDefault<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>, string>;
/**
 * All intervention tools
 */
export declare const interventionTools: import("@openai/agents").FunctionTool<unknown, z.ZodObject<{
    enabledOnly: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>, string>[];
