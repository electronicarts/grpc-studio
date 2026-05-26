// Copyright (c) 2026 Electronic Arts Inc. All rights reserved.

import fs from 'fs';

/**
 * Lightweight structured logger.
 *
 * Reads LOG_LEVEL, LOG_FORMAT, LOG_FILE directly from env; no config import,
 * no initialization-order dependency, no circular-dependency risk.
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';
type Meta = Record<string, unknown>;

const LEVELS: Record<LogLevel, number> = { error: 0, warn: 1, info: 2, debug: 3 };

const SENSITIVE_PATTERNS = [
  'password', 'secret', 'token', 'authorization', 'credential',
  'cookie', 'bearer', 'apikey', 'accesskey', 'privatekey',
];

function isSensitive(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[-_]/g, '');
  return SENSITIVE_PATTERNS.some(p => normalized.includes(p));
}

function redact(value: unknown, depth = 0): unknown {
  if (depth > 5 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((item) => redact(item, depth + 1));
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = isSensitive(k) ? '[REDACTED]' : redact(v, depth + 1);
  }
  return out;
}

export interface ChildLogger {
  error(message: string, meta?: Meta): void;
  warn(message: string, meta?: Meta): void;
  info(message: string, meta?: Meta): void;
  debug(message: string, meta?: Meta): void;
  child(context: Meta): ChildLogger;
}

class Logger {
  private currentLevel: number;
  private jsonFormat: boolean;
  private _fileStream: fs.WriteStream | null;

  constructor() {
    const levelName = (process.env.LOG_LEVEL || 'info').toLowerCase() as LogLevel;
    this.currentLevel = LEVELS[levelName] ?? LEVELS.info;
    this.jsonFormat = (process.env.LOG_FORMAT || 'pretty') === 'json';
    const logFile = process.env.LOG_FILE;
    this._fileStream = logFile ? fs.createWriteStream(logFile, { flags: 'a' }) : null;
  }

  _write(level: LogLevel, message: string, meta: Meta): void {
    if (this.currentLevel < LEVELS[level]) return;

    const timestamp = new Date().toISOString();
    const safeMeta = meta && typeof meta === 'object' ? redact(meta) : {};

    let line: string;
    if (this.jsonFormat) {
      line = JSON.stringify({ timestamp, level, pid: process.pid, message, meta: safeMeta });
    } else {
      const metaStr = Object.keys(safeMeta as object).length > 0 ? ` ${JSON.stringify(safeMeta)}` : '';
      line = `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
    }

    const consoleFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    consoleFn(line);
    this._fileStream?.write(line + '\n');
  }

  error(message: string, meta: Meta = {}): void { this._write('error', message, meta); }
  warn(message: string,  meta: Meta = {}): void { this._write('warn',  message, meta); }
  info(message: string,  meta: Meta = {}): void { this._write('info',  message, meta); }
  debug(message: string, meta: Meta = {}): void { this._write('debug', message, meta); }

  child(context: Meta): ChildLogger {
    const write = (level: LogLevel, message: string, meta: Meta) =>
      this._write(level, message, { ...context, ...meta });
    return {
      error: (msg: string, meta: Meta = {}) => write('error', msg, meta),
      warn:  (msg: string, meta: Meta = {}) => write('warn',  msg, meta),
      info:  (msg: string, meta: Meta = {}) => write('info',  msg, meta),
      debug: (msg: string, meta: Meta = {}) => write('debug', msg, meta),
      child: (ctx: Meta): ChildLogger => this.child({ ...context, ...ctx }),
    };
  }
}

const logger = new Logger();
export default logger;
