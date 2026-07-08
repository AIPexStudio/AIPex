import { checkDaemonHealth, type DaemonClientOptions } from "../lib/daemon-client.js";

export async function runStatusCommand(
  opts: DaemonClientOptions,
): Promise<{ ok: boolean; data?: unknown; error?: string; hint?: string }> {
  return checkDaemonHealth(opts);
}
