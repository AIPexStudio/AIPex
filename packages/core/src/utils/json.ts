export function safeJsonParse<T>(
  value: string | null | undefined,
): T | undefined {
  if (value === null || value === undefined) return undefined;
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}
