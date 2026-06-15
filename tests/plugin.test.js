import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import { axonLogger } from '../src/plugin.js';
import { Logger } from '../src/index.js';

/**
 * Minimal fake Axon app that records decorations and hooks.
 */
function fakeApp() {
  /** @type {Record<string, any>} */
  const decorations = {};
  /** @type {Record<string, Function[]>} */
  const hooks = {};
  return {
    decorations,
    hooks,
    decorate(name, value) {
      decorations[name] = value;
    },
    addHook(name, fn) {
      (hooks[name] ??= []).push(fn);
    },
  };
}

describe('axonLogger plugin', () => {
  it('should decorate the app with a Logger', () => {
    const app = fakeApp();
    axonLogger(app, { level: 'debug', pretty: false });

    assert.ok(app.decorations.log instanceof Logger);
    assert.equal(app.decorations.log.level, 'debug');
  });

  it('should register an onRequest hook', () => {
    const app = fakeApp();
    axonLogger(app);

    assert.equal(app.hooks.onRequest?.length, 1);
  });

  it('should attach a request-scoped child logger with reqId', async () => {
    /** @type {string[]} */
    const lines = [];
    const stream = new Writable({
      write(chunk, _enc, cb) {
        lines.push(chunk.toString());
        cb();
      },
    });

    const app = fakeApp();
    axonLogger(app, { pretty: false, stdout: stream, stderr: stream });

    const ctx = /** @type {any} */ ({ id: 'req-42' });
    await app.hooks.onRequest[0](ctx);

    assert.ok(ctx.log instanceof Logger);
    ctx.log.info('handled');

    const entry = JSON.parse(lines[0]);
    assert.equal(entry.reqId, 'req-42');
    assert.equal(entry.msg, 'handled');
  });

  it('should work with default options', () => {
    const app = fakeApp();
    assert.doesNotThrow(() => axonLogger(app));
    assert.ok(app.decorations.log instanceof Logger);
  });
});
