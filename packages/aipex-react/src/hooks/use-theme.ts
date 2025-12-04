/**
 * Theme management hook
 *
 * This re-exports the theme functionality from the theme module.
 * For full theme management with Provider support, use ThemeProvider from theme/context.
 */

export type { Theme, ThemeContextValue } from "../theme";
export {
  applyTheme,
  DEFAULT_THEME,
  getSystemTheme,
  isValidTheme,
  resolveTheme,
  THEME_STORAGE_KEY,
  ThemeProvider,
  useTheme,
} from "../theme";
