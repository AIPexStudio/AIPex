import { useTranslation as useI18nTranslation } from "./context"
import type { Language } from "./types"

/**
 * Hook to get current language
 */
export const useLanguage = (): Language => {
  const { language } = useI18nTranslation()
  return language
}

/**
 * Hook to get language change function
 */
export const useLanguageChanger = () => {
  const { changeLanguage } = useI18nTranslation()
  return changeLanguage
}

/**
 * Hook to check if a language is currently active
 */
export const useIsLanguageActive = (targetLanguage: Language): boolean => {
  const { language } = useI18nTranslation()
  return language === targetLanguage
}

/**
 * Main translation hook (re-export for convenience)
 */
export const useTranslation = () => {
  return useI18nTranslation()
}