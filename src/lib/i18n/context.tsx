import React, { createContext, useContext, useEffect, useState, useCallback } from "react"
import type { Language, I18nContextValue, TranslationKey } from "./types"
import { 
  getStoredLanguage, 
  setStoredLanguage, 
  createTranslationFunction, 
  DEFAULT_LANGUAGE 
} from "./index"

// Create the context
const I18nContext = createContext<I18nContextValue | null>(null)

interface I18nProviderProps {
  children: React.ReactNode
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize language from storage
  useEffect(() => {
    const initializeLanguage = async () => {
      try {
        const storedLanguage = await getStoredLanguage()
        setLanguage(storedLanguage)
        setIsInitialized(true)
      } catch (error) {
        console.error('Failed to initialize language:', error)
        setLanguage(DEFAULT_LANGUAGE)
        setIsInitialized(true)
      }
    }

    initializeLanguage()
  }, [])

  // Change language function
  const changeLanguage = useCallback(async (newLanguage: Language) => {
    try {
      setLanguage(newLanguage)
      await setStoredLanguage(newLanguage)
      console.log(`Language changed to: ${newLanguage}`)
    } catch (error) {
      console.error('Failed to change language:', error)
      // Revert to previous language on error
      const fallbackLanguage = await getStoredLanguage()
      setLanguage(fallbackLanguage)
    }
  }, [])

  // Create translation function
  const t = useCallback((key: TranslationKey, params?: Record<string, string | number>): string => {
    const translationFn = createTranslationFunction(language)
    return translationFn(key, params)
  }, [language])

  // Context value
  const contextValue: I18nContextValue = {
    language,
    t,
    changeLanguage
  }

  // Don't render children until language is initialized
  if (!isInitialized) {
    return null
  }

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  )
}

// Custom hook to use the i18n context
export const useTranslation = (): I18nContextValue => {
  const context = useContext(I18nContext)
  
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider')
  }
  
  return context
}

// Export the context for advanced use cases
export { I18nContext }