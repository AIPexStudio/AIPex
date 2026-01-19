import { skillManager } from '../lib/services/skill-manager'

// Tool: Load skill content
export async function loadSkill(skillName: string): Promise<{
  success: boolean
  content?: string
  error?: string
  message?: string
}> {
  try {
    const content = await skillManager.getSkillContent(skillName)
    return {
      success: true,
      content,
      message: `Skill '${skillName}' loaded successfully`
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

// Tool: Execute skill script
export async function executeSkillScript(
  skillName: string,
  scriptPath: string,
  args?: any
): Promise<{
  success: boolean
  result?: any
  error?: string
  message?: string
}> {
  try {
    const result = await skillManager.executeSkillScript(skillName, scriptPath, args)
    return {
      success: true,
      result,
      message: `Script '${scriptPath}' executed successfully`
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

// Tool: Read skill reference
export async function readSkillReference(
  skillName: string,
  refPath: string
): Promise<{
  success: boolean
  content?: string
  error?: string
  message?: string
}> {
  try {
    const content = await skillManager.getSkillReference(skillName, refPath)
    return {
      success: true,
      content,
      message: `Reference '${refPath}' loaded successfully`
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

// Tool: Get skill asset
export async function getSkillAsset(
  skillName: string,
  assetPath: string
): Promise<{
  success: boolean
  asset?: string | number[]
  type?: string
  error?: string
  message?: string
}> {
  try {
    const asset = await skillManager.getSkillAsset(skillName, assetPath)
    if (!asset) {
      return {
        success: false,
        error: `Asset '${assetPath}' not found in skill '${skillName}'`
      }
    }

    return {
      success: true,
      asset: asset instanceof ArrayBuffer ? Array.from(new Uint8Array(asset)) : asset,
      type: asset instanceof ArrayBuffer ? 'binary' : 'text',
      message: `Asset '${assetPath}' loaded successfully`
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

// Tool: List available skills
export async function listSkills(enabledOnly: boolean = false): Promise<{
  success: boolean
  skills?: Array<{
    id: string
    name: string
    description: string
    version: string
    enabled: boolean
    uploadedAt: number
  }>
  count?: number
  error?: string
  message?: string
}> {
  try {
    const skills = skillManager.getAllSkills()
    const filteredSkills = enabledOnly ? skills.filter(skill => skill.enabled) : skills

    return {
      success: true,
      skills: filteredSkills.map(skill => ({
        id: skill.id,
        name: skill.name,
        description: skill.description,
        version: skill.version,
        enabled: skill.enabled,
        uploadedAt: skill.uploadedAt
      })),
      count: filteredSkills.length,
      message: `Found ${filteredSkills.length} skills`
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

// Tool: Get skill information
export async function getSkillInfo(skillName: string): Promise<{
  success: boolean
  skill?: {
    id: string
    name: string
    description: string
    version: string
    enabled: boolean
    uploadedAt: number
    scripts: string[]
    references: string[]
    assets: string[]
  }
  error?: string
  message?: string
}> {
  try {
    const skills = skillManager.getAllSkills()
    const skill = skills.find(s => s.name === skillName)

    if (!skill) {
      return {
        success: false,
        error: `Skill '${skillName}' not found`
      }
    }

    // Get skill content to extract more details
    const skillData = await skillManager.getSkill(skillName)

    if (!skillData) {
      return {
        success: false,
        error: `Failed to get skill data for '${skillName}'`
      }
    }

    return {
      success: true,
      skill: {
        id: skill.id,
        name: skill.name,
        description: skill.description,
        version: skill.version,
        enabled: skill.enabled,
        uploadedAt: skill.uploadedAt,
        scripts: skillData.scripts,
        references: skillData.references,
        assets: skillData.assets
      },
      message: `Skill '${skillName}' information retrieved successfully`
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

// Tool: Execute skill tool (for dynamically registered tools)
export async function executeSkillTool(
  toolName: string,
  args: any
): Promise<{
  success: boolean
  result?: any
  error?: string
  message?: string
}> {
  try {
    const result = await skillManager.executeTool(toolName, args)
    return {
      success: true,
      result,
      message: `Tool '${toolName}' executed successfully`
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

// Tool: Get registered tools from skills
export async function getSkillTools(skillName?: string): Promise<{
  success: boolean
  tools?: Array<{
    name: string
    description: string
    inputSchema: any
  }>
  count?: number
  error?: string
  message?: string
}> {
  try {
    const registeredTools = skillManager.getRegisteredTools()

    let tools = registeredTools
    if (skillName) {
      // Filter tools by skill name (this would require tracking which skill registered which tool)
      tools = registeredTools // For now, return all tools
    }

    return {
      success: true,
      tools: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema
      })),
      count: tools.length,
      message: `Found ${tools.length} registered tools${skillName ? ` for skill '${skillName}'` : ''}`
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}
