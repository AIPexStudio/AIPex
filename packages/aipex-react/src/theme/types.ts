export type Theme = "light" | "dark" | "system";

export interface ThemeContextValue {
  theme: Theme;
  effectiveTheme: "light" | "dark";
  changeTheme: (theme: Theme) => Promise<void>;
}
