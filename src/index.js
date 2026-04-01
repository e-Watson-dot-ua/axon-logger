import { createColors, createLevelStyles, formatValue } from './colors.js';

/** @type {Record<string, number>} */
const LEVELS = { fatal: 60, error: 50, warn: 40, info: 30, debug: 20, trace: 10, silent: 100 };

/**
 * @typedef {Object} LoggerOptions
 * @property {'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent'} [level]
 * @property {Object<string, any>} [base] - extra fields on every log line
 * @property {boolean} [pretty] - force pretty mode (default: auto-detect TTY)
 * @property {NodeJS.WritableStream} [stdout] - output stream for info and below (default: process.stdout)
 * @property {NodeJS.WritableStream} [stderr] - output stream for error and above (default: process.stderr)
 */

/**
 * Lightweight structured logger.
 *
 * - **TTY mode**: colored human-readable lines with symbols
 * - **Pipe mode**: JSON lines (machine-readable)
 * - **Silent mode**: `level: 'silent'` suppresses all output
 */
export class Logger {
  /** @type {number} */
  #level;
  /** @type {Object<string, any>} */
  #base;
  /** @type {boolean} */
  #pretty;
  /** @type {NodeJS.WritableStream} */
  #stdout;
  /** @type {NodeJS.WritableStream} */
  #stderr;
  /** @type {ReturnType<typeof createColors>} */
  #colors;
  /** @type {ReturnType<typeof createLevelStyles>} */
  #styles;
  /** @type {Map<string, number>} */
  #timers = new Map();

  /**
   * @param {LoggerOptions} [opts]
   */
  constructor(opts = {}) {
    this.#stdout = opts.stdout ?? process.stdout;
    this.#stderr = opts.stderr ?? process.stderr;
    this.#level = LEVELS[opts.level ?? 'info'] ?? 30;
    this.#base = opts.base ?? {};
    this.#pretty = opts.pretty ?? (/** @type {any} */ (this.#stdout).isTTY ?? false);
    this.#colors = createColors(this.#pretty);
    this.#styles = createLevelStyles(this.#colors);
  }

  /**
   * Create a child logger with extra fields.
   * Inherits level, streams, and pretty mode from parent.
   *
   * @param {Object<string, any>} fields
   * @returns {Logger}
   */
  child(fields) {
    const child = new Logger({
      pretty: this.#pretty,
      stdout: this.#stdout,
      stderr: this.#stderr,
    });
    child.#level = this.#level;
    child.#base = { ...this.#base, ...fields };
    return child;
  }

  /** @param {string} msg @param {Object} [extra] */
  fatal(msg, extra) { this.#log('fatal', msg, extra); }
  /** @param {string} msg @param {Object} [extra] */
  error(msg, extra) { this.#log('error', msg, extra); }
  /** @param {string} msg @param {Object} [extra] */
  warn(msg, extra) { this.#log('warn', msg, extra); }
  /** @param {string} msg @param {Object} [extra] */
  info(msg, extra) { this.#log('info', msg, extra); }
  /** @param {string} msg @param {Object} [extra] */
  debug(msg, extra) { this.#log('debug', msg, extra); }
  /** @param {string} msg @param {Object} [extra] */
  trace(msg, extra) { this.#log('trace', msg, extra); }

  /**
   * Start a timer.
   * @param {string} label
   */
  time(label) {
    this.#timers.set(label, performance.now());
  }

  /**
   * End a timer and log the elapsed time at info level.
   * @param {string} label
   * @param {'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace'} [level]
   */
  timeEnd(label, level = 'info') {
    const start = this.#timers.get(label);
    if (start === undefined) return;
    this.#timers.delete(label);
    const ms = (performance.now() - start).toFixed(2);
    this.#log(level, `${label}`, { ms: parseFloat(ms) });
  }

  /** Current log level name. */
  get level() {
    for (const [name, val] of Object.entries(LEVELS)) {
      if (val === this.#level) return name;
    }
    return 'info';
  }

  /**
   * @param {string} level
   * @param {string} msg
   * @param {Object} [extra]
   */
  #log(level, msg, extra) {
    const numLevel = LEVELS[level] ?? 30;
    if (numLevel < this.#level) return;

    const out = numLevel >= LEVELS.error ? this.#stderr : this.#stdout;

    if (this.#pretty) {
      out.write(this.#formatPretty(level, msg, extra));
    } else {
      out.write(this.#formatJson(level, msg, extra));
    }
  }

  /**
   * @param {string} level
   * @param {string} msg
   * @param {Object} [extra]
   * @returns {string}
   */
  #formatPretty(level, msg, extra) {
    const c = this.#colors;
    const style = this.#styles[level] ?? this.#styles.info;
    const ts = new Date().toISOString().slice(11, 23); // HH:mm:ss.SSS

    let line = `${c.dim}${ts}${c.reset} ${style.color}${style.symbol} ${style.label}${c.reset} ${c.bold}${msg}${c.reset}`;

    const fields = { ...this.#base, ...extra };
    const keys = Object.keys(fields);
    if (keys.length > 0) {
      const pairs = keys.map((k) => `${c.dim}${k}${c.reset}${c.gray}=${c.reset}${formatValue(fields[k], c)}`);
      line += ` ${c.gray}\u2502${c.reset} ${pairs.join(' ')}`;
    }

    return line + '\n';
  }

  /**
   * @param {string} level
   * @param {string} msg
   * @param {Object} [extra]
   * @returns {string}
   */
  #formatJson(level, msg, extra) {
    const entry = {
      level,
      time: new Date().toISOString(),
      ...this.#base,
      msg,
      ...extra,
    };
    return JSON.stringify(entry) + '\n';
  }
}

/**
 * Factory — create a new Logger instance.
 * @param {LoggerOptions} [opts]
 * @returns {Logger}
 */
export function createLogger(opts) {
  return new Logger(opts);
}
