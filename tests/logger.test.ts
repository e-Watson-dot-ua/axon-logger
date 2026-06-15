import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import { Logger, createLogger } from '../src/index.js';

/** Capture stream output into an array of strings. */
function capture(): { stream: Writable; lines: string[] } {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(chunk.toString());
      callback();
    },
  });
  return { stream, lines };
}

describe('Logger — JSON mode', () => {
  it('should output JSON lines', () => {
    const { stream, lines } = capture();
    const log = new Logger({ level: 'trace', pretty: false, stdout: stream, stderr: stream });

    log.info('hello');

    assert.equal(lines.length, 1);
    const entry = JSON.parse(lines[0]);
    assert.equal(entry.level, 'info');
    assert.equal(entry.msg, 'hello');
    assert.ok(entry.time);
  });

  it('should include base fields', () => {
    const { stream, lines } = capture();
    const log = new Logger({
      pretty: false,
      stdout: stream,
      stderr: stream,
      base: { service: 'api' },
    });

    log.info('start');

    const entry = JSON.parse(lines[0]);
    assert.equal(entry.service, 'api');
  });

  it('should include extra fields', () => {
    const { stream, lines } = capture();
    const log = new Logger({ pretty: false, stdout: stream, stderr: stream });

    log.info('request', { method: 'GET', path: '/users' });

    const entry = JSON.parse(lines[0]);
    assert.equal(entry.method, 'GET');
    assert.equal(entry.path, '/users');
  });

  it('should merge base and extra fields', () => {
    const { stream, lines } = capture();
    const log = new Logger({
      pretty: false,
      stdout: stream,
      stderr: stream,
      base: { app: 'test' },
    });

    log.info('req', { code: 200 });

    const entry = JSON.parse(lines[0]);
    assert.equal(entry.app, 'test');
    assert.equal(entry.code, 200);
  });
});

describe('Logger — levels', () => {
  it('should respect log level', () => {
    const { stream, lines } = capture();
    const log = new Logger({ level: 'warn', pretty: false, stdout: stream, stderr: stream });

    log.trace('nope');
    log.debug('nope');
    log.info('nope');
    log.warn('yes');
    log.error('yes');

    assert.equal(lines.length, 2);
    assert.ok(lines[0].includes('"warn"'));
    assert.ok(lines[1].includes('"error"'));
  });

  it('should output nothing in silent mode', () => {
    const { stream, lines } = capture();
    const log = new Logger({ level: 'silent', pretty: false, stdout: stream, stderr: stream });

    log.fatal('nope');
    log.error('nope');
    log.info('nope');

    assert.equal(lines.length, 0);
  });

  it('should output all levels in trace mode', () => {
    const { stream, lines } = capture();
    const log = new Logger({ level: 'trace', pretty: false, stdout: stream, stderr: stream });

    log.trace('t');
    log.debug('d');
    log.info('i');
    log.warn('w');
    log.error('e');
    log.fatal('f');

    assert.equal(lines.length, 6);
  });

  it('should expose current level name', () => {
    const log = new Logger({ level: 'debug' });
    assert.equal(log.level, 'debug');
  });
});

describe('Logger — child', () => {
  it('should inherit level from parent', () => {
    const { stream, lines } = capture();
    const parent = new Logger({ level: 'warn', pretty: false, stdout: stream, stderr: stream });
    const child = parent.child({ reqId: 'abc' });

    child.info('suppressed');
    child.warn('visible');

    assert.equal(lines.length, 1);
    const entry = JSON.parse(lines[0]);
    assert.equal(entry.reqId, 'abc');
    assert.equal(entry.msg, 'visible');
  });

  it('should merge parent and child fields', () => {
    const { stream, lines } = capture();
    const parent = new Logger({
      pretty: false,
      stdout: stream,
      stderr: stream,
      base: { service: 'api' },
    });
    const child = parent.child({ reqId: '123' });

    child.info('test');

    const entry = JSON.parse(lines[0]);
    assert.equal(entry.service, 'api');
    assert.equal(entry.reqId, '123');
  });

  it('should not modify parent base', () => {
    const { stream, lines } = capture();
    const parent = new Logger({
      pretty: false,
      stdout: stream,
      stderr: stream,
      base: { app: 'test' },
    });
    parent.child({ extra: true });

    parent.info('parent');

    const entry = JSON.parse(lines[0]);
    assert.equal(entry.app, 'test');
    assert.equal(entry.extra, undefined);
  });
});

describe('Logger — pretty mode', () => {
  it('should output colored lines with symbols', () => {
    const { stream, lines } = capture();
    const log = new Logger({ level: 'trace', pretty: true, stdout: stream, stderr: stream });

    log.info('server started', { port: 3000 });

    assert.equal(lines.length, 1);
    assert.ok(lines[0].includes('INF'));
    assert.ok(lines[0].includes('server started'));
    assert.ok(lines[0].includes('port'));
    assert.ok(lines[0].includes('3000'));
  });

  it('should include symbols for each level', () => {
    const { stream, lines } = capture();
    const log = new Logger({ level: 'trace', pretty: true, stdout: stream, stderr: stream });

    log.trace('t');
    log.debug('d');
    log.info('i');
    log.warn('w');
    log.error('e');
    log.fatal('f');

    assert.ok(lines[0].includes('TRC'));
    assert.ok(lines[1].includes('DBG'));
    assert.ok(lines[2].includes('INF'));
    assert.ok(lines[3].includes('WRN'));
    assert.ok(lines[4].includes('ERR'));
    assert.ok(lines[5].includes('FTL'));
  });
});

