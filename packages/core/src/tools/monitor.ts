import type { ToolMetrics } from "./types.js";

interface CallRecord {
  success: boolean;
  duration: number;
}

export class ToolMonitor {
  private records = new Map<string, CallRecord[]>();

  recordCall(toolName: string, success: boolean, duration: number): void {
    if (!this.records.has(toolName)) {
      this.records.set(toolName, []);
    }

    this.records.get(toolName)?.push({ success, duration });
  }

  getMetrics(toolName?: string): ToolMetrics[] {
    if (toolName) {
      const metrics = this.calculateMetrics(toolName);
      return metrics ? [metrics] : [];
    }

    return Array.from(this.records.keys())
      .map((name) => this.calculateMetrics(name))
      .filter((m): m is ToolMetrics => m !== null);
  }

  private calculateMetrics(toolName: string): ToolMetrics | null {
    const records = this.records.get(toolName);
    if (!records || records.length === 0) {
      return null;
    }

    const totalCalls = records.length;
    const successCount = records.filter((r) => r.success).length;
    const failureCount = totalCalls - successCount;
    const totalDuration = records.reduce((sum, r) => sum + r.duration, 0);
    const avgDuration = totalDuration / totalCalls;

    return {
      toolName,
      totalCalls,
      successCount,
      failureCount,
      avgDuration,
      totalDuration,
    };
  }

  clear(toolName?: string): void {
    if (toolName) {
      this.records.delete(toolName);
    } else {
      this.records.clear();
    }
  }
}
