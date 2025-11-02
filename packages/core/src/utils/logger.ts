export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: Record<string, unknown>;
}

export class Logger {
  constructor(
    private minLevel: LogLevel = LogLevel.INFO,
    private prefix = "[AIPex]",
  ) {}

  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context);
  }

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
  ): void {
    if (level < this.minLevel) {
      return;
    }

    const levelName = LogLevel[level];
    const contextStr = context ? ` ${JSON.stringify(context)}` : "";

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(`${this.prefix} [${levelName}] ${message}${contextStr}`);
        break;
      case LogLevel.INFO:
        console.info(`${this.prefix} [${levelName}] ${message}${contextStr}`);
        break;
      case LogLevel.WARN:
        console.warn(`${this.prefix} [${levelName}] ${message}${contextStr}`);
        break;
      case LogLevel.ERROR:
        console.error(`${this.prefix} [${levelName}] ${message}${contextStr}`);
        break;
    }
  }

  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }
}

export const logger = new Logger();
