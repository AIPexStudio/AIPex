/**
 * Theme management hook
 * Manages theme state and applies theme class to document
 */

import { useEffect } from "react";
import { useStorage } from "../storage";

export type Theme = "light" | "dark" | "system";

export function useTheme() {
  const [theme, setTheme] = useStorage<Theme>("theme", "system");

  useEffect(() => {
    const root = document.documentElement;

    // Remove all theme classes first
    root.classList.remove("light", "dark");

    // Determine the effective theme
    let effectiveTheme: "light" | "dark" = "light";

    if (theme === "system") {
      // Use system preference
      effectiveTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    } else {
      effectiveTheme = theme;
    }

    // Apply theme class
    root.classList.add(effectiveTheme);

    // Listen for system theme changes when using system theme
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

      const handleChange = (e: MediaQueryListEvent) => {
        root.classList.remove("light", "dark");
        root.classList.add(e.matches ? "dark" : "light");
      };

      mediaQuery.addEventListener("change", handleChange);

      return () => {
        mediaQuery.removeEventListener("change", handleChange);
      };
    }
  }, [theme]);

  return { theme, setTheme };
}

