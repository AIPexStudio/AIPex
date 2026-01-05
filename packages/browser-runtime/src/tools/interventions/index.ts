/**
 * Intervention MCP Tools
 *
 * Exposes intervention capabilities to AI as MCP tools:
 * - list_interventions: List available interventions
 * - get_intervention_info: Get detailed information
 * - request_intervention: Request intervention execution
 * - cancel_intervention: Cancel current intervention
 */

import { tool } from "@aipexstudio/aipex-core";
import { z } from "zod";
import { interventionManager } from "../../intervention/intervention-manager.js";
import { interventionRegistry } from "../../intervention/intervention-registry.js";
import type { InterventionType } from "../../intervention/types.js";

/**
 * List all available interventions
 */
export const listInterventionsTool = tool({
  name: "list_interventions",
  description:
    "List all available human intervention types. Use this to discover what interventions the AI can request from the user.",
  parameters: z.object({
    enabledOnly: z
      .boolean()
      .default(false)
      .describe("Only list enabled interventions (default: false)"),
  }),
  execute: async ({ enabledOnly }) => {
    try {
      // Check intervention mode
      const currentMode = interventionManager.getConversationMode();
      if (currentMode === "disabled") {
        return {
          success: false,
          error: "🚫 Human intervention features are disabled",
          message:
            "Current conversation settings do not allow any human intervention features. User has explicitly forbidden AI from requesting interventions.",
        };
      }

      // Ensure initialized
      if (!interventionRegistry.isInitialized()) {
        await interventionRegistry.initialize();
      }

      const metadataList = interventionRegistry.getAllMetadata(enabledOnly);

      return {
        success: true,
        interventions: metadataList.map((m) => ({
          name: m.name,
          type: m.type,
          description: m.description,
          enabled: m.enabled,
        })),
        count: metadataList.length,
        message: `Found ${metadataList.length} intervention(s). Current mode: ${currentMode}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

/**
 * Get detailed information about a specific intervention
 */
export const getInterventionInfoTool = tool({
  name: "get_intervention_info",
  description:
    "Get detailed information about a specific intervention type, including input/output schemas and examples.",
  parameters: z.object({
    type: z
      .enum(["monitor-operation", "voice-input", "user-selection"])
      .describe(
        "Intervention type (monitor-operation, voice-input, user-selection)",
      ),
  }),
  execute: async ({ type }) => {
    try {
      // Check intervention mode
      const currentMode = interventionManager.getConversationMode();
      if (currentMode === "disabled") {
        return {
          success: false,
          error: "🚫 Human intervention features are disabled",
          message:
            "Current conversation settings do not allow any human intervention features. User has explicitly forbidden AI from requesting interventions.",
        };
      }

      // Ensure initialized
      if (!interventionRegistry.isInitialized()) {
        await interventionRegistry.initialize();
      }

      const metadata = interventionRegistry.getMetadata(
        type as InterventionType,
      );

      if (!metadata) {
        return {
          success: false,
          error: `Intervention '${type}' not found`,
        };
      }

      return {
        success: true,
        intervention: {
          name: metadata.name,
          type: metadata.type,
          description: metadata.description,
          enabled: metadata.enabled,
          inputSchema: metadata.inputSchema,
          outputSchema: metadata.outputSchema,
          examples: metadata.examples,
        },
        message: `Intervention '${type}' information retrieved successfully. Current mode: ${currentMode}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

/**
 * Request intervention execution
 */
export const requestInterventionTool = tool({
  name: "request_intervention",
  description:
    "Request a human intervention. This will pause AI execution and wait for user input. Use this when you need the user to perform an action or provide information that cannot be obtained programmatically.",
  parameters: z.object({
    type: z
      .enum(["monitor-operation", "voice-input", "user-selection"])
      .describe(
        "Intervention type (monitor-operation, voice-input, user-selection)",
      ),
    params: z
      .record(z.string(), z.unknown())
      .nullable()
      .default({})
      .describe(
        "Intervention-specific parameters. See get_intervention_info for details.",
      ),
    timeout: z
      .number()
      .default(300)
      .describe("Timeout in seconds (default: 300)"),
    reason: z
      .string()
      .nullable()
      .default("")
      .describe("Explain to the user why this intervention is needed"),
  }),
  execute: async ({ type, params, timeout, reason }) => {
    try {
      // Ensure initialized
      if (!interventionManager.isInitialized()) {
        await interventionManager.initialize();
      }

      console.log(`[MCP] Requesting intervention: ${type}`);

      // Check current conversation intervention mode
      const currentMode = interventionManager.getConversationMode();
      if (currentMode === "disabled") {
        return {
          success: false,
          error: "🚫 Human intervention features are disabled",
          message:
            "Current conversation settings do not allow any human intervention features. User has explicitly forbidden AI from requesting interventions. Please do not try to call any intervention tools.",
          status: "cancelled",
        };
      }

      // Execute intervention
      const result = await interventionManager.requestIntervention(
        type as InterventionType,
        params && Object.keys(params).length > 0 ? params : undefined,
        timeout,
        reason || undefined,
      );

      if (result.success) {
        return {
          success: true,
          result: result.data,
          status: result.status,
          duration: result.duration,
          message: `Intervention completed successfully`,
        };
      }
      return {
        success: false,
        error: result.error,
        status: result.status,
        duration: result.duration,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        status: "error",
      };
    }
  },
});

/**
 * Cancel current intervention
 */
export const cancelInterventionTool = tool({
  name: "cancel_intervention",
  description:
    "Cancel the currently active intervention. Use this if you realize the intervention is no longer needed.",
  parameters: z.object({
    id: z
      .string()
      .nullable()
      .default(null)
      .describe(
        "Intervention ID (optional, will cancel current if not provided)",
      ),
  }),
  execute: async ({ id }) => {
    try {
      // Ensure initialized
      if (!interventionManager.isInitialized()) {
        await interventionManager.initialize();
      }

      const currentIntervention = interventionManager.getCurrentIntervention();

      if (!currentIntervention) {
        return {
          success: false,
          error: "No intervention is currently active",
        };
      }

      // If ID is provided and not null, verify it matches
      if (id !== null && id && currentIntervention.request.id !== id) {
        return {
          success: false,
          error: `Intervention ID mismatch: expected ${id}, but current is ${currentIntervention.request.id}`,
        };
      }

      const cancelled = interventionManager.cancelIntervention(
        currentIntervention.request.id,
      );

      if (cancelled) {
        return {
          success: true,
          message: "Intervention cancelled successfully",
        };
      }
      return {
        success: false,
        error: "Failed to cancel intervention",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

/**
 * All intervention tools
 */
export const interventionTools = [
  listInterventionsTool,
  getInterventionInfoTool,
  requestInterventionTool,
  cancelInterventionTool,
];
