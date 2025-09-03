import { toolRegistry } from "./tool-registry"
import { browserMcpClient } from "~/mcp/client"

/**
 * 统一的工具管理服务
 * 整合了所有工具相关的功能，包括：
 * - 工具注册和发现
 * - 工具调用
 * - 工具元数据管理
 * - 工具分类管理
 */
export class ToolManager {
  private static instance: ToolManager

  private constructor() {}

  public static getInstance(): ToolManager {
    if (!ToolManager.instance) {
      ToolManager.instance = new ToolManager()
    }
    return ToolManager.instance
  }

  /**
   * 获取所有可用工具
   */
  public getAllTools() {
    return toolRegistry.getAllTools()
  }

  /**
   * 按类别获取工具
   */
  public getToolsByCategory(categoryName: string) {
    return toolRegistry.getToolsByCategory(categoryName)
  }

  /**
   * 获取所有工具类别
   */
  public getAllCategories() {
    return toolRegistry.getAllCategories()
  }

  /**
   * 搜索工具
   */
  public searchTools(query: string) {
    return toolRegistry.searchTools(query)
  }

  /**
   * 获取工具数量
   */
  public getToolCount() {
    return toolRegistry.getToolCount()
  }

  /**
   * 获取类别数量
   */
  public getCategoryCount() {
    return toolRegistry.getCategoryCount()
  }

  /**
   * 获取OpenAI格式的工具定义
   */
  public getToolsForOpenAI() {
    return toolRegistry.getToolsForOpenAI()
  }

  /**
   * 调用工具
   */
  public async callTool(toolName: string, args: any, messageId?: string) {
    return await browserMcpClient.callTool(toolName, args, messageId)
  }

  /**
   * 获取工具描述
   */
  public getToolDescription(toolName: string) {
    const tool = toolRegistry.getTool(toolName)
    return tool ? tool.description : null
  }

  /**
   * 检查工具是否存在
   */
  public hasTool(toolName: string) {
    return toolRegistry.getTool(toolName) !== undefined
  }

  /**
   * 获取工具的分类
   */
  public getToolCategory(toolName: string) {
    const tool = toolRegistry.getTool(toolName)
    return tool ? tool.category : null
  }

  /**
   * 获取工具的输入模式
   */
  public getToolInputSchema(toolName: string) {
    const tool = toolRegistry.getTool(toolName)
    return tool ? tool.inputSchema : null
  }

  /**
   * 获取MCP客户端的工具列表
   */
  public getMcpTools() {
    return browserMcpClient.tools
  }

  /**
   * 获取MCP工具描述
   */
  public getMcpToolDescriptions() {
    return browserMcpClient.getToolDescriptions()
  }
}

// 导出单例实例
export const toolManager = ToolManager.getInstance()

// 导出便捷函数
export const getAllTools = () => toolManager.getAllTools()
export const getToolsByCategory = (category: string) => toolManager.getToolsByCategory(category)
export const getAllCategories = () => toolManager.getAllCategories()
export const searchTools = (query: string) => toolManager.searchTools(query)
export const getToolsForOpenAI = () => toolManager.getToolsForOpenAI()
export const callTool = (toolName: string, args: any, messageId?: string) => toolManager.callTool(toolName, args, messageId)
export const getToolDescription = (toolName: string) => toolManager.getToolDescription(toolName)
export const hasTool = (toolName: string) => toolManager.hasTool(toolName)
export const getToolCategory = (toolName: string) => toolManager.getToolCategory(toolName)
export const getToolInputSchema = (toolName: string) => toolManager.getToolInputSchema(toolName)
export const getMcpTools = () => toolManager.getMcpTools()
export const getMcpToolDescriptions = () => toolManager.getMcpToolDescriptions()
