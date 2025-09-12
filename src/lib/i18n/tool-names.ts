import { useTranslation } from "./hooks"

/**
 * Get translated tool name
 * @param toolName The original tool name
 * @returns Translated tool name or original name if translation not found
 */
export const useToolName = (toolName: string): string => {
  const { t, language } = useTranslation()
  
  try {
    // Try to get translation from tools namespace
    const translatedName = t(`tools.${toolName}` as any)
    
    // If the translated name is the same as the key, it means no translation was found
    if (translatedName === `tools.${toolName}`) {
      // Return formatted original name as fallback
      return formatToolName(toolName)
    }
    
    return translatedName
  } catch (error) {
    // Return formatted original name on error
    return formatToolName(toolName)
  }
}

/**
 * Format tool name for display (snake_case -> Title Case)
 * @param toolName The original snake_case tool name
 * @returns Formatted tool name
 */
export const formatToolName = (toolName: string): string => {
  return toolName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Get translated tool name without hooks (for use outside components)
 * @param toolName The original tool name
 * @param language Current language
 * @param translations Translation resources
 * @returns Translated tool name or formatted original name
 */
export const getToolName = (
  toolName: string, 
  language: string, 
  translations: any
): string => {
  try {
    const toolTranslations = translations[language]?.tools
    if (toolTranslations && toolTranslations[toolName]) {
      return toolTranslations[toolName]
    }
    return formatToolName(toolName)
  } catch (error) {
    return formatToolName(toolName)
  }
}