/**
 * ANSI color codes and level styling.
 * Colors are only applied when the target stream is a TTY.
 *
 * @param {boolean} enabled - whether to emit ANSI codes
 */
export function createColors(enabled) {
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

/**
 * Level style definitions.
 * @param {ReturnType<typeof createColors>} c
 */
export function createLevelStyles(c) {
  return {
    fatal: { color: c.redBg, symbol: '\u2716', label: 'FTL' }, // ✖
    error: { color: c.red, symbol: '\u2718', label: 'ERR' }, // ✘
    warn: { color: c.yellow, symbol: '\u25B2', label: 'WRN' }, // ▲
    info: { color: c.green, symbol: '\u25CF', label: 'INF' }, // ●
    debug: { color: c.cyan, symbol: '\u25CB', label: 'DBG' }, // ○
    trace: { color: c.magenta, symbol: '\u2508', label: 'TRC' }, // ┈
  };
}

/**
 * Convert an Error into a plain, serializable object.
 * @param {Error} err
 * @returns {Object<string, any>}
 */
export function serializeError(err) {
  /** @type {Object<string, any>} */
  const out = { type: err.name, message: err.message, stack: err.stack };
  // @ts-ignore - cause is standard since ES2022 but optional
  if (err.cause !== undefined) out.cause = err.cause;
  return out;
}

/**
 * `JSON.stringify` that never throws: handles circular references, BigInt,
 * Error instances, and functions. A logger must not crash the app.
 * @param {any} value
 * @returns {string}
 */
export function safeStringify(value) {
  const seen = new WeakSet();
  return JSON.stringify(value, (_key, val) => {
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

/**
 * Format a value for pretty output.
 * @param {any} val
 * @param {ReturnType<typeof createColors>} c
 * @returns {string}
 */
export function formatValue(val, c) {
  if (typeof val === 'string') return `${c.green}${val}${c.reset}`;
  if (typeof val === 'number' || typeof val === 'bigint') return `${c.yellow}${val}${c.reset}`;
  if (typeof val === 'boolean') return `${c.cyan}${val}${c.reset}`;
  if (val === null || val === undefined) return `${c.dim}${val}${c.reset}`;
  if (val instanceof Error) return `${c.red}${val.name}: ${val.message}${c.reset}`;
  return `${c.gray}${safeStringify(val)}${c.reset}`;
}
