import { Logger, type LoggerOptions } from './index.js';

/** Minimal shape of an Axon app the plugin relies on. */
export interface AxonApp {
  decorate(name: string, value: unknown): void;
  addHook(name: string, fn: (ctx: AxonContext) => unknown): void;
}

/** Minimal shape of an Axon request context. */
export interface AxonContext {
  id: string;
  log?: Logger;
  [key: string]: unknown;
}

/** Options accepted by the {@link axonLogger} plugin. */
export type AxonLoggerOptions = LoggerOptions;

/**
 * Axon plugin for structured logging.
 *
 * Decorates `app.log` (app-level logger) and attaches `ctx.log` — a child
 * logger carrying the request ID — on every request.
 */
export function axonLogger(app: AxonApp, opts: AxonLoggerOptions = {}): void {
  const logger = new Logger(opts);

  app.decorate('log', logger);

  app.addHook('onRequest', async (ctx: AxonContext) => {
    ctx.log = logger.child({ reqId: ctx.id });
  });
}
