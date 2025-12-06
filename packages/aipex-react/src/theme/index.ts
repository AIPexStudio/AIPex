import { STORAGE_KEYS } from "@aipexstudio/aipex-core";
import type { Theme } from "./types";

export * from "./context";
export * from "./types";

export const THEME_STORAGE_KEY = STORAGE_KEYS.THEME;
export const DEFAULT_THEME: Theme = "system";

export function isValidTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

export function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    return getSystemTheme();
  }
  return theme;
}

export function applyTheme(
  effectiveTheme: "light" | "dark",
  scope?: "global" | "local",
): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;

  if (scope === "local") {
    return;
  }

  if (effectiveTheme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}
