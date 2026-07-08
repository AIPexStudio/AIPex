export interface SuccessResult {
  ok: true;
  data: unknown;
  meta?: { tool: string; elapsed_ms: number };
}

export interface ErrorResult {
  ok: false;
  error: string;
  hint?: string;
}

export type Result = SuccessResult | ErrorResult;

export function printResult(result: Result): void {
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}

export function success(
  data: unknown,
  meta?: { tool: string; elapsed_ms: number },
): SuccessResult {
  return { ok: true, data, ...(meta ? { meta } : {}) };
}

export function error(message: string, hint?: string): ErrorResult {
  return { ok: false, error: message, ...(hint ? { hint } : {}) };
}

export function printHelp(text: string): void {
  process.stderr.write(text + "\n");
}
