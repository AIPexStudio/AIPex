export type McpToolName =
  | "get_all_tabs"
  | "get_current_tab"
  | "switch_to_tab"
  | "organize_tabs"
  | "ungroup_tabs"
  | "get_current_tab_content"
  | "create_new_tab"

export type McpRequest =
  | { tool: "get_all_tabs" }
  | { tool: "get_current_tab" }
  | { tool: "switch_to_tab"; args: { tabId: number } }
  | { tool: "organize_tabs" }
  | { tool: "ungroup_tabs" }
  | { tool: "get_current_tab_content" }
  | { tool: "create_new_tab"; args: { url: string } }

export type McpResponse =
  | { success: true; data?: any }
  | { success: false; error: string }

// Direct in-process MCP client: call exported server functions instead of messaging
import {
  getAllTabs,
  getCurrentTab,
  switchToTab,
  groupTabsByAI,
  ungroupAllTabs,
  getCurrentTabContent,
  createNewTab
} from "~mcp-servers"

export async function callMcpTool(request: McpRequest): Promise<McpResponse> {
  try {
    switch (request.tool) {
      case "get_all_tabs": {
        const tabs = await getAllTabs()
        return { success: true, data: tabs }
      }
      case "get_current_tab": {
        const tab = await getCurrentTab()
        return { success: true, data: tab }
      }
      case "switch_to_tab": {
        const tabId = request.args?.tabId
        if (!Number.isFinite(tabId)) return { success: false, error: "Invalid tabId" }
        await switchToTab(tabId)
        return { success: true }
      }
      case "organize_tabs": {
        await groupTabsByAI()
        return { success: true }
      }
      case "ungroup_tabs": {
        await ungroupAllTabs()
        return { success: true }
      }
      case "get_current_tab_content": {
        const content = await getCurrentTabContent()
        return { success: true, data: content }
      }
      case "create_new_tab": {
        const url = request.args?.url
        if (typeof url !== "string" || url.trim().length === 0) {
          return { success: false, error: "Invalid url" }
        }
        const data = await createNewTab(url)
        return { success: true, data }
      }
      default:
        return { success: false, error: "Unsupported tool" }
    }
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) }
  }
}


