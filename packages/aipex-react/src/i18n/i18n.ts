// Main exports for the i18n system

export { I18nProvider } from "./context";
export * from "./hooks";
export {
  createTranslationFunction,
  DEFAULT_LANGUAGE,
  detectBrowserLanguage,
  getTranslation,
  isValidLanguage,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
} from "./index";
export * from "./types";
