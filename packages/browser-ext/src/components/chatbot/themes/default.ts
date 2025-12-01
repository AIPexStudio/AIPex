import type { ChatbotTheme, ChatbotThemeVariables } from "../core/types";

/**
 * Default theme variables
 */
export const defaultThemeVariables: ChatbotThemeVariables = {
  "--chatbot-primary": "hsl(222.2 47.4% 11.2%)",
  "--chatbot-primary-foreground": "hsl(210 40% 98%)",
  "--chatbot-secondary": "hsl(210 40% 96.1%)",
  "--chatbot-secondary-foreground": "hsl(222.2 47.4% 11.2%)",
  "--chatbot-background": "hsl(0 0% 100%)",
  "--chatbot-foreground": "hsl(222.2 47.4% 11.2%)",
  "--chatbot-muted": "hsl(210 40% 96.1%)",
  "--chatbot-muted-foreground": "hsl(215.4 16.3% 46.9%)",
  "--chatbot-border": "hsl(214.3 31.8% 91.4%)",
  "--chatbot-radius": "0.5rem",
  "--chatbot-user-bg": "hsl(222.2 47.4% 11.2%)",
  "--chatbot-user-fg": "hsl(210 40% 98%)",
  "--chatbot-assistant-bg": "hsl(210 40% 96.1%)",
  "--chatbot-assistant-fg": "hsl(222.2 47.4% 11.2%)",
};

/**
 * Dark theme variables
 */
export const darkThemeVariables: ChatbotThemeVariables = {
  "--chatbot-primary": "hsl(210 40% 98%)",
  "--chatbot-primary-foreground": "hsl(222.2 47.4% 11.2%)",
  "--chatbot-secondary": "hsl(217.2 32.6% 17.5%)",
  "--chatbot-secondary-foreground": "hsl(210 40% 98%)",
  "--chatbot-background": "hsl(222.2 84% 4.9%)",
  "--chatbot-foreground": "hsl(210 40% 98%)",
  "--chatbot-muted": "hsl(217.2 32.6% 17.5%)",
  "--chatbot-muted-foreground": "hsl(215 20.2% 65.1%)",
  "--chatbot-border": "hsl(217.2 32.6% 17.5%)",
  "--chatbot-radius": "0.5rem",
  "--chatbot-user-bg": "hsl(210 40% 98%)",
  "--chatbot-user-fg": "hsl(222.2 47.4% 11.2%)",
  "--chatbot-assistant-bg": "hsl(217.2 32.6% 17.5%)",
  "--chatbot-assistant-fg": "hsl(210 40% 98%)",
};

/**
 * Default theme configuration
 */
export const defaultTheme: ChatbotTheme = {
  className: "chatbot-default",
  variables: defaultThemeVariables,
};

/**
 * Dark theme configuration
 */
export const darkTheme: ChatbotTheme = {
  className: "chatbot-dark",
  variables: darkThemeVariables,
};

/**
 * Minimal theme - clean and simple
 */
export const minimalTheme: ChatbotTheme = {
  className: "chatbot-minimal",
  variables: {
    "--chatbot-primary": "hsl(0 0% 9%)",
    "--chatbot-primary-foreground": "hsl(0 0% 98%)",
    "--chatbot-secondary": "hsl(0 0% 96%)",
    "--chatbot-secondary-foreground": "hsl(0 0% 9%)",
    "--chatbot-background": "hsl(0 0% 100%)",
    "--chatbot-foreground": "hsl(0 0% 9%)",
    "--chatbot-muted": "hsl(0 0% 96%)",
    "--chatbot-muted-foreground": "hsl(0 0% 45%)",
    "--chatbot-border": "hsl(0 0% 90%)",
    "--chatbot-radius": "0.25rem",
    "--chatbot-user-bg": "hsl(0 0% 9%)",
    "--chatbot-user-fg": "hsl(0 0% 98%)",
    "--chatbot-assistant-bg": "hsl(0 0% 96%)",
    "--chatbot-assistant-fg": "hsl(0 0% 9%)",
  },
};

/**
 * Colorful theme - vibrant colors
 */
export const colorfulTheme: ChatbotTheme = {
  className: "chatbot-colorful",
  variables: {
    "--chatbot-primary": "hsl(262 83% 58%)",
    "--chatbot-primary-foreground": "hsl(0 0% 100%)",
    "--chatbot-secondary": "hsl(262 30% 96%)",
    "--chatbot-secondary-foreground": "hsl(262 83% 30%)",
    "--chatbot-background": "hsl(0 0% 100%)",
    "--chatbot-foreground": "hsl(262 83% 20%)",
    "--chatbot-muted": "hsl(262 30% 96%)",
    "--chatbot-muted-foreground": "hsl(262 20% 50%)",
    "--chatbot-border": "hsl(262 30% 90%)",
    "--chatbot-radius": "0.75rem",
    "--chatbot-user-bg": "hsl(262 83% 58%)",
    "--chatbot-user-fg": "hsl(0 0% 100%)",
    "--chatbot-assistant-bg": "hsl(262 30% 96%)",
    "--chatbot-assistant-fg": "hsl(262 83% 20%)",
  },
};

/**
 * Create a custom theme by merging with defaults
 */
export function createTheme(overrides: Partial<ChatbotTheme>): ChatbotTheme {
  return {
    className: overrides.className || defaultTheme.className,
    variables: {
      ...defaultThemeVariables,
      ...overrides.variables,
    },
  };
}

/**
 * Merge two themes
 */
export function mergeThemes(
  base: ChatbotTheme,
  overrides: Partial<ChatbotTheme>,
): ChatbotTheme {
  return {
    className: overrides.className || base.className,
    variables: {
      ...base.variables,
      ...overrides.variables,
    },
  };
}
