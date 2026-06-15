import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import { axonLogger, type AxonApp, type AxonContext } from '../src/plugin.js';
import { Logger } from '../src/index.js';

interface FakeApp extends AxonApp {
  decorations: Record<string, unknown>;
  hooks: Record<string, ((ctx: AxonContext) => unknown)[]>;
}

/** Minimal fake Axon app that records decorations and hooks. */
function fakeApp(): FakeApp {
  const decorations: Record<string, unknown> = {};
  const hooks: Record<string, ((ctx: AxonContext) => unknown)[]> = {};
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
    assert.equal((app.decorations.log as Logger).level, 'debug');
  });

  it('should register an onRequest hook', () => {
    const app = fakeApp();
    axonLogger(app);

    assert.equal(app.hooks.onRequest?.length, 1);
  });

  it('should attach a request-scoped child logger with reqId', async () => {
    const lines: string[] = [];
    const stream = new Writable({
      write(chunk, _enc, cb) {
        lines.push(chunk.toString());
        cb();
      },
    });

    const app = fakeApp();
    axonLogger(app, { pretty: false, stdout: stream, stderr: stream });

    const ctx: AxonContext = { id: 'req-42' };
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
