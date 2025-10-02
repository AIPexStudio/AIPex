import { browserMcpClient } from "~/mcp/client"

export interface ToolMetadata {
  name: string
  description: string
  category: string
  inputSchema: any
  examples?: string[]
}

export interface ToolCategory {
  name: string
  description: string
  tools: ToolMetadata[]
}

export interface AITool {
  type: "function"
  function: {
    name: string
    description: string
    parameters: any
  }
}

export class ToolRegistry {
  private static instance: ToolRegistry
  private tools: Map<string, ToolMetadata> = new Map()
  private categories: Map<string, ToolCategory> = new Map()
  private initialized = false

  private constructor() { }

  public static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry()
    }
    return ToolRegistry.instance
  }

  private initializeTools(): void {
    if (this.initialized) return

    try {
      // Get all tools from MCP client
      const mcpTools = browserMcpClient.tools

      // Define tool categories and their descriptions
      const categoryDefinitions: Record<string, { description: string, tools: string[] }> = {
        "Tab Management": {
          description: "Manage browser tabs, switch between them, and get tab information",
          tools: [
            "get_all_tabs", "get_current_tab", "switch_to_tab", "create_new_tab",
            "get_tab_info", "duplicate_tab", "close_tab", "get_current_tab_content"
          ]
        },
        "Tab Groups": {
          description: "Organize tabs into groups and manage tab organization",
          tools: [
            "organize_tabs", "ungroup_tabs", "get_all_tab_groups",
            "create_tab_group", "update_tab_group"
          ]
        },
        "Bookmarks": {
          description: "Manage bookmarks, create, delete, and search bookmarks",
          tools: [
            "get_all_bookmarks", "get_bookmark_folders", "create_bookmark",
            "delete_bookmark", "search_bookmarks"
          ]
        },
        "History": {
          description: "Manage browsing history, search and clear history",
          tools: [
            "get_recent_history", "search_history", "delete_history_item", "clear_history"
          ]
        },
        "Windows": {
          description: "Manage browser windows, create, switch, and control windows",
          tools: [
            "get_all_windows", "get_current_window", "switch_to_window",
            "create_new_window", "close_window", "minimize_window", "maximize_window"
          ]
        },
        "Page Content": {
          description: "Extract and analyze content from web pages",
          tools: [
            "get_page_metadata", "extract_page_text", "get_page_links", "get_page_images",
            "search_page_text", "get_interactive_elements", "click_element", "summarize_page"
          ]
        },
        "Form & Input Management": {
          description: "Fill forms, manage input fields, and interact with web forms",
          tools: [
            "fill_input", "clear_input", "get_input_value", "submit_form", "get_form_elements"
          ]
        },
        "Clipboard": {
          description: "Copy and manage clipboard content",
          tools: [
            "copy_to_clipboard", "read_from_clipboard", "copy_current_page_url",
            "copy_current_page_title", "copy_selected_text", "copy_page_as_markdown", "copy_page_as_text"
          ]
        },
        "Storage": {
          description: "Manage extension storage and settings",
          tools: [
            "get_storage_data", "set_storage_data", "remove_storage_data", "clear_storage",
            "get_storage_keys", "get_storage_size"
          ]
        },
        "Extensions": {
          description: "Manage browser extensions and their settings",
          tools: [
            "get_installed_extensions", "get_extension_info", "enable_extension", "disable_extension"
          ]
        },
        "Downloads": {
          description: "Manage browser downloads and download history",
          tools: [
            "get_downloads", "cancel_download", "clear_downloads", "open_downloads_folder"
          ]
        },
        "Sessions": {
          description: "Manage browser sessions and restore previous sessions",
          tools: [
            "get_sessions", "restore_session", "delete_session", "save_current_session"
          ]
        },
        "Context Menus": {
          description: "Create and manage custom context menu items",
          tools: [
            "create_context_menu_item", "update_context_menu_item", "remove_context_menu_item",
            "remove_all_context_menu_items", "get_context_menu_items"
          ]
        }
      }

      // Initialize categories
      for (const [categoryName, categoryDef] of Object.entries(categoryDefinitions)) {
        const category: ToolCategory = {
          name: categoryName,
          description: categoryDef.description,
          tools: []
        }
        this.categories.set(categoryName, category)
      }

      // Register all tools
      for (const tool of mcpTools) {
        // Find the category for this tool
        let toolCategory = "Other"
        for (const [categoryName, categoryDef] of Object.entries(categoryDefinitions)) {
          if (categoryDef.tools.includes(tool.name)) {
            toolCategory = categoryName
            break
          }
        }

        const toolMetadata: ToolMetadata = {
          name: tool.name,
          description: tool.description,
          category: toolCategory,
          inputSchema: tool.inputSchema
        }

        this.tools.set(tool.name, toolMetadata)

        // Add to category
        const category = this.categories.get(toolCategory)
        if (category) {
          category.tools.push(toolMetadata)
        }
      }

      this.initialized = true
    } catch (error) {
      console.error("Error initializing tools:", error)
      // Fallback: create basic structure even if MCP client fails
      this.createFallbackTools()
      this.initialized = true
    }
  }

  private createFallbackTools(): void {
    // Create a basic fallback structure if MCP client fails
    const fallbackCategory: ToolCategory = {
      name: "Basic Tools",
      description: "Basic browser tools",
      tools: []
    }
    this.categories.set("Basic Tools", fallbackCategory)
  }

  public getTool(toolName: string): ToolMetadata | undefined {
    this.ensureInitialized()
    return this.tools.get(toolName)
  }

  public getAllTools(): ToolMetadata[] {
    this.ensureInitialized()
    return Array.from(this.tools.values())
  }

  public getToolsByCategory(categoryName: string): ToolMetadata[] {
    this.ensureInitialized()
    const category = this.categories.get(categoryName)
    return category ? category.tools : []
  }

  public getAllCategories(): ToolCategory[] {
    this.ensureInitialized()
    return Array.from(this.categories.values())
  }

  public searchTools(query: string): ToolMetadata[] {
    this.ensureInitialized()
    const lowerQuery = query.toLowerCase()
    return Array.from(this.tools.values()).filter(tool =>
      tool.name.toLowerCase().includes(lowerQuery) ||
      tool.description.toLowerCase().includes(lowerQuery) ||
      tool.category.toLowerCase().includes(lowerQuery)
    )
  }

  public getToolsForOpenAI(): AITool[] {
    this.ensureInitialized()
    return this.getAllTools().map(tool => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema
      }
    }))
  }

  public getToolCount(): number {
    this.ensureInitialized()
    return this.tools.size
  }

  public getCategoryCount(): number {
    this.ensureInitialized()
    return this.categories.size
  }

  public getToolsByCategoryName(categoryName: string): ToolMetadata[] {
    this.ensureInitialized()
    const category = this.categories.get(categoryName)
    return category ? category.tools : []
  }

  public getCategoryNames(): string[] {
    this.ensureInitialized()
    return Array.from(this.categories.keys())
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      this.initializeTools()
    }
  }
}

// Export singleton instance
export const toolRegistry = ToolRegistry.getInstance()

// Export convenience functions
export const getAllTools = () => toolRegistry.getAllTools()
export const getToolsByCategory = (category: string) => toolRegistry.getToolsByCategory(category)
export const getAllCategories = () => toolRegistry.getAllCategories()
export const searchTools = (query: string) => toolRegistry.searchTools(query)
export const getToolsForOpenAI = () => toolRegistry.getToolsForOpenAI()
export const getToolCount = () => toolRegistry.getToolCount()
export const getCategoryCount = () => toolRegistry.getCategoryCount()
