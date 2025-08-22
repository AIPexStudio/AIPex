/**
 * Get all installed extensions
 */
export async function getAllExtensions(): Promise<{
  success: boolean
  extensions?: Array<{
    id: string
    name: string
    version: string
    description: string
    enabled: boolean
    permissions: string[]
    hostPermissions: string[]
  }>
  error?: string
}> {
  try {
    // Check if management permission is available
    if (!chrome.management) {
      return { 
        success: false, 
        error: "Management permission not available. Please check extension permissions." 
      }
    }

    const extensions = await chrome.management.getAll()
    
    const extensionData = extensions.map(ext => ({
      id: ext.id,
      name: ext.name,
      version: ext.version,
      description: ext.description || "",
      enabled: ext.enabled,
      permissions: ext.permissions || [],
      hostPermissions: ext.hostPermissions || []
    }))
    
    return { success: true, extensions: extensionData }
  } catch (error: any) {
    console.error("Error in getAllExtensions:", error)
    return { 
      success: false, 
      error: error?.message || String(error) || "Failed to get extensions. Check if management permission is granted."
    }
  }
}

/**
 * Get extension by ID
 */
export async function getExtension(extensionId: string): Promise<{
  success: boolean
  extension?: {
    id: string
    name: string
    version: string
    description: string
    enabled: boolean
    permissions: string[]
    hostPermissions: string[]
  }
  error?: string
}> {
  try {
    // Check if management permission is available
    if (!chrome.management) {
      return { 
        success: false, 
        error: "Management permission not available. Please check extension permissions." 
      }
    }

    const extension = await chrome.management.get(extensionId)
    
    return {
      success: true,
      extension: {
        id: extension.id,
        name: extension.name,
        version: extension.version,
        description: extension.description || "",
        enabled: extension.enabled,
        permissions: extension.permissions || [],
        hostPermissions: extension.hostPermissions || []
      }
    }
  } catch (error: any) {
    console.error("Error in getExtension:", error)
    return { 
      success: false, 
      error: error?.message || String(error) || "Failed to get extension. Check if management permission is granted."
    }
  }
}

/**
 * Enable/disable extension
 */
export async function setExtensionEnabled(extensionId: string, enabled: boolean): Promise<{
  success: boolean
  error?: string
}> {
  try {
    // Check if management permission is available
    if (!chrome.management) {
      return { 
        success: false, 
        error: "Management permission not available. Please check extension permissions." 
      }
    }

    await chrome.management.setEnabled(extensionId, enabled)
    return { success: true }
  } catch (error: any) {
    console.error("Error in setExtensionEnabled:", error)
    return { 
      success: false, 
      error: error?.message || String(error) || "Failed to set extension enabled. Check if management permission is granted."
    }
  }
}

/**
 * Uninstall extension
 */
export async function uninstallExtension(extensionId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    // Check if management permission is available
    if (!chrome.management) {
      return { 
        success: false, 
        error: "Management permission not available. Please check extension permissions." 
      }
    }

    await chrome.management.uninstall(extensionId)
    return { success: true }
  } catch (error: any) {
    console.error("Error in uninstallExtension:", error)
    return { 
      success: false, 
      error: error?.message || String(error) || "Failed to uninstall extension. Check if management permission is granted."
    }
  }
}

/**
 * Get extension permissions
 */
export async function getExtensionPermissions(extensionId: string): Promise<{
  success: boolean
  permissions?: {
    permissions: string[]
    hostPermissions: string[]
  }
  error?: string
}> {
  try {
    // Check if management permission is available
    if (!chrome.management) {
      return { 
        success: false, 
        error: "Management permission not available. Please check extension permissions." 
      }
    }

    const permissions = await chrome.management.getPermissionWarningsById(extensionId)
    const extension = await chrome.management.get(extensionId)
    
    return {
      success: true,
      permissions: {
        permissions: extension.permissions || [],
        hostPermissions: extension.hostPermissions || []
      }
    }
  } catch (error: any) {
    console.error("Error in getExtensionPermissions:", error)
    return { 
      success: false, 
      error: error?.message || String(error) || "Failed to get extension permissions. Check if management permission is granted."
    }
  }
}
