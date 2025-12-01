/**
 * @deprecated This module is deprecated. Import directly from top-level modules:
 * - Adapters: from "~/adapters"
 * - Types: from "~/types"
 * - Hooks: from "~/hooks"
 * - Context: from "./context"
 */

// Context (only thing still in core/)
export {
  type ChatbotProviderProps,
  ChatContext,
  type ChatContextValue,
  ComponentsContext,
  type ComponentsContextValue,
  ConfigContext,
  type ConfigContextValue,
  ThemeContext,
  type ThemeContextValue,
  useChatContext,
  useComponentsContext,
  useConfigContext,
  useThemeContext,
} from "./context";
