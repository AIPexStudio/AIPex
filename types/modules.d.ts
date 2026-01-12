declare module "bumpp" {
  export type DefineConfigInput = Record<string, unknown> & {
    files?: string[];
  };

  export function defineConfig(config: DefineConfigInput): DefineConfigInput;
}

declare module "tinyglobby" {
  export interface GlobOptions {
    cwd?: string;
    absolute?: boolean;
    expandDirectories?:
      | boolean
      | {
          files?: string[];
          extensions?: string[];
        };
  }

  export function globSync(
    patterns: string | string[],
    options?: GlobOptions,
  ): string[];
}
