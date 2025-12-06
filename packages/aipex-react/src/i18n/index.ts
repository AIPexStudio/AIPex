// Language resource imports
import { STORAGE_KEYS } from "@aipexstudio/aipex-core";
import enTranslations from "./locales/en.json";
import zhTranslations from "./locales/zh.json";
import type { Language, TranslationKey, TranslationResources } from "./types";

export const SUPPORTED_LANGUAGES: Language[] = ["en", "zh"];
export const DEFAULT_LANGUAGE: Language = "en";
export const LANGUAGE_STORAGE_KEY = STORAGE_KEYS.LANGUAGE;

// Translation resources map
const translations: Record<Language, TranslationResources> = {
  en: enTranslations as TranslationResources,
  zh: zhTranslations as TranslationResources,
};

export function isValidLanguage(value: unknown): value is Language {
  return value === "en" || value === "zh";
}

export function detectBrowserLanguage(): Language {
  const browserLang =
    typeof navigator !== "undefined" ? navigator.language.toLowerCase() : "";
  if (browserLang.startsWith("zh")) {
    return "zh";
  }
  return DEFAULT_LANGUAGE;
}

export const getTranslation = (
  language: Language,
  key: TranslationKey,
  params?: Record<string, string | number>,
): string => {
  try {
    const resource = translations[language];
    if (!resource) {
      console.warn(`Translation resource not found for language: ${language}`);
      return key;
    }

    const keys = key.split(".");
    let value: unknown = resource;

    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        console.warn(
          `Translation key not found: ${key} for language: ${language}`,
        );
        return key;
      }
    }

    if (typeof value !== "string") {
      console.warn(`Translation value is not a string for key: ${key}`);
      return key;
    }

    if (params) {
      return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
        const paramValue = params[paramKey as string];
        return paramValue !== undefined ? String(paramValue) : match;
      });
    }

    return value;
  } catch (error) {
    console.error(`Error getting translation for key ${key}:`, error);
    return key;
  }
};

export const createTranslationFunction = (language: Language) => {
  return (
    key: TranslationKey,
    params?: Record<string, string | number>,
  ): string => {
    return getTranslation(language, key, params);
  };
};
