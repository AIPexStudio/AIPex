export type RuntimeMessageSender = Record<string, unknown>;

export type RuntimeMessageHandler = (
  message: any,
  sender: RuntimeMessageSender,
  sendResponse: (response: any) => void,
) => undefined | boolean | Promise<undefined | boolean>;

export interface RuntimeApi {
  onMessage?: {
    addListener(handler: RuntimeMessageHandler): void;
    removeListener(handler: RuntimeMessageHandler): void;
  };
  openOptionsPage?: () => void;
}

/**
 * Resolve a browser runtime-like object without importing browser-specific types.
 * Returns undefined outside extension environments.
 */
export function getRuntime(): RuntimeApi | undefined {
  const runtime = (globalThis as any)?.chrome?.runtime;
  if (!runtime) return undefined;
  return runtime as RuntimeApi;
}
