import { tool } from "@aipexstudio/aipex-core";
import { z } from "zod";

interface ExtensionInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  enabled: boolean;
  permissions: string[];
  hostPermissions: string[];
}

/**
 * Get all installed extensions
 */
export async function getAllExtensions(): Promise<{
  success: boolean;
  extensions?: ExtensionInfo[];
  error?: string;
}> {
  try {
    if (!chrome.management) {
      return {
        success: false,
        error:
          "Management permission not available. Please check extension permissions.",
      };
    }

    const extensions = await chrome.management.getAll();

    const extensionData = extensions.map((ext) => ({
      id: ext.id,
      name: ext.name,
      version: ext.version,
      description: ext.description || "",
      enabled: ext.enabled,
      permissions: ext.permissions || [],
      hostPermissions: ext.hostPermissions || [],
    }));

    return { success: true, extensions: extensionData };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get extension by ID
 */
export async function getExtension(extensionId: string): Promise<{
  success: boolean;
  extension?: ExtensionInfo;
  error?: string;
}> {
  try {
    if (!chrome.management) {
      return {
        success: false,
        error:
          "Management permission not available. Please check extension permissions.",
      };
    }

    const extension = await chrome.management.get(extensionId);

    return {
      success: true,
      extension: {
        id: extension.id,
        name: extension.name,
        version: extension.version,
        description: extension.description || "",
        enabled: extension.enabled,
        permissions: extension.permissions || [],
        hostPermissions: extension.hostPermissions || [],
      },
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Enable/disable extension
 */
export async function setExtensionEnabled(
  extensionId: string,
  enabled: boolean,
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (!chrome.management) {
      return {
        success: false,
        error:
          "Management permission not available. Please check extension permissions.",
      };
    }

    await chrome.management.setEnabled(extensionId, enabled);
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Uninstall extension
 */
export async function uninstallExtension(extensionId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (!chrome.management) {
      return {
        success: false,
        error:
          "Management permission not available. Please check extension permissions.",
      };
    }

    await chrome.management.uninstall(extensionId);
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export const getAllExtensionsTool = tool({
  name: "get_all_extensions",
  description: "Get all installed extensions",
  parameters: z.object({}),
  execute: async () => {
    return await getAllExtensions();
  },
});

export const getExtensionTool = tool({
  name: "get_extension",
  description: "Get extension by ID",
  parameters: z.object({
    extensionId: z.string().describe("ID of the extension"),
  }),
  execute: async ({ extensionId }) => {
    return await getExtension(extensionId);
  },
});

export const setExtensionEnabledTool = tool({
  name: "set_extension_enabled",
  description: "Enable or disable an extension",
  parameters: z.object({
    extensionId: z.string().describe("ID of the extension"),
    enabled: z.boolean().describe("Whether to enable or disable the extension"),
  }),
  execute: async ({ extensionId, enabled }) => {
    return await setExtensionEnabled(extensionId, enabled);
  },
});

export const uninstallExtensionTool = tool({
  name: "uninstall_extension",
  description: "Uninstall an extension",
  parameters: z.object({
    extensionId: z.string().describe("ID of the extension to uninstall"),
  }),
  execute: async ({ extensionId }) => {
    return await uninstallExtension(extensionId);
  },
});
