export interface ToolContext {
  callId: string;
  sessionId: string;
  turnId: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  sharedState?: SharedState;
}

export class SharedState {
  private data = new Map<string, unknown>();

  get<T>(key: string): T | undefined {
    return this.data.get(key) as T | undefined;
  }

  set<T>(key: string, value: T): void {
    this.data.set(key, value);
  }

  has(key: string): boolean {
    return this.data.has(key);
  }

  delete(key: string): void {
    this.data.delete(key);
  }

  clear(): void {
    this.data.clear();
  }
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  errorType?: string;
  metadata?: {
    duration?: number;
    retries?: number;
    [key: string]: unknown;
  };
}

export interface ToolMetrics {
  toolName: string;
  totalCalls: number;
  successCount: number;
  failureCount: number;
  avgDuration: number;
  totalDuration: number;
}
