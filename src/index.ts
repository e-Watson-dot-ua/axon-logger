import {
  createColors,
  createLevelStyles,
  formatValue,
  safeStringify,
  type Colors,
  type LevelStyle,
} from './colors.js';

/** Log levels that produce output, from most to least severe. */
export type Level = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

/** Any configurable level, including `silent` (suppresses all output). */
export type LevelOrSilent = Level | 'silent';

/** Structured fields attached to a log entry. */
export type LogFields = Record<string, unknown>;

const LEVELS: Record<LevelOrSilent, number> = {
  fatal: 60,
  error: 50,
  warn: 40,
  info: 30,
  debug: 20,
  trace: 10,
  silent: 100,
};

export interface LoggerOptions {
  /** Minimum level to emit (default: `'info'`). */
  level?: LevelOrSilent;
  /** Extra fields included on every log line. */
  base?: LogFields;
  /** Force pretty mode (default: auto-detect TTY). */
  pretty?: boolean;
  /** Output stream for info and below (default: `process.stdout`). */
  stdout?: NodeJS.WritableStream;
  /** Output stream for error and above (default: `process.stderr`). */
  stderr?: NodeJS.WritableStream;
}

/**
 * Lightweight structured logger.
 *
 * - **TTY mode**: colored human-readable lines with symbols
 * - **Pipe mode**: JSON lines (machine-readable)
 * - **Silent mode**: `level: 'silent'` suppresses all output
 */
export class Logger {
  #level: number;
  #base: LogFields;
  #pretty: boolean;
  #stdout: NodeJS.WritableStream;
  #stderr: NodeJS.WritableStream;
  #colors: Colors;
  #styles: Record<Level, LevelStyle>;
  #timers = new Map<string, number>();

  constructor(opts: LoggerOptions = {}) {
    this.#stdout = opts.stdout ?? process.stdout;
    this.#stderr = opts.stderr ?? process.stderr;
    this.#level = LEVELS[opts.level ?? 'info'] ?? 30;
    this.#base = opts.base ?? {};
    this.#pretty = opts.pretty ?? (this.#stdout as { isTTY?: boolean }).isTTY ?? false;
    // Honor the NO_COLOR convention (https://no-color.org): keep the pretty
    // layout but drop ANSI codes when NO_COLOR is set to a non-empty value.
    const color = this.#pretty && !process.env.NO_COLOR;
    this.#colors = createColors(color);
    this.#styles = createLevelStyles(this.#colors);
  }

  /**
   * Create a child logger with extra fields.
   * Inherits level, streams, and pretty mode from parent.
   */
  child(fields: LogFields): Logger {
    const child = new Logger({
      pretty: this.#pretty,
      stdout: this.#stdout,
      stderr: this.#stderr,
    });
    child.#level = this.#level;
    child.#base = { ...this.#base, ...fields };
    return child;
  }

  fatal(msg: string, extra?: LogFields): void {
    this.#log('fatal', msg, extra);
  }

  error(msg: string, extra?: LogFields): void {
    this.#log('error', msg, extra);
  }

  warn(msg: string, extra?: LogFields): void {
    this.#log('warn', msg, extra);
  }

  info(msg: string, extra?: LogFields): void {
    this.#log('info', msg, extra);
  }

  debug(msg: string, extra?: LogFields): void {
    this.#log('debug', msg, extra);
  }

  trace(msg: string, extra?: LogFields): void {
    this.#log('trace', msg, extra);
  }

  /** Start a timer. */
  time(label: string): void {
    this.#timers.set(label, performance.now());
  }

  /** End a timer and log the elapsed time (default: info level). */
  timeEnd(label: string, level: Level = 'info'): void {
    const start = this.#timers.get(label);
    if (start === undefined) return;
    this.#timers.delete(label);
    const ms = (performance.now() - start).toFixed(2);
    this.#log(level, label, { ms: parseFloat(ms) });
  }

  /** Current log level name. */
  get level(): LevelOrSilent {
    for (const [name, val] of Object.entries(LEVELS) as [LevelOrSilent, number][]) {
      if (val === this.#level) return name;
    }
    return 'info';
  }

  /** Change the log level at runtime. Unknown names are ignored. */
  set level(name: LevelOrSilent) {
    if (name in LEVELS) this.#level = LEVELS[name];
  }

  #log(level: Level, msg: string, extra?: LogFields): void {
    const numLevel = LEVELS[level];
    if (numLevel < this.#level) return;

    const out = numLevel >= LEVELS.error ? this.#stderr : this.#stdout;

    if (this.#pretty) {
      out.write(this.#formatPretty(level, msg, extra));
    } else {
      out.write(this.#formatJson(level, msg, extra));
    }
  }

  #formatPretty(level: Level, msg: string, extra?: LogFields): string {
    const c = this.#colors;
    const style = this.#styles[level];
    const ts = new Date().toISOString().slice(11, 23); // HH:mm:ss.SSS

    let line = `${c.dim}${ts}${c.reset} ${style.color}${style.symbol} ${style.label}${c.reset} ${c.bold}${msg}${c.reset}`;

    const fields: LogFields = { ...this.#base, ...extra };
    const keys = Object.keys(fields);
    if (keys.length > 0) {
      const pairs = keys.map(
        (k) => `${c.dim}${k}${c.reset}${c.gray}=${c.reset}${formatValue(fields[k], c)}`,
      );
      line += ` ${c.gray}│${c.reset} ${pairs.join(' ')}`;
    }

    return line + '\n';
  }

  #formatJson(level: Level, msg: string, extra?: LogFields): string {
    const fields: LogFields = { ...this.#base, ...extra };
    // Reserved keys are authoritative — never let base/extra clobber them.
    delete fields.level;
    delete fields.time;
    delete fields.msg;
    const entry = { level, time: new Date().toISOString(), msg, ...fields };
    return safeStringify(entry) + '\n';
  }
}

/** Factory — create a new Logger instance. */
export function createLogger(opts?: LoggerOptions): Logger {
  return new Logger(opts);
}