describe('Logger — timers', () => {
  it('should measure elapsed time', async () => {
    const { stream, lines } = capture();
    const log = new Logger({ pretty: false, stdout: stream, stderr: stream });

    log.time('db-query');
    await new Promise((r) => setTimeout(r, 50));
    log.timeEnd('db-query');

    assert.equal(lines.length, 1);
    const entry = JSON.parse(lines[0]);
    assert.equal(entry.msg, 'db-query');
    assert.ok(entry.ms >= 40, `Expected ms >= 40, got ${entry.ms}`);
  });

  it('should do nothing if timer does not exist', () => {
    const { stream, lines } = capture();
    const log = new Logger({ pretty: false, stdout: stream, stderr: stream });

    log.timeEnd('nonexistent');

    assert.equal(lines.length, 0);
  });

  it('should support custom level for timeEnd', () => {
    const { stream, lines } = capture();
    const log = new Logger({ level: 'trace', pretty: false, stdout: stream, stderr: stream });

    log.time('fast');
    log.timeEnd('fast', 'debug');

    const entry = JSON.parse(lines[0]);
    assert.equal(entry.level, 'debug');
  });
});

describe('Logger — output streams', () => {
  it('should write error and fatal to stderr', () => {
    const out = capture();
    const err = capture();
    const log = new Logger({
      level: 'trace',
      pretty: false,
      stdout: out.stream,
      stderr: err.stream,
    });

    log.info('to stdout');
    log.error('to stderr');
    log.fatal('to stderr');

    assert.equal(out.lines.length, 1);
    assert.equal(err.lines.length, 2);
  });

  it('should write trace/debug/info/warn to stdout', () => {
    const out = capture();
    const err = capture();
    const log = new Logger({
      level: 'trace',
      pretty: false,
      stdout: out.stream,
      stderr: err.stream,
    });

    log.trace('t');
    log.debug('d');
    log.info('i');
    log.warn('w');

    assert.equal(out.lines.length, 4);
    assert.equal(err.lines.length, 0);
  });
});

describe('createLogger', () => {
  it('should return a Logger instance', () => {
    const log = createLogger({ level: 'debug' });
    assert.ok(log instanceof Logger);
    assert.equal(log.level, 'debug');
  });
});

describe('Logger — robustness', () => {
  it('should not throw on circular references', () => {
    const { stream, lines } = capture();
    const log = new Logger({ pretty: false, stdout: stream, stderr: stream });

    const a: Record<string, unknown> = { name: 'a' };
    a.self = a;

    assert.doesNotThrow(() => log.info('circular', { a }));
    const entry = JSON.parse(lines[0]);
    assert.equal(entry.a.name, 'a');
    assert.equal(entry.a.self, '[Circular]');
  });

  it('should not throw on BigInt values', () => {
    const { stream, lines } = capture();
    const log = new Logger({ pretty: false, stdout: stream, stderr: stream });

    assert.doesNotThrow(() => log.info('big', { n: 10n }));
    const entry = JSON.parse(lines[0]);
    assert.equal(entry.n, '10n');
  });

  it('should serialize Error objects with message and stack', () => {
    const { stream, lines } = capture();
    const log = new Logger({ pretty: false, stdout: stream, stderr: stream });

    log.error('failed', { err: new Error('boom') });

    const entry = JSON.parse(lines[0]);
    assert.equal(entry.err.type, 'Error');
    assert.equal(entry.err.message, 'boom');
    assert.ok(entry.err.stack.includes('boom'));
  });

  it('should not let base/extra clobber reserved fields', () => {
    const { stream, lines } = capture();
    const log = new Logger({
      pretty: false,
      stdout: stream,
      stderr: stream,
      base: { level: 'HACK', time: 'HACK' },
    });

    log.info('real', { msg: 'HACK' });

    const entry = JSON.parse(lines[0]);
    assert.equal(entry.level, 'info');
    assert.equal(entry.msg, 'real');
    assert.notEqual(entry.time, 'HACK');
  });
});

describe('Logger — level setter', () => {
  it('should change the level at runtime', () => {
    const { stream, lines } = capture();
    const log = new Logger({ level: 'info', pretty: false, stdout: stream, stderr: stream });

    log.debug('hidden');
    log.level = 'debug';
    log.debug('shown');

    assert.equal(lines.length, 1);
    assert.equal(JSON.parse(lines[0]).msg, 'shown');
    assert.equal(log.level, 'debug');
  });

  it('should ignore unknown level names', () => {
    const log = new Logger({ level: 'info' });
    // @ts-expect-error - testing invalid input
    log.level = 'bogus';
    assert.equal(log.level, 'info');
  });
});
