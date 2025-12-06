import type { KeyValueStorage } from "@aipexstudio/aipex-core";
import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  createTranslationFunction,
  DEFAULT_LANGUAGE,
  detectBrowserLanguage,
  isValidLanguage,
  LANGUAGE_STORAGE_KEY,
} from "./index";
import type { I18nContextValue, Language, TranslationKey } from "./types";

const I18nContext = createContext<I18nContextValue | null>(null);

interface I18nProviderProps {
  children: React.ReactNode;
  storageAdapter: KeyValueStorage<Language>;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({
  children,
  storageAdapter,
}) => {
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeLanguage = async () => {
      try {
        const storedLanguage = await storageAdapter.load(LANGUAGE_STORAGE_KEY);
        if (isValidLanguage(storedLanguage)) {
          setLanguage(storedLanguage);
        } else {
          const browserLanguage = detectBrowserLanguage();
          setLanguage(browserLanguage);
        }
      } catch (error) {
        console.error("Failed to initialize language:", error);
        setLanguage(DEFAULT_LANGUAGE);
      } finally {
        setIsInitialized(true);
      }
    };

    void initializeLanguage();

    const unwatch = storageAdapter.watch(
      LANGUAGE_STORAGE_KEY,
      (change: { newValue?: Language; oldValue?: Language }) => {
        if (isValidLanguage(change.newValue)) {
          setLanguage(change.newValue);
        }
      },
    );

    return unwatch;
  }, [storageAdapter]);

  const changeLanguage = useCallback(
    async (newLanguage: Language) => {
      try {
        setLanguage(newLanguage);
        await storageAdapter.save(LANGUAGE_STORAGE_KEY, newLanguage);
      } catch {
        const fallbackLanguage =
          await storageAdapter.load(LANGUAGE_STORAGE_KEY);
        if (isValidLanguage(fallbackLanguage)) {
          setLanguage(fallbackLanguage);
        }
      }
    },
    [storageAdapter],
  );

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      const translationFn = createTranslationFunction(language);
      return translationFn(key, params);
    },
    [language],
  );

  const contextValue: I18nContextValue = {
    language,
    t,
    changeLanguage,
  };

  if (!isInitialized) {
    return null;
  }

  return (
    <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>
  );
};

const fallbackContext: I18nContextValue = {
  language: DEFAULT_LANGUAGE,
  t: (key: TranslationKey) => {
    const translationFn = createTranslationFunction(DEFAULT_LANGUAGE);
    return translationFn(key);
  },
  changeLanguage: async () => {
    console.warn("changeLanguage called without I18nProvider");
  },
};

export const useTranslation = (): I18nContextValue => {
  const context = useContext(I18nContext);
  return context ?? fallbackContext;
};

export { I18nContext };
