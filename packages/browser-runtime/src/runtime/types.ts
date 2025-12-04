export interface RuntimeBroadcastMessage<TPayload = unknown> {
  channel: string;
  payload: TPayload;
  scope?: "tab" | "window" | "all";
  includeContentScripts?: boolean;
}

export interface RuntimeAddonCleanup {
  dispose(): Promise<void> | void;
}
