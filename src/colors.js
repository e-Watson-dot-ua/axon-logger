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
    fatal: { color: c.redBg, symbol: '\u2716', label: 'FTL' },   // ✖
    error: { color: c.red, symbol: '\u2718', label: 'ERR' },      // ✘
    warn:  { color: c.yellow, symbol: '\u25B2', label: 'WRN' },   // ▲
    info:  { color: c.green, symbol: '\u25CF', label: 'INF' },    // ●
    debug: { color: c.cyan, symbol: '\u25CB', label: 'DBG' },     // ○
    trace: { color: c.magenta, symbol: '\u2508', label: 'TRC' },  // ┈
  };
}

/**
 * Format a value for pretty output.
 * @param {any} val
 * @param {ReturnType<typeof createColors>} c
 * @returns {string}
 */
export function formatValue(val, c) {
  if (typeof val === 'string') return `${c.green}${val}${c.reset}`;
  if (typeof val === 'number') return `${c.yellow}${val}${c.reset}`;
  if (typeof val === 'boolean') return `${c.cyan}${val}${c.reset}`;
  if (val === null || val === undefined) return `${c.dim}${val}${c.reset}`;
  return `${c.gray}${JSON.stringify(val)}${c.reset}`;
}
