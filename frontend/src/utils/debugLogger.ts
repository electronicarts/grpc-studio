// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

/**
 * Debug Logger Utility
 * Provides conditional logging that can be disabled in production
 */

const isDev = (): boolean => {
  try {
    // Vite injects this at build time
    return !!import.meta.env?.DEV;
  } catch {
    return false;
  }
};

const DEBUG_ENABLED = isDev() || 
  (typeof window !== 'undefined' && window.localStorage?.getItem('DEBUG_MODE') === 'true');

interface LoggerOptions {
  prefix?: string;
  enabled?: boolean;
}

class DebugLogger {
  private prefix: string;
  private enabled: boolean;

  constructor(options: LoggerOptions = {}) {
    this.prefix = options.prefix || '';
    this.enabled = options.enabled ?? DEBUG_ENABLED;
  }

  private formatMessage(...args: unknown[]): unknown[] {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    const prefix = this.prefix ? `[${this.prefix}]` : '';
    return [`[${timestamp}]${prefix}`, ...args];
  }

  debug(...args: unknown[]): void {
    if (this.enabled) {
      console.debug(...this.formatMessage(...args));
    }
  }

  info(...args: unknown[]): void {
    if (this.enabled) {
      console.info(...this.formatMessage(...args));
    }
  }

  warn(...args: unknown[]): void {
    if (this.enabled) {
      console.warn(...this.formatMessage(...args));
    }
  }

  error(...args: unknown[]): void {
    console.error(...this.formatMessage(...args));
  }

  group(label: string): void {
    if (this.enabled) {
      console.group(this.prefix ? `[${this.prefix}] ${label}` : label);
    }
  }

  groupEnd(): void {
    if (this.enabled) {
      console.groupEnd();
    }
  }

  /**
   * Create a child logger with an additional prefix
   */
  child(prefix: string): DebugLogger {
    return new DebugLogger({
      prefix: this.prefix ? `${this.prefix}:${prefix}` : prefix,
      enabled: this.enabled
    });
  }

  /**
   * Temporarily enable/disable logging
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

export const createLogger = (prefix?: string): DebugLogger => {
  return new DebugLogger({ prefix });
};

export const formLogger = createLogger('Form');
export const schemaLogger = createLogger('Schema');
export const wsLogger = createLogger('WebSocket');

export default DebugLogger;
