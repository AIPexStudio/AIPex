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
  applyTheme,
  DEFAULT_THEME,
  isValidTheme,
  resolveTheme,
  THEME_STORAGE_KEY,
} from "./index";
import type { Theme, ThemeContextValue } from "./types";

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: React.ReactNode;
  scope?: "global" | "local";
  storageAdapter: KeyValueStorage<Theme>;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  scope = "global",
  storageAdapter,
}) => {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const [effectiveTheme, setEffectiveTheme] = useState<"light" | "dark">(
    "light",
  );
  const [isInitialized, setIsInitialized] = useState(false);

  const updateEffectiveTheme = useCallback(
    (currentTheme: Theme) => {
      const resolved = resolveTheme(currentTheme);
      setEffectiveTheme(resolved);
      applyTheme(resolved, scope);
    },
    [scope],
  );

  useEffect(() => {
    const initializeTheme = async () => {
      try {
        const storedTheme = await storageAdapter.load(THEME_STORAGE_KEY);
        if (isValidTheme(storedTheme)) {
          setTheme(storedTheme);
          updateEffectiveTheme(storedTheme);
        } else {
          setTheme(DEFAULT_THEME);
          updateEffectiveTheme(DEFAULT_THEME);
        }
      } catch (error) {
        console.error("Failed to initialize theme:", error);
        setTheme(DEFAULT_THEME);
        updateEffectiveTheme(DEFAULT_THEME);
      } finally {
        setIsInitialized(true);
      }
    };

    void initializeTheme();

    const unwatch = storageAdapter.watch(THEME_STORAGE_KEY, (change) => {
      if (isValidTheme(change.newValue)) {
        setTheme(change.newValue);
        updateEffectiveTheme(change.newValue);
      }
    });

    return unwatch;
  }, [storageAdapter, updateEffectiveTheme]);

  useEffect(() => {
    if (theme !== "system") return undefined;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      updateEffectiveTheme(theme);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
    if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
    return undefined;
  }, [theme, updateEffectiveTheme]);

  const changeTheme = useCallback(
    async (newTheme: Theme) => {
      try {
        setTheme(newTheme);
        updateEffectiveTheme(newTheme);
        await storageAdapter.save(THEME_STORAGE_KEY, newTheme);
      } catch (error) {
        console.error("Failed to change theme:", error);
        const fallbackTheme = await storageAdapter.load(THEME_STORAGE_KEY);
        if (isValidTheme(fallbackTheme)) {
          setTheme(fallbackTheme);
          updateEffectiveTheme(fallbackTheme);
        }
      }
    },
    [storageAdapter, updateEffectiveTheme],
  );

  const contextValue: ThemeContextValue = {
    theme,
    effectiveTheme,
    changeTheme,
  };

  if (!isInitialized) {
    return null;
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
};

export { ThemeContext };
