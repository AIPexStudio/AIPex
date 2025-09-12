import { Storage } from "@plasmohq/storage"
import type { Language, TranslationResources, TranslationKey } from "./types"

// Language resource imports
import enTranslations from "./locales/en.json"
import zhTranslations from "./locales/zh.json"

export const SUPPORTED_LANGUAGES: Language[] = ['en', 'zh']
export const DEFAULT_LANGUAGE: Language = 'en'
export const LANGUAGE_STORAGE_KEY = 'aipex_language'

// Translation resources map
const translations: Record<Language, TranslationResources> = {
  en: enTranslations as TranslationResources,
  zh: zhTranslations as TranslationResources
}

// Storage instance
let storage: Storage | null = null

// Get storage instance (lazy initialization)
const getStorage = async (): Promise<Storage> => {
  if (!storage) {
    storage = new Storage()
  }
  return storage
}

/**
 * Get the user's preferred language from storage
 */
export const getStoredLanguage = async (): Promise<Language> => {
  try {
    const storageInstance = await getStorage()
    const storedLang = await storageInstance.get(LANGUAGE_STORAGE_KEY)
    
    if (storedLang && SUPPORTED_LANGUAGES.includes(storedLang as Language)) {
      return storedLang as Language
    }
    
    // Fallback to browser language detection
    const browserLang = navigator.language.toLowerCase()
    if (browserLang.startsWith('zh')) {
      return 'zh'
    }
    
    return DEFAULT_LANGUAGE
  } catch (error) {
    console.warn('Failed to get stored language:', error)
    return DEFAULT_LANGUAGE
  }
}

/**
 * Store the user's language preference
 */
export const setStoredLanguage = async (language: Language): Promise<void> => {
  try {
    const storageInstance = await getStorage()
    await storageInstance.set(LANGUAGE_STORAGE_KEY, language)
  } catch (error) {
    console.error('Failed to store language:', error)
  }
}

/**
 * Get translation for a specific key
 */
export const getTranslation = (
  language: Language,
  key: TranslationKey,
  params?: Record<string, string | number>
): string => {
  try {
    const resource = translations[language]
    if (!resource) {
      console.warn(`Translation resource not found for language: ${language}`)
      return key
    }

    // Navigate through nested object using dot notation
    const keys = key.split('.')
    let value: any = resource
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        console.warn(`Translation key not found: ${key} for language: ${language}`)
        return key
      }
    }

    if (typeof value !== 'string') {
      console.warn(`Translation value is not a string for key: ${key}`)
      return key
    }

    // Replace parameters in the translation
    if (params) {
      return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
        const paramValue = params[paramKey]
        return paramValue !== undefined ? String(paramValue) : match
      })
    }

    return value
  } catch (error) {
    console.error(`Error getting translation for key ${key}:`, error)
    return key
  }
}

/**
 * Create a translation function for a specific language
 */
export const createTranslationFunction = (language: Language) => {
  return (key: TranslationKey, params?: Record<string, string | number>): string => {
    return getTranslation(language, key, params)
  }
}