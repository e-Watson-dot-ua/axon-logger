import type { Level } from './index';

/** ANSI color/style codes (empty strings when colors are disabled). */
export interface Colors {
  reset: string;
  dim: string;
  bold: string;
  red: string;
  redBg: string;
  yellow: string;
  green: string;
  cyan: string;
  magenta: string;
  gray: string;
  white: string;
}

/**
 * ANSI color codes and level styling.
 * Colors are only applied when the target stream is a TTY.
 *
 * @param enabled - whether to emit ANSI codes
 */
export function createColors(enabled: boolean): Colors {
  const e = enabled;
  return {
    reset: e ? '\x1b[0m' : '',
    dim: e ? '\x1b[2m' : '',
    bold: e ? '\x1b[1m' : '',
    red: e ? '\x1b[31m' : '',
    redBg: e ? '\x1b[41m\x1b[97m' : '',
    yellow: e ? '\x1b[33m' : '',
    green: e ? '\x1b[32m' : '',
    cyan: e ? '\x1b[36m' : '',
    magenta: e ? '\x1b[35m' : '',
    gray: e ? '\x1b[90m' : '',
    white: e ? '\x1b[37m' : '',
  };
}

/** Visual styling for a single log level. */
export interface LevelStyle {
  color: string;
  symbol: string;
  label: string;
}

/** Level style definitions. */
export function createLevelStyles(c: Colors): Record<Level, LevelStyle> {
  return {
    fatal: { color: c.redBg, symbol: '✖', label: 'FTL' }, // ✖
    error: { color: c.red, symbol: '✘', label: 'ERR' }, // ✘
    warn: { color: c.yellow, symbol: '▲', label: 'WRN' }, // ▲
    info: { color: c.green, symbol: '●', label: 'INF' }, // ●
    debug: { color: c.cyan, symbol: '○', label: 'DBG' }, // ○
    trace: { color: c.magenta, symbol: '┈', label: 'TRC' }, // ┈
  };
}

/** A plain, serializable representation of an Error. */
export interface SerializedError {
  type: string;
  message: string;
  stack?: string;
  cause?: unknown;
}

/** Convert an Error into a plain, serializable object. */
export function serializeError(err: Error): SerializedError {
  const out: SerializedError = { type: err.name, message: err.message, stack: err.stack };
  const cause = (err as { cause?: unknown }).cause;
  if (cause !== undefined) out.cause = cause;
  return out;
}

/**
 * `JSON.stringify` that never throws: handles circular references, BigInt,
 * Error instances, and functions. A logger must not crash the app.
 */
export function safeStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  return JSON.stringify(value, (_key, val: unknown) => {
    if (typeof val === 'bigint') return `${val}n`;
    if (typeof val === 'function') return `[Function: ${val.name || 'anonymous'}]`;
    if (val instanceof Error) return serializeError(val);
    if (typeof val === 'object' && val !== null) {
      if (seen.has(val)) return '[Circular]';
      seen.add(val);
    }
    return val;
  });
}

/** Format a value for pretty output. */
export function formatValue(val: unknown, c: Colors): string {
  if (typeof val === 'string') return `${c.green}${val}${c.reset}`;
  if (typeof val === 'number' || typeof val === 'bigint') return `${c.yellow}${val}${c.reset}`;
  if (typeof val === 'boolean') return `${c.cyan}${val}${c.reset}`;
  if (val === null || val === undefined) return `${c.dim}${val}${c.reset}`;
  if (val instanceof Error) return `${c.red}${val.name}: ${val.message}${c.reset}`;
  return `${c.gray}${safeStringify(val)}${c.reset}`;
}
