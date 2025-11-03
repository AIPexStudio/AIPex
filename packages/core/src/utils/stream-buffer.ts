/**
 * StreamBuffer intelligently buffers streaming content to reduce event emissions
 * Uses both time-based and size-based flushing strategies
 */
export class StreamBuffer {
  private buffer = "";
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private delayMs = 50,
    private maxBufferSize = 1024,
  ) {}

  add(text: string, emit: (text: string) => void): void {
    this.buffer += text;

    // Strategy 1: Buffer is too large, flush immediately
    if (this.buffer.length >= this.maxBufferSize) {
      this.flush(emit);
      return;
    }

    // Strategy 2: Set timer if not already set
    if (!this.timer) {
      this.timer = setTimeout(() => {
        this.flush(emit);
      }, this.delayMs);
    }
  }

  flush(emit: (text: string) => void): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.buffer.length > 0) {
      emit(this.buffer);
      this.buffer = "";
    }
  }

  dispose(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.buffer = "";
  }

  get pending(): string {
    return this.buffer;
  }
}
