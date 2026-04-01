import { Logger } from './index.js';

/**
 * Axon plugin for structured logging.
 * Attaches `ctx.log` — a child logger with request ID.
 *
 * @param {any} app - Axon app instance
 * @param {Object} [opts]
 * @param {'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent'} [opts.level]
 * @param {boolean} [opts.pretty]
 * @param {NodeJS.WritableStream} [opts.stdout]
 * @param {NodeJS.WritableStream} [opts.stderr]
 */
export function axonLogger(app, opts = {}) {
  const logger = new Logger(opts);

  app.decorate('log', logger);

  app.addHook('onRequest', async (ctx) => {
    ctx.log = logger.child({ reqId: ctx.id });
  });
}
