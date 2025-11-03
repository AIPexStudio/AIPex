export interface ActionRecord {
  action: string;
  params: string;
  timestamp: number;
}

export class LoopDetector {
  private recentActions: ActionRecord[] = [];

  private readonly WINDOW_SIZE = 5;
  private readonly SIMILARITY_THRESHOLD = 0.8;
  private readonly TIME_WINDOW_MS = 60000; // 1 minute

  checkLoop(action: string, params: unknown): boolean {
    const paramsStr = JSON.stringify(params);
    const now = Date.now();

    // Clean old records
    this.recentActions = this.recentActions.filter(
      (a) => now - a.timestamp < this.TIME_WINDOW_MS,
    );

    // Check for repeated patterns
    const similarActions = this.recentActions.filter(
      (a) =>
        a.action === action &&
        this.similarity(a.params, paramsStr) > this.SIMILARITY_THRESHOLD,
    );

    if (similarActions.length >= 3) {
      return true; // Loop detected
    }

    // Add current action
    this.recentActions.push({ action, params: paramsStr, timestamp: now });

    // Keep window size
    if (this.recentActions.length > this.WINDOW_SIZE) {
      this.recentActions.shift();
    }

    return false;
  }

  private similarity(a: string, b: string): number {
    // Simple exact match for now
    // Could be enhanced with Levenshtein distance or other algorithms
    return a === b ? 1.0 : 0.0;
  }

  reset(): void {
    this.recentActions = [];
  }
}
